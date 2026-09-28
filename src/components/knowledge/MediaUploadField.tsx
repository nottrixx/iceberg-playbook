import { useState, useRef, useId, type DragEvent, type ChangeEvent } from 'react';
import { FileText } from 'lucide-react';
import { buildMediaUrl, parseMediaMetadata, validateMediaFile, type MediaType } from './mediaUtils';
import { safeMediaUrl } from '../../guideTemplate';

export interface MediaUploadFieldProps {
  type: MediaType;
  accept: string;
  acceptedFormatsText: string;
  dropText: string;
  buttonText: string;
  value?: string;
  initialValue?: string;
  onChange: (url: string, file: File | null) => void;
  showPreviewImage?: boolean;
}

export function MediaUploadField({
  type,
  accept,
  acceptedFormatsText,
  dropText,
  buttonText,
  value,
  initialValue,
  onChange,
  showPreviewImage = false,
}: MediaUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleSelectFile = (file: File) => {
    const fileError = validateMediaFile(type, file);
    setError(fileError || '');
    if (fileError) return;
    onChange(buildMediaUrl(URL.createObjectURL(file), { name: file.name, size: file.size }), file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSelectFile(file);
    }
  };

  const handleReplace = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const handleRemove = () => {
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onChange('', null);
  };

  const handleUndoRemove = () => {
    if (initialValue) {
      setError('');
      onChange(initialValue, null);
    }
  };

  const hasSelectedMedia = Boolean(value && value.trim());
  const isRemoved = Boolean(!hasSelectedMedia && initialValue && initialValue.trim());
  const isReplaced = Boolean(hasSelectedMedia && initialValue && value !== initialValue);

  // Name and size are read only from the URL, so the editor and the published Guide always agree.
  const { name: displayName, formattedSize: displaySize } = parseMediaMetadata(value, type);

  const replaceButtonText = type === 'video' ? 'Replace Video' : type === 'pdf' ? 'Replace PDF' : 'Replace';
  const removeButtonText = type === 'video' ? 'Remove Video' : type === 'pdf' ? 'Remove PDF' : 'Remove';
  const safeSrc = safeMediaUrl(value);

  return (
    <div className="media-upload-container">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label={buttonText}
      />

      {hasSelectedMedia ? (
        <div className={`media-selected-card ${type === 'video' ? 'media-video-card' : ''}`}>
          {type === 'video' && safeSrc && (
            <div className="media-preview-video-container">
              <video
                className="media-preview-video"
                controls
                preload="metadata"
                src={safeSrc}
              />
            </div>
          )}

          <div className="media-file-info-row">
            {type === 'pdf' && (
              <div className="media-file-icon">
                <FileText size={20} aria-hidden="true" />
              </div>
            )}

            {(type === 'image' || showPreviewImage) && safeSrc && (
              <div className="media-preview-thumb">
                <img src={safeSrc} alt={displayName || 'Screenshot preview'} />
              </div>
            )}

            <div className="media-file-info">
              <div className="media-file-name-container">
                <span className="media-file-name">{displayName}</span>
                {isReplaced && <span className="media-badge-status">Replacement pending</span>}
              </div>
              {displaySize && <span className="media-file-size helper-text">{displaySize}</span>}
            </div>

            <div className="media-file-actions">
              {type === 'pdf' && safeSrc && (
                <a
                  className="btn-secondary media-action-btn"
                  href={safeSrc}
                  target="_blank"
                  rel="noreferrer"
                  download={displayName}
                >
                  View PDF
                </a>
              )}
              <button
                type="button"
                className="btn-secondary media-action-btn"
                onClick={handleReplace}
              >
                {replaceButtonText}
              </button>
              <button
                type="button"
                className="btn-secondary media-action-btn"
                onClick={handleRemove}
              >
                {removeButtonText}
              </button>
            </div>
          </div>
        </div>
      ) : isRemoved ? (
        <div className="media-upload-area media-removed-area">
          <div className="media-removed-row">
            <span className="media-removed-text">
              {type === 'video' ? 'No video attached' : type === 'pdf' ? 'No PDF attached' : 'No screenshot attached'}
            </span>
            <div className="media-removed-actions">
              <button
                type="button"
                className="btn-secondary media-choose-btn"
                onClick={() => inputRef.current?.click()}
              >
                {buttonText}
              </button>
              {initialValue && (
                <button
                  type="button"
                  className="btn-secondary media-action-btn"
                  onClick={handleUndoRemove}
                >
                  Undo Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`media-upload-area ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="media-upload-content">
            <span className="media-drop-text">{dropText}</span>
            <span className="media-or-divider">or</span>
            <button
              type="button"
              className="btn-secondary media-choose-btn"
              onClick={() => inputRef.current?.click()}
            >
              {buttonText}
            </button>
          </div>
          <p className="helper-text media-format-text">{acceptedFormatsText}</p>
        </div>
      )}
      {/* Outside the branches so a rejected file is reported while empty, while replacing and after removing. */}
      {error && <p className="knowledge-error media-inline-error" role="alert">{error}</p>}
    </div>
  );
}
