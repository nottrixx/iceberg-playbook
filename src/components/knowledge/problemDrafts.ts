import type { CommonProblem } from '../../data';

// Editor-only Common Problem state. The id never reaches stored data:
// fromProblemDrafts returns the problems exactly as edited.
export type ProblemField = 'problem' | 'cause' | 'solution';
export interface ProblemDraft {
  id: string;
  problem: CommonProblem;
}

let nextId = 0;
const newId = () => `problem-${++nextId}`;

export function toProblemDrafts(problems: CommonProblem[]): ProblemDraft[] {
  return problems.map(problem => ({ id: newId(), problem }));
}

export function newProblemDraft(): ProblemDraft {
  return { id: newId(), problem: { problem: '', cause: '', solution: '' } };
}

export function updateProblemDraft(drafts: ProblemDraft[], id: string, field: ProblemField, value: string): ProblemDraft[] {
  return drafts.map(d => d.id === id ? { ...d, problem: { ...d.problem, [field]: value } } : d);
}

export function removeProblemDraft(drafts: ProblemDraft[], id: string): ProblemDraft[] {
  return drafts.filter(d => d.id !== id);
}

export function fromProblemDrafts(drafts: ProblemDraft[]): CommonProblem[] {
  return drafts.map(d => d.problem);
}
