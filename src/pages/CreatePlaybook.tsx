import { useState } from 'react';
import { ArrowLeft, MessageSquare, Briefcase, Home, Video, Mic, Globe } from 'lucide-react';
import { useRouter, useLeaveGuard } from '../router';
import { addPlaybook, getPlaybooks, formatStorageError } from '../data';
import { PageHeader, FormSection } from '../components/knowledge/ApplicationUI';
import { toSlug } from '../slug';
import { hasUnsavedChanges } from '../components/knowledge/formChanges';
const icons=[{name:'MessageSquare',icon:MessageSquare,label:'Chat / Social'},{name:'Briefcase',icon:Briefcase,label:'Business Suite'},{name:'Home',icon:Home,label:'Property CRM'},{name:'Video',icon:Video,label:'Video Meetings'},{name:'Mic',icon:Mic,label:'Audio'},{name:'Globe',icon:Globe,label:'Web Systems'}];
export function CreatePlaybook() {
 const {navigate}=useRouter();const [name,setName]=useState('');const [code,setCode]=useState('');const [description,setDescription]=useState('');const [icon,setIcon]=useState('MessageSquare');const [owner,setOwner]=useState('Support Team');const [visibility,setVisibility]=useState<'Internal'|'Public'>('Internal');const [error,setError]=useState('');
 const snapshot={name,code,description,icon,owner,visibility};const [initialSnapshot]=useState(snapshot);
 useLeaveGuard(hasUnsavedChanges(initialSnapshot,snapshot));
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');const slug=toSlug(name);try{if(!slug||!code.trim()||!description.trim())throw Error('Complete the name, code prefix and description.');if(getPlaybooks().some(p=>p.slug===slug||p.code.toLowerCase()===code.trim().toLowerCase()))throw Error('A Playbook with this name or prefix already exists. Choose another.');addPlaybook({id:slug,slug,name:name.trim(),code:code.trim().toUpperCase(),description,icon,owner,visibility});navigate(`/playbooks/${slug}`,{force:true});}catch(e){setError(formatStorageError(e, 'Could not create Playbook.'));}};
 return <div className="editor"><a className="back-link" href="#/create"><ArrowLeft size={14}/>Back to Create</a><PageHeader title="New Playbook" description="Create a product, platform or problem area."/><form onSubmit={submit}>
 <FormSection title="Playbook Details"><div className="form-grid"><label>Playbook Name *<input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. WhatsApp"/></label><label>Code Prefix *<input required pattern="[A-Za-z0-9]+" maxLength={5} value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. WA"/></label></div><label>Description *<textarea required rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><p className="helper-text">Issue codes will start with <span className="row-code">{code.trim().toUpperCase()||'PREFIX'}-001</span>.</p></FormSection>
 <FormSection title="Icon"><div className="icon-options">{icons.map(({name,icon:Icon,label})=><button type="button" key={name} aria-pressed={icon===name} onClick={()=>setIcon(name)}><Icon size={19}/>{label}</button>)}</div></FormSection>
 <FormSection title="Ownership & Visibility" optional><label>Owner<input value={owner} onChange={e=>setOwner(e.target.value)}/></label><label>Visibility<select value={visibility} onChange={e=>setVisibility(e.target.value as 'Internal'|'Public')}><option value="Internal">Internal (Support Only)</option><option value="Public">Public (All Departments)</option></select></label><p className="helper-text">Visibility is a content label in this preview. Access permissions are not connected yet.</p></FormSection>
 {error&&<p className="knowledge-error" role="alert">{error}</p>}<div className="form-actions"><a className="btn-secondary" href="#/create">Cancel</a><button className="btn-primary" type="submit">Create Playbook</button></div></form></div>;
}
