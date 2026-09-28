// Pure decisions behind the unsaved-changes guard in router.ts. No React or DOM access here.

export interface LinkClick {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  href: string | null;
  target: string | null;
  download: boolean;
}

// True for a plain same-tab click on an in-app route link that would change the page.
export function shouldGuardLinkClick(click: LinkClick, currentHash: string): boolean {
  if (click.defaultPrevented || click.button !== 0) return false;
  if (click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return false;
  if (!click.href || !click.href.startsWith('#/')) return false;
  if (click.target && click.target !== '_self') return false;
  if (click.download) return false;
  return click.href !== currentHash;
}

export interface HashChange {
  guardActive: boolean;
  bypass: boolean;
  expectRevert: boolean;
  currentIdx: number;
  newIdx: unknown;
}

export type HashChangePlan =
  | { type: 'accept' }
  | { type: 'ignore-revert' }
  | { type: 'block-traverse'; delta: number }
  | { type: 'block-push' };

export function planHashChange(change: HashChange): HashChangePlan {
  if (change.expectRevert) return { type: 'ignore-revert' };
  if (change.bypass || !change.guardActive) return { type: 'accept' };
  // Back/Forward lands on an entry that already carries its position in history.
  if (typeof change.newIdx === 'number' && change.newIdx !== change.currentIdx) {
    return { type: 'block-traverse', delta: change.newIdx - change.currentIdx };
  }
  // A new entry (for example an address typed by hand).
  return { type: 'block-push' };
}

// A file dragged anywhere outside a drop zone must not make the browser open it and leave the app.
export function shouldBlockFileDrop(drag: { defaultPrevented: boolean; types: readonly string[] }): boolean {
  return !drag.defaultPrevented && drag.types.includes('Files');
}
