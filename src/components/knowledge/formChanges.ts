// Decides whether leaving a form would lose anything the user typed.
// Whitespace-only edits and blank rows (an empty step, symptom or attachment) hold nothing, so they do not count.

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && Object.values(value as object).every(isEmpty));

export function normalizeForCompare(value: unknown): unknown {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(normalizeForCompare).filter(item => !isEmpty(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, normalizeForCompare(v)]));
  }
  return value;
}

export function hasUnsavedChanges(initial: unknown, current: unknown): boolean {
  return JSON.stringify(normalizeForCompare(initial)) !== JSON.stringify(normalizeForCompare(current));
}

// Editing a Guide: content changes (already computed by the editor) or a typed change note.
export function guideEditDirty(hasContentChanges: boolean, changeNote: string): boolean {
  return hasContentChanges || changeNote.trim() !== '';
}
