import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importTs, importTranspiled } from './helpers/transpile.mjs';

const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };

const form = await importTs('src/components/knowledge/guideForm.ts', 'guide-form');
const steps = await importTranspiled('src/components/knowledge/stepDrafts.ts', 'guide-form');
const problems = await importTranspiled('src/components/knowledge/problemDrafts.ts', 'guide-form');
const template = await importTranspiled('src/guideTemplate.ts', 'guide-form');
const data = await importTs('src/data.ts', 'guide-form-data');
const sample = await importTs('src/sampleData.ts', 'guide-form-sample');

// Mirrors the initial editor state CreateGuide builds from a stored Guide.
const formFor = base => ({
  title: base.title, summary: base.summary, status: base.status, difficulty: base.difficulty, estimatedTime: base.estimatedTime,
  checklist: template.guideChecklist(base), info: base.importantInformation || '', video: base.video || '', pdf: base.pdf || '',
  steps: steps.toStepDrafts(structuredClone(base.steps)), problems: problems.toProblemDrafts(structuredClone(base.commonProblems)), notes: base.internalNotes || '',
});
const unchanged = (content, base) => JSON.stringify(data.guideContent(content)) === JSON.stringify(data.guideContent(base));
const validForm = () => ({
  title: 'Title', summary: 'Summary',
  steps: steps.toStepDrafts([{ number: 1, title: 'Step', description: 'Do it' }]),
  problems: problems.toProblemDrafts([{ problem: 'P', cause: 'C', solution: 'S' }]),
});
const keys = errors => errors.map(e => e.key);

test('problem drafts get unique ids', () => {
  const ids = [...problems.toProblemDrafts([{ problem: 'a', cause: '', solution: '' }, { problem: 'b', cause: '', solution: '' }]), problems.newProblemDraft()].map(d => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('removing a middle problem keeps the others with their own content', () => {
  const initial = problems.toProblemDrafts([{ problem: 'A', cause: 'a', solution: '1' }, { problem: 'B', cause: 'b', solution: '2' }, { problem: 'C', cause: 'c', solution: '3' }]);
  const remaining = problems.removeProblemDraft(initial, initial[1].id);
  assert.deepEqual(remaining.map(d => d.id), [initial[0].id, initial[2].id]);
  assert.deepEqual(problems.fromProblemDrafts(remaining).map(p => p.problem), ['A', 'C']);
});

test('updating a problem changes only the targeted row', () => {
  const initial = problems.toProblemDrafts([{ problem: 'A', cause: '', solution: '' }, { problem: 'B', cause: '', solution: '' }]);
  const updated = problems.updateProblemDraft(initial, initial[1].id, 'cause', 'why');
  assert.equal(updated[0], initial[0]);
  assert.deepEqual(updated[1].problem, { problem: 'B', cause: 'why', solution: '' });
  assert.equal(initial[1].problem.cause, '');
});

test('rebuilt problems carry no editor ids and keep extra stored fields', () => {
  const stored = [{ problem: 'A', cause: 'a', solution: 's', relatedIssue: 'WA-001' }];
  const rebuilt = problems.fromProblemDrafts([...problems.toProblemDrafts(structuredClone(stored)), problems.newProblemDraft()]);
  assert.equal(JSON.stringify(rebuilt[0]), JSON.stringify(stored[0]));
  assert.deepEqual(rebuilt[1], { problem: '', cause: '', solution: '' });
  for (const p of rebuilt) assert.equal('id' in p, false);
});

test('an untouched sample Guide produces no content changes', () => {
  assert.ok(sample.sampleGuides.some(g => g.commonProblems.length), 'sample data must contain a Guide with common problems');
  for (const guide of sample.sampleGuides) {
    const base = data.guideContent(guide);
    assert.ok(unchanged(form.buildGuideContent(formFor(base), base), base), guide.id);
  }
});

test('an untouched stored title or summary with surrounding spaces is not rewritten', () => {
  const base = data.guideContent({ ...sample.sampleGuides[0], title: ' Legacy title ', summary: 'Legacy summary\n' });
  const content = form.buildGuideContent(formFor(base), base);
  assert.equal(content.title, ' Legacy title ');
  assert.ok(unchanged(content, base));
});

test('adding only spaces to the title or summary is not a content change', () => {
  const base = data.guideContent(sample.sampleGuides[0]);
  const content = form.buildGuideContent({ ...formFor(base), title: `  ${base.title}  `, summary: `${base.summary}\n` }, base);
  assert.equal(content.title, base.title);
  assert.ok(unchanged(content, base));
});

test('a new Guide gets a trimmed title and summary', () => {
  const content = form.buildGuideContent({ ...formFor(data.guideContent(sample.sampleGuides[0])), title: '  New title ', summary: '\tNew summary  ' });
  assert.equal(content.title, 'New title');
  assert.equal(content.summary, 'New summary');
});

test('empty Common Problem rows are kept in content instead of silently dropped', () => {
  const base = data.guideContent(sample.sampleGuides[0]);
  const state = formFor(base);
  const content = form.buildGuideContent({ ...state, problems: [...state.problems, problems.newProblemDraft()] }, base);
  assert.equal(content.commonProblems.length, base.commonProblems.length + 1);
  assert.ok(!unchanged(content, base));
});

test('a valid form has no errors', () => {
  assert.deepEqual(form.validateGuideForm(validForm()), []);
});

test('sample Guides pass validation', () => {
  for (const guide of sample.sampleGuides) assert.deepEqual(form.validateGuideForm(formFor(guide)), [], guide.id);
});

test('whitespace-only title, summary, step title and description are flagged', () => {
  const state = validForm();
  const id = state.steps[0].id;
  const drafts = steps.updateStepDraft(steps.updateStepDraft(state.steps, id, 'title', '   '), id, 'description', '\n\t');
  assert.deepEqual(keys(form.validateGuideForm({ ...state, title: '  ', summary: '\n', steps: drafts })), ['title', 'summary', `${id}:title`, `${id}:description`]);
});

test('a fully empty Common Problem row is reported', () => {
  const state = validForm();
  const blank = problems.newProblemDraft();
  const errors = form.validateGuideForm({ ...state, problems: [...state.problems, blank] });
  assert.deepEqual(keys(errors), [blank.id]);
  assert.match(errors[0].message, /Common problem 2 is empty/);
});

test('a Common Problem with cause or solution but no problem is reported', () => {
  const [row] = problems.toProblemDrafts([{ problem: '  ', cause: 'Because', solution: '' }]);
  const errors = form.validateGuideForm({ ...validForm(), problems: [row] });
  assert.deepEqual(keys(errors), [row.id]);
  assert.match(errors[0].message, /needs a problem description/);
});

test('step reference URLs are checked with safeMediaUrl', () => {
  const state = validForm();
  const id = state.steps[0].id;
  const withRefs = (videoLink, pdfReference) => form.validateGuideForm({ ...state, steps: steps.updateStepDraft(steps.updateStepDraft(state.steps, id, 'videoLink', videoLink), id, 'pdfReference', pdfReference) });
  assert.deepEqual(keys(withRefs('www.example.com/video', 'javascript:alert(1)')), [`${id}:videoLink`, `${id}:pdfReference`]);
  assert.deepEqual(keys(withRefs('   ', 'not a link')), [`${id}:videoLink`, `${id}:pdfReference`]);
  assert.deepEqual(withRefs('https://example.com/video', 'HTTPS://EXAMPLE.COM/guide.pdf'), []);
  assert.deepEqual(withRefs('', ''), []);
});
