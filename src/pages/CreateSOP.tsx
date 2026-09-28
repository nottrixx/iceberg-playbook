import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useLeaveGuard } from '../router';
import { getPlaybooks, addSOP, formatStorageError, type SOP } from '../data';
import { PageHeader, FormSection } from '../components/knowledge/ApplicationUI';
import { StringList, StepEditor, revealInvalid } from '../components/knowledge/EditorFields';
import { newStepDraft, fromStepDrafts, type StepDraft } from '../components/knowledge/stepDrafts';
import { hasUnsavedChanges } from '../components/knowledge/formChanges';
export function CreateSOP() {
 const {navigate,params}=useRouter();const playbooks=getPlaybooks();const [playbookId,setPlaybookId]=useState(params.playbook||playbooks[0]?.id||'');
 const [title,setTitle]=useState('');const [status,setStatus]=useState<SOP['status']>('Draft');const [time,setTime]=useState('30 min');const [team,setTeam]=useState('Support & Onboarding Team');
 const [purpose,setPurpose]=useState('');const [when,setWhen]=useState('');const [requirements,setRequirements]=useState<string[]>([]);const [checklist,setChecklist]=useState(['Customer information received','Setup verified','Testing completed']);
 const [steps,setSteps]=useState<StepDraft[]>(()=>[newStepDraft()]);const [escalation,setEscalation]=useState('');const [completion,setCompletion]=useState('');const [notes,setNotes]=useState('');const [error,setError]=useState('');
 const pb=playbooks.find(p=>p.id===playbookId);
 const snapshot={playbookId,title,status,time,team,purpose,when,requirements,checklist,steps:steps.map(d=>d.step),escalation,completion,notes};const [initialSnapshot]=useState(snapshot);
 useLeaveGuard(hasUnsavedChanges(initialSnapshot,snapshot));
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');try{if(!pb||!title.trim()||!purpose.trim()||!when.trim())throw Error('Select a Playbook and complete the title, purpose and when to use.');const sop=addSOP({playbookId,title:title.trim(),status,estimatedTime:time,purpose,whenToUse:when,requirements:requirements.filter(s=>s.trim()),responsibleTeam:team,checklist:checklist.filter(s=>s.trim()),steps:fromStepDrafts(steps),escalationRules:escalation,completionCriteria:completion,relatedIssues:[],relatedGuides:[],internalNotes:notes,revisionHistory:[{version:'1.0.0',date:new Date().toISOString().split('T')[0],updatedBy:'Support Team',changes:'SOP published via editor.'}]});navigate(`/playbooks/${pb.slug}/sops/${sop.id}`,{force:true});}catch(e){setError(formatStorageError(e, 'Could not publish SOP.'));}};
 return <div className="editor"><a className="back-link" href="#/create"><ArrowLeft size={14}/>Back to Create</a><PageHeader title="Create SOP" description="Define a repeatable operational process for Support."/><form onSubmit={submit} onInvalid={revealInvalid}>
 <FormSection title="Basic Information"><label>Playbook *<select required value={playbookId} onChange={e=>setPlaybookId(e.target.value)}><option value="" disabled>Select a Playbook</option>{playbooks.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>SOP Title *<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. WhatsApp Customer Onboarding Process"/></label><div className="form-grid"><label>Status<select value={status} onChange={e=>setStatus(e.target.value as SOP['status'])}><option>Draft</option><option>Verified</option></select></label><label>Estimated Duration<input value={time} onChange={e=>setTime(e.target.value)}/></label></div><label>Responsible Team<input value={team} onChange={e=>setTeam(e.target.value)}/></label><p className="helper-text">{pb?.code||'SOP'}-SOP code assigned when published.</p></FormSection>
 <FormSection title="Purpose"><label>Purpose *<textarea required rows={3} value={purpose} onChange={e=>setPurpose(e.target.value)}/></label><label>When to Use *<textarea required rows={3} value={when} onChange={e=>setWhen(e.target.value)}/></label></FormSection>
 <FormSection title="Before You Start" optional><StringList label="Requirement" values={requirements} onChange={setRequirements}/></FormSection>
 <FormSection title="Process Checklist" optional open><StringList label="Workflow Stage" values={checklist} onChange={setChecklist}/></FormSection>
 <FormSection title="Process Steps"><StepEditor drafts={steps} onChange={setSteps}/></FormSection>
 <FormSection title="Escalation Rules" optional><label>Escalation Rules<textarea rows={3} value={escalation} onChange={e=>setEscalation(e.target.value)}/></label></FormSection>
 <FormSection title="Completion Criteria" optional><label>Completion Criteria<textarea rows={3} value={completion} onChange={e=>setCompletion(e.target.value)}/></label></FormSection>
 <FormSection title="Internal Notes" optional><label>Support Only<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></label></FormSection>
 {error&&<p className="knowledge-error" role="alert">{error}</p>}<div className="form-actions"><a className="btn-secondary" href="#/create">Cancel</a><button className="btn-primary" type="submit">Publish SOP</button></div></form></div>;
}
