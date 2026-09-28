// Ephemeral in-memory store for frontend mock media in current session
const sessionMediaMap = new Map<string, { video?: string; pdf?: string; screenshots?: Record<number, string> }>();

export function setGuideSessionMedia(guideId: string, media: { video?: string; pdf?: string; screenshots?: Record<number, string> }) {
  sessionMediaMap.set(guideId, media);
}

export function getGuideSessionMedia(guideId: string) {
  return sessionMediaMap.get(guideId);
}

export type MediaType = 'video' | 'pdf' | 'image';

export interface FileMetadata {
  name: string;
  size?: number;
}

// A file is accepted only when both its extension and its MIME type are listed.
export const MEDIA_RULES: Record<MediaType, { extensions: string[]; mimeTypes: string[]; formats: string }> = {
  video: { extensions: ['.mp4', '.webm', '.mov'], mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'], formats: 'Accepted formats: MP4, WebM, MOV' },
  pdf: { extensions: ['.pdf'], mimeTypes: ['application/pdf'], formats: 'Accepted format: PDF' },
  image: { extensions: ['.png', '.jpg', '.jpeg', '.webp'], mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], formats: 'Accepted formats: PNG, JPG, WebP' },
};

// Returns an error message for a rejected file, or undefined when the file is accepted.
export function validateMediaFile(type: MediaType, file: { name: string; type: string }): string | undefined {
  const rule = MEDIA_RULES[type];
  const dot = file.name.lastIndexOf('.');
  const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  const mime = file.type.toLowerCase();
  if (rule.extensions.includes(ext) && rule.mimeTypes.includes(mime)) return undefined;
  return `${file.name} is not a supported file. ${rule.formats}`;
}

// Builds the URL stored for a selected file; name and size travel in the hash and are read back by readMediaFile.
export function buildMediaUrl(objectUrl: string, meta: FileMetadata): string {
  const params = new URLSearchParams({ name: meta.name });
  if (meta.size !== undefined) params.set('size', String(meta.size));
  return `${objectUrl}#${params.toString()}`;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toSize(value: string | null): number | undefined {
  if (value === null || !value.trim()) return undefined;
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 ? size : undefined;
}

// The only place that reads a file name and size from a media URL.
// Supports `#name=…&size=…`, the older `#file.pdf` hash, `?name=`/`?size=` and the last path segment.
export function readMediaFile(url?: string): { name?: string; size?: number } {
  if (!url || !url.trim()) return {};
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { name: url };
  }

  let name = '';
  let size: number | undefined;
  const hash = parsed.hash.slice(1);
  if (hash.includes('=')) {
    // Parse the raw hash: decoding it first would turn an encoded "&" in the name into a separator.
    const params = new URLSearchParams(hash);
    name = params.get('name') || '';
    size = toSize(params.get('size'));
  } else if (hash) {
    name = safeDecode(hash);
  }
  if (!name) name = parsed.searchParams.get('name') || '';
  if (size === undefined) size = toSize(parsed.searchParams.get('size'));
  if (!name) name = safeDecode(parsed.pathname.split('/').pop() || '');
  return { name: name || undefined, size };
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function parseMediaMetadata(url?: string, type?: MediaType): { name: string; size?: number; formattedSize: string } {
  if (!url || !url.trim()) return { name: '', size: undefined, formattedSize: '' };

  const read = readMediaFile(url);
  const name = read.name || '';
  let size = read.size;

  if (size === undefined && name) {
    if (type === 'video' || /\.(mp4|webm|mov)$/i.test(name)) size = 34.2 * 1024 * 1024;
    else if (type === 'pdf' || /\.pdf$/i.test(name)) size = 2.8 * 1024 * 1024;
    else if (type === 'image' || /\.(png|jpe?g|webp)$/i.test(name)) size = 420 * 1024;
  }

  const finalName = name || (type === 'video' ? 'tutorial.mp4' : type === 'pdf' ? 'guide.pdf' : 'screenshot.png');
  return {
    name: finalName,
    size,
    formattedSize: formatFileSize(size)
  };
}
