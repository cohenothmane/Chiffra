import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractRawText } from "../../src/ocr/extract.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe("extractRawText", () => {
  it("renvoie une erreur propre pour un fichier inexistant, sans planter", async () => {
    const result = await extractRawText(path.join(dirname, "does-not-exist.pdf"), "pdf");

    expect(result.text).toBeNull();
    expect(result.error).not.toBeNull();
    expect(typeof result.error).toBe("string");
    expect(result.method).toBe("pdf-text");
  });

  it("renvoie une erreur claire pour un type de fichier non supporte", async () => {
    const result = await extractRawText(path.join(dirname, "does-not-exist.docx"), "docx");

    expect(result.text).toBeNull();
    expect(result.error).not.toBeNull();
  });
});
