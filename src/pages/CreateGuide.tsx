import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useRouter, useLeaveGuard } from '../router';
import { getPlaybooks, getIssues, getPrimaryGuide, addGuide, getGuides, publishGuideUpdate, guideContent, formatGuideVersion, formatStorageError, type GuideContent, type VersionedGuide } from '../data';
import { guideChecklist } from '../guideTemplate';
import { GuideArticle } from '../components/knowledge/GuideArticle';
import { IssueSelector } from '../components/knowledge/IssueSelector';
import { PageHeader, FormSection, StateMessage } from '../components/knowledge/ApplicationUI';
import { StringList, StepEditor, revealInvalid } from '../components/knowledge/EditorFields';
import { revealField } from '../components/knowledge/revealField';
import { toStepDrafts, newStepDraft, type StepDraft } from '../components/knowledge/stepDrafts';
import { toProblemDrafts, newProblemDraft, updateProblemDraft, removeProblemDraft, type ProblemDraft } from '../components/knowledge/problemDrafts';
import { buildGuideContent, validateGuideForm } from '../components/knowledge/guideForm';
import { MediaUploadField } from '../components/knowledge/MediaUploadField';
import { hasUnsavedChanges, guideEditDirty } from '../components/knowledge/formChanges';

export function CreateGuide() {
  const { path, params } = useRouter();
  const initial = path === '/guides/[id]/edit' ? getGuides().find(g=>g.id===params.id) : undefined;
  if(path === '/guides/[id]/edit' && !initial) return <StateMessage title="Guide not found" action={<a href="#/playbooks">Back to Playbooks</a>}/>;
  return <GuideEditor key={initial?.id||'new'} initial={initial}/>;
}
function GuideEditor({ initial }: { initial?: VersionedGuide }) {
  const { navigate, params } = useRouter(); const [base] = useState(initial);
  const [issueId,setIssueId]=useState(base?.issueId||params.issue||''); const [title,setTitle]=useState(base?.title||'');
  const [summary,setSummary]=useState(base?.summary||''); const [status,setStatus]=useState<GuideContent['status']>(base?.status||'Draft');
  const [difficulty,setDifficulty]=useState<GuideContent['difficulty']>(base?.difficulty||'Medium'); const [estimatedTime,setEstimatedTime]=useState(base?.estimatedTime||'15 min');
  const [checklist,setChecklist]=useState(base?guideChecklist(base):[]); const [info,setInfo]=useState(base?.importantInformation||'');
  const [video,setVideo]=useState(base?.video||''); const [pdf,setPdf]=useState(base?.pdf||'');
  const [steps,setSteps]=useState<StepDraft[]>(()=>base?toStepDrafts(structuredClone(base.steps)):[newStepDraft()]);
  const [problems,setProblems]=useState<ProblemDraft[]>(()=>base?toProblemDrafts(structuredClone(base.commonProblems)):[]);
  const [notes,setNotes]=useState(base?.internalNotes||''); const [changes,setChanges]=useState(''); const [error,setError]=useState(''); const [preview,setPreview]=useState(false);
  // Field errors appear after the first publish or preview attempt and update as fields are fixed.
  const [showErrors,setShowErrors]=useState(false); const [revealRequest,setRevealRequest]=useState(0); const formRef=useRef<HTMLFormElement>(null);
  const issue=getIssues().find(i=>i.id===issueId); const pb=getPlaybooks().find(p=>p.id===issue?.playbookId); const existing=issue?getPrimaryGuide(issue.id):undefined;
  const blocked=!issue||!pb||(!base&&!!existing);
  const content:GuideContent=buildGuideContent({title,summary,status,difficulty,estimatedTime,checklist,info,video,pdf,steps,problems,notes},base);
  const hasChanges=!base||JSON.stringify(guideContent(content))!==JSON.stringify(guideContent(base));
  // A new Guide is compared with the empty form it opened with; draft ids stay out of the comparison.
  const snapshot={issueId,title,summary,status,difficulty,estimatedTime,checklist,info,video,pdf,steps:steps.map(d=>d.step),problems:problems.map(d=>d.problem),notes};
  const [initialSnapshot]=useState(snapshot);
  useLeaveGuard(base?guideEditDirty(hasChanges,changes):hasUnsavedChanges(initialSnapshot,snapshot));
  const fieldErrors=showErrors?validateGuideForm({title,summary,steps,problems}):[]; const invalid=new Set(fieldErrors.map(e=>e.key));
  useEffect(()=>{ if(!revealRequest) return; const field=formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]'); if(field){revealField(field);field.focus();} },[revealRequest]);
  const checkFields=()=>{ setShowErrors(true); const ok=!validateGuideForm({title,summary,steps,problems}).length; if(!ok) setRevealRequest(n=>n+1); return ok; };
  const back=()=>navigate(base&&pb?`/playbooks/${pb.slug}/guides/${base.id}`:'/create');
  const publish=()=>{setError(''); if(blocked) {setError('Select an existing Issue without a solution Guide.');return;}
    if(!checkFields()) return;
    try {
      const saved = base
        ? publishGuideUpdate(base.id, content, base.currentVersionId, changes)
        : addGuide({ ...content, issueId, playbookId: pb!.id, revisionHistory: [] });
      navigate(`/playbooks/${pb!.slug}/guides/${saved.id}`, { force: true });
    }
    catch(e){setError(formatStorageError(e, 'Could not publish the Guide.'));}
  };
  if(preview&&base) return <div className="guide-article"><section className="issue-connection"><h2>Preview Changes</h2><p>Unpublished changes · Current Guide remains v{formatGuideVersion(base.versionNumber)}.</p><div className="inline-actions"><button className="btn-secondary" onClick={()=>setPreview(false)}>Back to Editing</button><button className="btn-primary" disabled={!hasChanges} onClick={publish}>Publish Update</button></div></section>{error&&<p className="knowledge-error" role="alert">{error}</p>}<GuideArticle guide={{...base,...structuredClone(content)}} versionLabel="Unpublished preview"/></div>;
  return <div className="editor"><button className="back-link" onClick={back}><ArrowLeft size={14}/>{base?'Back to Guide':'Back to Create'}</button><PageHeader title={base?'Edit Guide':'Create Guide'} description="Document the solution to an existing Issue."/>
    <form ref={formRef} onInvalid={revealInvalid} onSubmit={e=>{e.preventDefault();publish();}}>
    <FormSection title="Related Issue" hint={base?undefined:'Select the problem this Guide solves. The Playbook is inherited automatically.'}>
      {base?<div><a href={`#/playbooks/${pb?.slug}/issues/${issueId}`}>{issueId} — {issue?.title}</a><p className="helper-text">{pb?.name} · {base.id}</p></div>:<IssueSelector value={issueId} onChange={setIssueId}/>}
      {!base&&existing&&<p role="status">This Issue already has a Guide. <a href={`#/playbooks/${pb?.slug}/guides/${existing.id}`}>Open existing Guide →</a></p>}
    </FormSection>
    {issue&&!blocked&&<>
    <FormSection title="Header"><label>Guide Title *<input required aria-label="Guide Title" aria-invalid={invalid.has('title')||undefined} value={title} onChange={e=>setTitle(e.target.value)} placeholder="How to resolve…"/></label>
      <div className="form-grid"><label>Status<select value={status} onChange={e=>setStatus(e.target.value as GuideContent['status'])}><option>Draft</option><option>Verified</option></select></label><label>Estimated Time<input value={estimatedTime} onChange={e=>setEstimatedTime(e.target.value)}/></label></div>
      <details className="disclosure"><summary>Additional metadata</summary><div className="optional-fields"><label>Playbook<input readOnly value={pb?.name||''}/></label><label>Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value as GuideContent['difficulty'])}><option>Easy</option><option>Medium</option><option>Advanced</option></select></label></div></details>
    </FormSection>
    <FormSection title="Summary" hint="Explain what this solves, when to use it and the expected outcome in 2–4 sentences."><label>Guide Summary *<textarea aria-label="Guide Summary" aria-invalid={invalid.has('summary')||undefined} required rows={4} value={summary} onChange={e=>setSummary(e.target.value)}/></label></FormSection>
    <FormSection title="Before You Start" hint="Access, identifiers and permissions needed before following the solution."><StringList label="Checklist item" values={checklist} onChange={setChecklist}/></FormSection>
    <FormSection title="Important Information" optional open={!!info}><label>Warnings & limitations<textarea value={info} rows={3} onChange={e=>setInfo(e.target.value)}/></label></FormSection>
    <FormSection title="Video Tutorial" optional open={!!video}>
      <MediaUploadField
        type="video"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        acceptedFormatsText="Accepted formats: MP4, WebM, MOV"
        dropText="Drag & drop a video here"
        buttonText="Choose Video"
        value={video}
        initialValue={base?.video}
        onChange={(url) => setVideo(url)}
      />
    </FormSection>
    <FormSection title="Step-by-Step"><StepEditor drafts={steps} onChange={setSteps} invalid={invalid}/></FormSection>
    <FormSection title="PDF Guide" optional open={!!pdf}>
      <MediaUploadField
        type="pdf"
        accept="application/pdf,.pdf"
        acceptedFormatsText="Accepted format: PDF"
        dropText="Drag & drop a PDF here"
        buttonText="Choose PDF"
        value={pdf}
        initialValue={base?.pdf}
        onChange={(url) => setPdf(url)}
      />
    </FormSection>
    <FormSection title="Common Problems" optional open={!!problems.length} hint="Small troubleshooting notes for problems encountered while following these steps.">
      {problems.map((d,i)=><div className="form-section-body" key={d.id}>{(['problem','cause','solution'] as const).map(field=><label key={field}>{field[0].toUpperCase()+field.slice(1)}<textarea rows={2} aria-invalid={(field==='problem'&&invalid.has(d.id))||undefined} value={d.problem[field]} onChange={e=>setProblems(updateProblemDraft(problems,d.id,field,e.target.value))}/></label>)}<button className="back-link" type="button" onClick={()=>setProblems(removeProblemDraft(problems,d.id))}><Trash2 size={14}/>Remove problem {i+1}</button></div>)}
      <button className="btn-secondary" type="button" onClick={()=>setProblems([...problems,newProblemDraft()])}><Plus size={14}/>Add Problem</button>
    </FormSection>
    <FormSection title="Internal Notes" optional open={!!notes}><p className="helper-text">Support Only</p><label>Internal Notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></label></FormSection>
    {base?<FormSection title="Publish Update"><label>What did you change?<textarea rows={2} value={changes} onChange={e=>setChanges(e.target.value)} placeholder="Updated Step 4 after the Meta interface changed."/></label><p className="helper-text">A new version is created when you publish. Earlier versions remain available.</p></FormSection>:<p className="helper-text">Publishing creates v1.0 and starts Version History.</p>}
    {base&&!hasChanges&&<p className="helper-text">No content changes to publish.</p>}
    </>}
    {fieldErrors.length>0&&<div role="alert" className="knowledge-error"><p>Fix these fields before publishing:</p><ul>{fieldErrors.map(e=><li key={e.key}>{e.message}</li>)}</ul></div>}
    {error&&<p role="alert" className="knowledge-error">{error}</p>}
    <div className="form-actions"><button type="button" className="btn-secondary" onClick={back}>Cancel</button>{base&&<button className="btn-secondary" type="button" onClick={e=>{if(e.currentTarget.form?.reportValidity()&&checkFields())setPreview(true);}}>Preview Changes</button>}<button className="btn-primary" type="submit" disabled={blocked||!hasChanges}>{base?'Publish Update':'Publish Guide'}</button></div>
    </form>
  </div>;
}
