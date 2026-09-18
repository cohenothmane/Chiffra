import { useRef, useState } from "react";
import type { DragEvent } from "react";
import styles from "./UploadZone.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${Math.round(bytes / 1024)} Ko`;
}

function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.dropzone}
        data-active={isDragActive}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <span className={styles.title}>Glisser-déposer des documents ici</span>
        <span className={styles.hint}>ou cliquer pour parcourir</span>
        <span className={styles.formats}>pdf · jpg · png</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file, i) => (
            <div className={styles.fileRow} key={`${file.name}-${i}`}>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadZone;
