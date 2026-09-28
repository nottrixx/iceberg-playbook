import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './helpers/transpile.mjs';

const { shouldGuardLinkClick, planHashChange, shouldBlockFileDrop } = await importTs('src/navigationGuard.ts', 'navigation-guard');

const click = overrides => ({
  button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
  defaultPrevented: false, href: '#/playbooks', target: null, download: false, ...overrides,
});

test('a plain click on an in-app route link is guarded', () => {
  assert.equal(shouldGuardLinkClick(click(), '#/create/issue'), true);
  assert.equal(shouldGuardLinkClick(click({ href: '#/' }), '#/create/issue'), true);
  assert.equal(shouldGuardLinkClick(click({ target: '_self' }), '#/create/issue'), true);
});

test('clicks that open a new tab or window are not guarded', () => {
  for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
    assert.equal(shouldGuardLinkClick(click({ [key]: true }), '#/create/issue'), false, key);
  }
  assert.equal(shouldGuardLinkClick(click({ button: 1 }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ button: 2 }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ target: '_blank' }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ download: true }), '#/create/issue'), false);
});

test('links that do not change the route are not guarded', () => {
  assert.equal(shouldGuardLinkClick(click({ href: '#main-content' }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ href: 'https://example.com' }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ href: null }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ href: '#/create/issue' }), '#/create/issue'), false);
  assert.equal(shouldGuardLinkClick(click({ defaultPrevented: true }), '#/create/issue'), false);
});

const change = overrides => ({ guardActive: true, bypass: false, expectRevert: false, currentIdx: 5, newIdx: 4, ...overrides });

test('hash changes are accepted without unsaved changes or after confirmation', () => {
  assert.deepEqual(planHashChange(change({ guardActive: false })), { type: 'accept' });
  assert.deepEqual(planHashChange(change({ bypass: true })), { type: 'accept' });
  assert.deepEqual(planHashChange(change({ guardActive: false, newIdx: undefined })), { type: 'accept' });
});

test('the hash change caused by undoing a blocked move is ignored', () => {
  assert.deepEqual(planHashChange(change({ expectRevert: true })), { type: 'ignore-revert' });
});

test('Back and Forward are blocked with the distance to undo', () => {
  assert.deepEqual(planHashChange(change({ newIdx: 4 })), { type: 'block-traverse', delta: -1 });
  assert.deepEqual(planHashChange(change({ newIdx: 6 })), { type: 'block-traverse', delta: 1 });
  assert.deepEqual(planHashChange(change({ newIdx: 3 })), { type: 'block-traverse', delta: -2 });
});

test('a new history entry without a position is blocked as a push', () => {
  assert.deepEqual(planHashChange(change({ newIdx: undefined })), { type: 'block-push' });
  assert.deepEqual(planHashChange(change({ newIdx: 5 })), { type: 'block-push' });
});

test('file drags outside a drop zone are blocked', () => {
  assert.equal(shouldBlockFileDrop({ defaultPrevented: false, types: ['Files'] }), true);
  assert.equal(shouldBlockFileDrop({ defaultPrevented: true, types: ['Files'] }), false);
  assert.equal(shouldBlockFileDrop({ defaultPrevented: false, types: ['text/plain', 'text/uri-list'] }), false);
});
