import { useState, useCallback } from "react";
import type { DocumentAttachment } from "../../types/domain";
import { formatBytes } from "../../lib/utils";

interface DocumentUploaderProps {
  /** Текущий загруженный документ (если есть). */
  document?: DocumentAttachment;
  /** Вызывается при успешной загрузке файла. */
  onUpload: (doc: DocumentAttachment) => void;
  /** Вызывается при удалении файла. */
  onRemove?: () => void;
  /** Ошибка валидации, если есть. */
  error?: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Область загрузки PDF с поддержкой drag & drop (docs/prototype2.md §7, п. 159).
 * Проверяет MIME-тип и размер. Не реализует загрузку на сервер.
 */
export function DocumentUploader({ document, onUpload, onRemove, error }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf" && file.type !== "application/pdf+pdfa") {
      if (file.type !== "application/pdf") {
        return `Файл «${file.name}» не является PDF. Поддерживаются только PDF-файлы.`;
      }
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return `Файл «${file.name}» имеет неподдерживаемое расширение.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Размер файла (${formatBytes(file.size)}) превышает лимит (${MAX_FILE_SIZE_MB} МБ).`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      setLocalError(null);

      const doc: DocumentAttachment = {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString().slice(0, 10),
      };
      onUpload(doc);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  if (document) {
    return (
      <div className="upload-result">
        <div className="upload-result__info">
          <div className="upload-result__icon">📄</div>
          <div>
            <strong>{document.name}</strong>
            <div className="card__meta">
              {document.mimeType} · {formatBytes(document.size)}
              {document.pageCount ? ` · ${document.pageCount} стр.` : ""}
            </div>
          </div>
        </div>
        {error || localError ? (
          <div className="error" style={{ marginTop: "var(--space-2)" }}>
            {error || localError}
          </div>
        ) : null}
        {onRemove ? (
          <button type="button" className="btn btn--sm" onClick={onRemove}>
            Заменить файл
          </button>
        ) : null}
      </div>
    );
  }

  const message = error || localError;

  return (
    <div
      className={`upload-zone ${isDragging ? "upload-zone--drag" : ""} ${message ? "upload-zone--error" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        id="file-upload"
        accept="application/pdf"
        onChange={(event) => handleFiles(event.target.files)}
        style={{ display: "none" }}
        aria-describedby={message ? "file-upload-error" : undefined}
      />
      <label htmlFor="file-upload" className="upload-zone__content">
        <div className="upload-zone__icon">📎</div>
        <span className="upload-zone__text">
          Перетащите PDF-файл сюда или нажмите для выбора
        </span>
        <span className="upload-zone__hint">Максимум {MAX_FILE_SIZE_MB} МБ, формат PDF</span>
      </label>
      {message ? (
        <div id="file-upload-error" className="error small">
          {message}
        </div>
      ) : null}
    </div>
  );
}
