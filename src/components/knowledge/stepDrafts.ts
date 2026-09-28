import type { Step } from '../../data';

// Editor-only step state. The id and initial screenshot never reach stored data:
// fromStepDrafts rebuilds plain steps before a save.
export type StepFields = Omit<Step, 'number'>;
export interface StepDraft {
  id: string;
  // Stored steps keep their original fields (number included) so the rebuilt steps keep their key order.
  step: StepFields & { number?: number };
  initialScreenshot?: string;
  isNew?: boolean;
}

let nextId = 0;
const newId = () => `step-${++nextId}`;

export function toStepDrafts(steps: Step[]): StepDraft[] {
  return steps.map(step => ({ id: newId(), step, initialScreenshot: step.screenshot }));
}

export function newStepDraft(): StepDraft {
  return { id: newId(), step: { title: '', description: '' }, isNew: true };
}

export function updateStepDraft<K extends keyof StepFields>(drafts: StepDraft[], id: string, key: K, value: StepFields[K]): StepDraft[] {
  return drafts.map(d => d.id === id ? { ...d, step: { ...d.step, [key]: value } } : d);
}

export function removeStepDraft(drafts: StepDraft[], id: string): StepDraft[] {
  return drafts.filter(d => d.id !== id);
}

export function fromStepDrafts(drafts: StepDraft[]): Step[] {
  return drafts.map((d, i) => ({ ...d.step, number: i + 1 }));
}
