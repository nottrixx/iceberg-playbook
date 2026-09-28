import { useEffect, useRef } from 'react';

// Escape (the dialog's cancel event) keeps the user on the page.
export function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="guide-restore-dialog" aria-labelledby="leave-title" aria-describedby="leave-description" onCancel={event => { event.preventDefault(); onStay(); }}>
    <h2 id="leave-title">Leave without saving?</h2>
    <p id="leave-description">You have unsaved changes on this page. If you leave now, they will be lost.</p>
    <div className="knowledge-actions"><button autoFocus className="btn-secondary" onClick={onStay}>Stay on page</button><button className="btn-primary" onClick={onLeave}>Leave page</button></div>
  </dialog>;
}
