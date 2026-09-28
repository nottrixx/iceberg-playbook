import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './helpers/transpile.mjs';

const { hasUnsavedChanges, normalizeForCompare, guideEditDirty } = await importTs('src/components/knowledge/formChanges.ts', 'form-changes');

// Mirrors the snapshot CreateIssue takes when it opens.
const emptyIssue = () => ({
  playbookId: 'whatsapp', title: '', summary: '', status: 'Draft', difficulty: 'Medium', time: '',
  symptoms: [''], errorMessage: '', context: '', area: '', information: [], attachments: [], notes: '',
});
// Mirrors the snapshot CreateSOP takes when it opens (steps as the editor holds them).
const emptySop = () => ({
  playbookId: 'whatsapp', title: '', status: 'Draft', time: '30 min', team: 'Support & Onboarding Team', purpose: '', when: '',
  requirements: [], checklist: ['Customer information received', 'Setup verified', 'Testing completed'],
  steps: [{ title: '', description: '' }], escalation: '', completion: '', notes: '',
});

test('an untouched new form has no unsaved changes', () => {
  assert.equal(hasUnsavedChanges(emptyIssue(), emptyIssue()), false);
  assert.equal(hasUnsavedChanges(emptySop(), emptySop()), false);
});

test('whitespace-only typing is not an unsaved change', () => {
  assert.equal(hasUnsavedChanges(emptyIssue(), { ...emptyIssue(), title: '   ', notes: '\n\t' }), false);
});

test('blank rows added to lists are not unsaved changes', () => {
  const current = { ...emptyIssue(), symptoms: ['', '  '], information: [''], attachments: [{ name: '', url: '' }] };
  assert.equal(hasUnsavedChanges(emptyIssue(), current), false);
  const sop = { ...emptySop(), steps: [{ title: '', description: '' }, { title: ' ', description: '', screenshot: '' }] };
  assert.equal(hasUnsavedChanges(emptySop(), sop), false);
});

test('removing the only blank step is not an unsaved change', () => {
  assert.equal(hasUnsavedChanges(emptySop(), { ...emptySop(), steps: [] }), false);
});

test('typed text is an unsaved change', () => {
  assert.equal(hasUnsavedChanges(emptyIssue(), { ...emptyIssue(), title: 'Test' }), true);
  assert.equal(hasUnsavedChanges(emptySop(), { ...emptySop(), steps: [{ title: 'Open', description: '' }] }), true);
});

test('an attachment with only a name is an unsaved change', () => {
  assert.equal(hasUnsavedChanges(emptyIssue(), { ...emptyIssue(), attachments: [{ name: 'Screenshot', url: '' }] }), true);
});

test('changing a select is an unsaved change', () => {
  assert.equal(hasUnsavedChanges(emptyIssue(), { ...emptyIssue(), status: 'Verified' }), true);
  assert.equal(hasUnsavedChanges(emptyIssue(), { ...emptyIssue(), playbookId: 'meta' }), true);
});

test('removing a default checklist item is an unsaved change', () => {
  const sop = { ...emptySop(), checklist: ['Customer information received', 'Setup verified'] };
  assert.equal(hasUnsavedChanges(emptySop(), sop), true);
});

test('normalizeForCompare does not change the given value', () => {
  const value = { title: ' a ', list: ['', 'b'] };
  assert.deepEqual(normalizeForCompare(value), { title: 'a', list: ['b'] });
  assert.deepEqual(value, { title: ' a ', list: ['', 'b'] });
});

test('editing a Guide is dirty for content changes or a typed change note', () => {
  assert.equal(guideEditDirty(false, ''), false);
  assert.equal(guideEditDirty(false, '   '), false);
  assert.equal(guideEditDirty(false, 'Updated step 2'), true);
  assert.equal(guideEditDirty(true, ''), true);
});
