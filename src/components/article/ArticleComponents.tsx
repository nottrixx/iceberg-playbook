import { useState, type ReactNode } from 'react';
import { CheckCircle2, Clock, Lock, ChevronDown, FileText, Download, Play } from 'lucide-react';
import type { Step, CommonProblem, Revision } from '../../data';
import { safeMediaUrl, videoEmbed } from '../../guideTemplate';
import { readMediaFile } from '../knowledge/mediaUtils';

export const StatusBadge = ({ status }: { status: 'Verified' | 'Draft' }) => <span className="status-label">{status === 'Verified' && <CheckCircle2 size={14} aria-hidden="true" />}{status}</span>;
export const DifficultyBadge = ({ difficulty }: { difficulty: 'Easy' | 'Medium' | 'Advanced' }) => <span>{difficulty}</span>;
export interface ArticleHeaderProps {
  code: string; title: string; status: 'Verified' | 'Draft'; playbookName: string;
  difficulty?: 'Easy' | 'Medium' | 'Advanced'; estimatedTime: string; updatedAt: string;
  authorOrOwner: string; type: 'Issue' | 'Guide' | 'SOP'; connection?: ReactNode; versionLabel?: string;
}
export function ArticleHeader({ code, title, status, playbookName, difficulty, estimatedTime, updatedAt, authorOrOwner, type, connection, versionLabel }: ArticleHeaderProps) {
  return <header className="article-header"><div className="article-eyebrow"><span>{type}</span><span className="row-code">{code}</span><span>{playbookName}</span></div>
    <h1>{title}</h1>{connection && <div className="article-connection">Solves Issue: {connection}</div>}
    <div className="article-meta"><StatusBadge status={status} />{estimatedTime && <span><Clock size={14} aria-hidden="true" />{estimatedTime}</span>}{difficulty && <DifficultyBadge difficulty={difficulty} />}{versionLabel && <span>{versionLabel}</span>}</div>
    <p className="article-updated">Last updated {updatedAt} by {authorOrOwner}</p>
  </header>;
}
export function SummarySection({ text, title = 'Summary' }: { text: string; title?: string }) {
  return <section className="article-section"><h2>{title}</h2><p>{text}</p></section>;
}
export function ChecklistSection({ items, title = 'Before You Start' }: { items: string[]; title?: string }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!items.length) return null;
  return <section className="article-section"><h2>{title}</h2><div className="article-checklist">{items.map((item, i) => <label key={i}><input type="checkbox" checked={!!checked[i]} onChange={e => setChecked({...checked,[i]:e.target.checked})}/><span>{item}</span></label>)}</div></section>;
}
export function RequirementsSection({ requirements }: { requirements: string[] }) { return <ChecklistSection items={requirements} title="Before You Start" />; }
export function ImportantInfoSection({ info }: { info: string }) {
  return info ? <section className="article-section"><h2>Important Information</h2><div className="quiet-callout"><p>{info}</p></div></section> : null;
}
function Screenshot({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false); const url = safeMediaUrl(src);
  if (!url) return <p className="helper-text">Screenshot reference: {src}</p>;
  return <figure className="step-screenshot">{!failed && <a href={url} target="_blank" rel="noreferrer"><img loading="lazy" src={url} alt={title} onError={() => setFailed(true)}/></a>}<figcaption><a href={url} target="_blank" rel="noreferrer">{failed ? 'Image unavailable. Open original screenshot' : 'Open full-size screenshot'}</a></figcaption></figure>;
}
export function StepsSection({ steps, title = 'Step-by-Step' }: { steps: Step[]; linkedMedia?: boolean; title?: string }) {
  if (!steps.length) return null;
  return <section className="article-section steps-section"><h2>{title}</h2><ol className="article-steps">{steps.map((step, i) => <li key={i}>
    <span className="step-number" aria-label={`Step ${i+1}`}>{String(i+1).padStart(2,'0')}</span><div className="step-content"><div className="step-heading"><h3>{step.title}</h3>{step.estimatedTime && <span className="helper-text">{step.estimatedTime}</span>}</div>
    <p>{step.description}</p>{step.screenshot && <Screenshot key={step.screenshot} src={step.screenshot} title={`${step.title} — screenshot`} />}
    {step.importantNote && <div className="step-note"><strong>Important</strong><p>{step.importantNote}</p></div>}
    {step.successIndicator && <div className="step-result"><CheckCircle2 size={17} aria-hidden="true"/><div><strong>Expected Result</strong><p>{step.successIndicator}</p></div></div>}
    <div className="inline-actions">{step.videoLink && (safeMediaUrl(step.videoLink) ? <a href={safeMediaUrl(step.videoLink)} target="_blank" rel="noreferrer">Watch video chapter</a> : <span className="helper-text">Video reference: {step.videoLink}</span>)}{step.pdfReference && (safeMediaUrl(step.pdfReference) ? <a href={safeMediaUrl(step.pdfReference)} target="_blank" rel="noreferrer">Read PDF reference</a> : <span className="helper-text">PDF reference: {step.pdfReference}</span>)}</div>
    </div></li>)}</ol></section>;
}
export function CommonProblemsAccordion({ problems }: { problems: CommonProblem[] }) {
  if (!problems.length) return null;
  return <section className="article-section"><h2>Common Problems</h2><div className="article-accordion">{problems.map((p,i)=><details key={i}><summary>{p.problem}<ChevronDown size={17} aria-hidden="true"/></summary><div><strong>Cause</strong><p>{p.cause}</p><strong>Solution</strong><p>{p.solution}</p>{p.relatedIssue && <p className="helper-text">Issue reference: {p.relatedIssue}</p>}</div></details>)}</div></section>;
}
export function InternalNotes({ notes }: { notes: string }) {
  if (!notes) return null;
  return <section className="article-section internal-notes"><div className="section-heading"><h2>Internal Notes</h2><span className="helper-text"><Lock size={13} aria-hidden="true"/>Support Only</span></div><p>{notes}</p></section>;
}
export function RevisionHistory({ history }: { history: Revision[] }) {
  if (!history.length) return null;
  return <section className="article-section"><h2>Version History</h2><ol className="guide-history">{history.map((r,i)=><li key={i}><div className="guide-version-line"><strong>v{r.version}</strong><span>{r.date}</span><span>{r.updatedBy}</span></div><p>{r.changes}</p></li>)}</ol></section>;
}
export function VideoSection({ url }: { url?: string }) {
  const [playing, setPlaying] = useState(false); const [duration, setDuration] = useState(''); const [failed, setFailed] = useState(false);
  const safe = safeMediaUrl(url); if (!safe) return null;
  const embed = videoEmbed(safe);
  const direct = safe.startsWith('blob:') || /\.(mp4|webm|mov|ogg)(?:$|\?|#)/i.test(safe) || !embed;
  const isExternalUrl = safe.startsWith('http://') || safe.startsWith('https://');
  return <section className="article-section"><h2>Video Tutorial</h2>{embed ? (playing ? <iframe className="guide-video" title="Guide video tutorial" src={embed} allow="fullscreen; picture-in-picture" allowFullScreen/> : <button className="video-cover" onClick={()=>setPlaying(true)}><Play size={26} aria-hidden="true"/><span>Play video tutorial</span></button>) : direct ? <><video className="guide-video" controls preload="metadata" src={safe} onError={()=>setFailed(true)} onLoadedMetadata={e=>{ const seconds=e.currentTarget.duration; if(Number.isFinite(seconds)) setDuration(`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`); }} />{duration && <p className="helper-text">Duration {duration}</p>}{failed && <p className="helper-text">Video could not be loaded.</p>}</> : null}{isExternalUrl && <a className="media-source" href={safe} target="_blank" rel="noreferrer">Open video tutorial ↗</a>}</section>;
}
export function PDFSection({ url, updatedAt, filename: customFilename }: { url?: string; updatedAt: string; filename?: string }) {
  const safe = safeMediaUrl(url); if(!safe) return null;
  const filename = customFilename || readMediaFile(safe).name || 'Complete Guide.pdf';
  return <section className="article-section"><h2>PDF Guide</h2><div className="document-row"><FileText size={25} aria-hidden="true"/><div><strong>{filename}</strong><p className="helper-text">PDF · Guide updated {updatedAt}</p></div><a href={safe} target="_blank" rel="noreferrer" download={filename}><Download size={15} aria-hidden="true"/>Download PDF</a></div></section>;
}
