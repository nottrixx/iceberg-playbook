import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './helpers/transpile.mjs';

const drafts = await importTs('src/components/knowledge/stepDrafts.ts', 'step-drafts');
const sample = await importTs('src/sampleData.ts', 'step-drafts-sample');

const guideWithScreenshots = sample.sampleGuides.find(g => g.steps.filter(s => s.screenshot).length >= 2);
const steps = [
  { number: 1, title: 'One', description: 'd1', screenshot: 'https://example.test/one.png' },
  { number: 2, title: 'Two', description: 'd2', screenshot: 'https://example.test/two.png' },
  { number: 3, title: 'Three', description: 'd3' },
];

test('every draft gets a unique id', () => {
  const ids = [...drafts.toStepDrafts(steps), drafts.newStepDraft(), drafts.newStepDraft()].map(d => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('removing a step keeps each remaining step with its own screenshot and original screenshot', () => {
  const initial = drafts.toStepDrafts(steps);
  const remaining = drafts.removeStepDraft(initial, initial[0].id);
  assert.deepEqual(remaining.map(d => d.id), [initial[1].id, initial[2].id]);
  assert.equal(remaining[0].step.screenshot, 'https://example.test/two.png');
  assert.equal(remaining[0].initialScreenshot, 'https://example.test/two.png');
  assert.equal(remaining[1].initialScreenshot, undefined);
  assert.deepEqual(drafts.fromStepDrafts(remaining).map(s => [s.number, s.title]), [[1, 'Two'], [2, 'Three']]);
});

test('the original screenshot stays with its step after the screenshot is removed', () => {
  const initial = drafts.toStepDrafts(steps);
  const cleared = drafts.updateStepDraft(initial, initial[1].id, 'screenshot', '');
  const remaining = drafts.removeStepDraft(cleared, initial[0].id);
  assert.equal(remaining[0].step.screenshot, '');
  assert.equal(remaining[0].initialScreenshot, 'https://example.test/two.png');
});

test('updating a draft changes only the targeted step', () => {
  const initial = drafts.toStepDrafts(steps);
  const updated = drafts.updateStepDraft(initial, initial[1].id, 'title', 'Changed');
  assert.deepEqual(updated.map(d => d.step.title), ['One', 'Changed', 'Three']);
  assert.equal(updated[0], initial[0]);
  assert.equal(updated[2], initial[2]);
  assert.equal(initial[1].step.title, 'Two');
});

test('only steps added in the editor are marked new', () => {
  assert.equal(drafts.newStepDraft().isNew, true);
  assert.ok(drafts.toStepDrafts(steps).every(d => !d.isNew));
});

test('stored steps round-trip unchanged, so an untouched Guide shows no changes', () => {
  assert.ok(guideWithScreenshots, 'sample data must contain a Guide with screenshots');
  for (const guide of sample.sampleGuides) {
    assert.equal(Object.keys(guide.steps[0])[0], 'number', guide.id);
    const roundTrip = drafts.fromStepDrafts(drafts.toStepDrafts(structuredClone(guide.steps)));
    assert.equal(JSON.stringify(roundTrip), JSON.stringify(guide.steps), guide.id);
  }
});

test('rebuilt steps carry no editor-only fields', () => {
  const rebuilt = drafts.fromStepDrafts([...drafts.toStepDrafts(steps), drafts.newStepDraft()]);
  for (const step of rebuilt) {
    for (const key of ['id', 'initialScreenshot', 'isNew', 'step']) assert.equal(key in step, false, key);
  }
  assert.deepEqual(rebuilt[3], { title: '', description: '', number: 4 });
});
