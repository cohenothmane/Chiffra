import { readFile } from "node:fs/promises";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdf as convertPdfToImages } from "pdf-to-img";
import * as XLSX from "xlsx";

export type ExtractMethod = "pdf-text" | "ocr" | "excel";

export interface ExtractResult {
  text: string | null;
  method: ExtractMethod;
  confidence: number | null;
  error: string | null;
}

const MIN_PDF_TEXT_LENGTH = 20;
const MIN_OCR_CONFIDENCE = 30;
const OCR_LANGS = "fra+eng";

export async function extractRawText(filePath: string, fileType: string): Promise<ExtractResult> {
  const type = normalizeFileType(fileType);
  const method = methodForType(type);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch (err) {
    return { text: null, method, confidence: null, error: `Fichier illisible: ${errorMessage(err)}` };
  }

  try {
    switch (type) {
      case "pdf":
        return await extractFromPdf(fileBuffer);
      case "jpg":
      case "jpeg":
      case "png":
        return await extractFromImage(fileBuffer);
      case "xlsx":
      case "xls":
        return extractFromExcel(fileBuffer);
      default:
        return { text: null, method, confidence: null, error: `Type de fichier non supporte: ${fileType}` };
    }
  } catch (err) {
    return { text: null, method, confidence: null, error: errorMessage(err) };
  }
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractResult> {
  let nativeText = "";
  try {
    nativeText = (await extractPdfTextLayer(buffer)).trim();
  } catch {
    nativeText = "";
  }

  if (nativeText.length >= MIN_PDF_TEXT_LENGTH) {
    return { text: nativeText, method: "pdf-text", confidence: null, error: null };
  }

  let firstPageImage: Buffer;
  try {
    const document = await convertPdfToImages(buffer, { scale: 2 });
    firstPageImage = await document.getPage(1);
  } catch (err) {
    return {
      text: null,
      method: "ocr",
      confidence: null,
      error: `Echec de la conversion du PDF en image pour l'OCR: ${errorMessage(err)}`,
    };
  }

  return runOcr(firstPageImage);
}

// pdf-parse embarque une version ancienne de pdfjs-dist dont le mode
// "fake worker" (disableWorker) conserve un etat global entre documents :
// des appels sequentiels sur des PDF differents renvoient le texte du
// premier document traite. pdfjs-dist est appele ici directement, avec un
// document charge et detruit a chaque appel, pour garantir l'isolation.
async function extractPdfTextLayer(buffer: Buffer): Promise<string> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  try {
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      pageTexts.push(joinTextItemsByLine(content.items));
    }
    return pageTexts.join("\n\n");
  } finally {
    await doc.destroy();
  }
}

function joinTextItemsByLine(items: unknown[]): string {
  let text = "";
  let lastY: number | null = null;
  for (const item of items) {
    if (typeof item !== "object" || item === null || !("str" in item) || typeof item.str !== "string") {
      continue;
    }
    const transform = "transform" in item && Array.isArray(item.transform) ? item.transform : null;
    const y = typeof transform?.[5] === "number" ? transform[5] : null;
    if (lastY === null || y === lastY) {
      text += item.str;
    } else {
      text += "\n" + item.str;
    }
    lastY = y;
  }
  return text;
}

async function extractFromImage(buffer: Buffer): Promise<ExtractResult> {
  const preprocessed = await sharp(buffer).grayscale().normalize().toBuffer();
  return runOcr(preprocessed);
}

async function runOcr(imageBuffer: Buffer): Promise<ExtractResult> {
  let text: string;
  let confidence: number;
  try {
    const { data } = await Tesseract.recognize(imageBuffer, OCR_LANGS);
    text = data.text.trim();
    confidence = data.confidence;
  } catch (err) {
    return { text: null, method: "ocr", confidence: null, error: `Echec OCR: ${errorMessage(err)}` };
  }

  if (!text || confidence < MIN_OCR_CONFIDENCE) {
    return {
      text: null,
      method: "ocr",
      confidence,
      error: `OCR peu fiable (confiance ${confidence.toFixed(1)}%, texte ${text ? "non vide" : "vide"})`,
    };
  }

  return { text, method: "ocr", confidence, error: null };
}

function extractFromExcel(buffer: Buffer): ExtractResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { text: null, method: "excel", confidence: null, error: "Le fichier Excel ne contient aucune feuille" };
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return { text: null, method: "excel", confidence: null, error: "Feuille Excel introuvable" };
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return { text: JSON.stringify(rows), method: "excel", confidence: null, error: null };
}

function normalizeFileType(fileType: string): string {
  const trimmed = fileType.trim().toLowerCase();
  const afterSlash = trimmed.includes("/") ? (trimmed.split("/").pop() ?? trimmed) : trimmed;
  return afterSlash.replace(/^\./, "");
}

function methodForType(type: string): ExtractMethod {
  if (type === "xlsx" || type === "xls") return "excel";
  if (type === "pdf") return "pdf-text";
  return "ocr";
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
