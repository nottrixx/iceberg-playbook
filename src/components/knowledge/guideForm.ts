import type { GuideContent } from '../../data';
import { guideChecklist, safeMediaUrl } from '../../guideTemplate';
import { fromStepDrafts, type StepDraft } from './stepDrafts';
import { fromProblemDrafts, type ProblemDraft } from './problemDrafts';

export interface GuideForm {
  title: string;
  summary: string;
  status: GuideContent['status'];
  difficulty: GuideContent['difficulty'];
  estimatedTime: string;
  checklist: string[];
  info: string;
  video: string;
  pdf: string;
  steps: StepDraft[];
  problems: ProblemDraft[];
  notes: string;
}

export interface FieldError {
  key: string;
  message: string;
}

// An untouched stored value is kept as is, so opening a Guide never counts as a change.
const trimEdited = (value: string, stored?: string) => value === stored ? value : value.trim();

export function buildGuideContent(form: GuideForm, base?: GuideContent): GuideContent {
  // Do not rewrite legacy content merely by opening the editor. Preserve archived fields.
  const checklistChanged = !base || JSON.stringify(form.checklist) !== JSON.stringify(guideChecklist(base));
  return {
    title: trimEdited(form.title, base?.title), summary: trimEdited(form.summary, base?.summary),
    status: form.status, difficulty: form.difficulty, estimatedTime: form.estimatedTime, video: form.video, pdf: form.pdf,
    steps: fromStepDrafts(form.steps),
    beforeYouStart: checklistChanged ? form.checklist.map(s => s.trim()).filter(Boolean) : base.beforeYouStart,
    requirements: checklistChanged ? [] : base.requirements,
    importantInformation: form.info, commonProblems: fromProblemDrafts(form.problems), internalNotes: form.notes,
    faq: base?.faq || [], relatedItems: base?.relatedItems || [],
  };
}

const blank = (value?: string) => !value?.trim();
const referenceFields = { videoLink: 'Video Reference URL', pdfReference: 'PDF Reference URL' } as const;

// Error keys: 'title', 'summary', `${stepId}:${field}` and the problem draft id.
export function validateGuideForm(form: Pick<GuideForm, 'title' | 'summary' | 'steps' | 'problems'>): FieldError[] {
  const errors: FieldError[] = [];
  if (blank(form.title)) errors.push({ key: 'title', message: 'Guide Title cannot be empty or only spaces.' });
  if (blank(form.summary)) errors.push({ key: 'summary', message: 'Guide Summary cannot be empty or only spaces.' });
  form.steps.forEach(({ id, step }, i) => {
    if (blank(step.title)) errors.push({ key: `${id}:title`, message: `Step ${i + 1}: Title cannot be empty or only spaces.` });
    if (blank(step.description)) errors.push({ key: `${id}:description`, message: `Step ${i + 1}: Description cannot be empty or only spaces.` });
    for (const [field, label] of Object.entries(referenceFields) as [keyof typeof referenceFields, string][]) {
      const value = step[field];
      if (value && !safeMediaUrl(value)) errors.push({ key: `${id}:${field}`, message: `Step ${i + 1}: ${label} must be a full link starting with https:// or http://.` });
    }
  });
  form.problems.forEach(({ id, problem }, i) => {
    if (blank(problem.problem) && blank(problem.cause) && blank(problem.solution)) errors.push({ key: id, message: `Common problem ${i + 1} is empty. Fill it in or remove it.` });
    else if (blank(problem.problem)) errors.push({ key: id, message: `Common problem ${i + 1} needs a problem description.` });
  });
  return errors;
}
