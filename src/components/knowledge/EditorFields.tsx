import { Plus, Trash2 } from 'lucide-react';
import { newStepDraft, removeStepDraft, updateStepDraft, type StepDraft, type StepFields } from './stepDrafts';
import { MediaUploadField } from './MediaUploadField';
import { revealField } from './revealField';
export function StringList({ label, values, onChange }: { label: string; values: string[]; onChange: (values:string[])=>void }) {
  return <div className="knowledge-list">{values.map((value,i)=><div className="knowledge-list-row" key={i}><input aria-label={`${label} ${i+1}`} value={value} onChange={e=>onChange(values.map((v,n)=>n===i?e.target.value:v))}/><button type="button" aria-label={`Remove ${label} ${i+1}`} onClick={()=>onChange(values.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></div>)}<button className="btn-secondary" type="button" onClick={()=>onChange([...values,''])}><Plus size={14}/>Add {label}</button></div>;
}
// Steps are keyed by editor-only ids so removing one never shifts another step's state or original screenshot.
// `invalid` holds `${draftId}:${field}` keys of fields to mark as invalid.
export function StepEditor({ drafts, onChange, invalid }: { drafts: StepDraft[]; onChange:(drafts:StepDraft[])=>void; invalid?: ReadonlySet<string> }) {
  return <div>{drafts.map((draft,i)=>{
    const { id, step } = draft;
    const update=(key:keyof StepFields,value:string)=>onChange(updateStepDraft(drafts,id,key,value));
    const isInvalid=(field:keyof StepFields)=>invalid?.has(`${id}:${field}`) || undefined;
    return <details className="editor-step" open={i===0 || draft.isNew || undefined} key={id}><summary>Step {String(i+1).padStart(2,'0')} · {step.title || 'New step'}</summary><div className="form-section-body">
    <label>Title *<input required aria-label={`Step ${i+1} title`} aria-invalid={isInvalid('title')} value={step.title} onChange={e=>update('title',e.target.value)} /></label>
    <label>Description *<textarea required aria-label={`Step ${i+1} description`} aria-invalid={isInvalid('description')} rows={4} value={step.description} onChange={e=>update('description',e.target.value)}/></label>
    <label>Expected Result<input aria-label={`Step ${i+1} expected result`} value={step.successIndicator||''} onChange={e=>update('successIndicator',e.target.value)} /></label>
    <details className="disclosure"><summary>Screenshot, notes & references</summary><div className="optional-fields">
    <label>Screenshot
      <MediaUploadField
        type="image"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        acceptedFormatsText="Accepted formats: PNG, JPG, WebP"
        dropText="Drag & drop a screenshot here"
        buttonText="Choose Screenshot"
        value={step.screenshot || ''}
        initialValue={draft.initialScreenshot}
        showPreviewImage
        onChange={(url) => update('screenshot', url)}
      />
    </label>
    {(['importantNote','estimatedTime','videoLink','pdfReference'] as const).map(field=><label key={field}>{{importantNote:'Important Note',estimatedTime:'Estimated Time',videoLink:'Video Reference URL',pdfReference:'PDF Reference URL'}[field]}<input aria-label={`Step ${i+1} ${field}`} aria-invalid={isInvalid(field)} value={step[field]||''} onChange={e=>update(field,e.target.value)}/></label>)}
    </div></details>{drafts.length>1 && <button className="back-link" type="button" onClick={()=>onChange(removeStepDraft(drafts,id))}><Trash2 size={14}/>Remove Step {i+1}</button>}
  </div></details>;
  })}<button className="btn-secondary" type="button" onClick={()=>onChange([...drafts,newStepDraft()])}><Plus size={14}/>Add Step</button></div>;
}
// Native validation must be able to focus a required control inside a collapsed section.
export function revealInvalid(event: React.InvalidEvent<HTMLFormElement>) {
  revealField(event.target as HTMLElement);
}

