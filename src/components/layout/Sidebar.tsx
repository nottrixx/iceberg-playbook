import { useEffect, useRef, useState } from 'react';
import { Home, BookOpen, HelpCircle, Plus, Settings, X, LogOut } from 'lucide-react';
import { useRouter, guardedAction, usePendingLeave } from '../../router';
import './Sidebar.css';
import { useAuth } from '../../auth/AuthProvider';
export function Sidebar({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}) {
 const {session,signOut}=useAuth(); const [logoutError,setLogoutError]=useState('');
 const displayName=session?.profile?.full_name||session?.user.email||'';
 const avatarInitial=displayName.trim().charAt(0).toLocaleUpperCase('tr')||'?';
 const logout=async()=>{try{await signOut();onClose();}catch{setLogoutError('Unable to sign out. Please try again.');}};
 const {path}=useRouter(); const ref=useRef<HTMLElement>(null);
 // While the leave dialog is open, Escape and Tab belong to the dialog, not to the mobile sidebar.
 const {pending:leavePending}=usePendingLeave();
 useEffect(()=>{if(!isOpen||leavePending)return; const previous=document.activeElement as HTMLElement; const side=ref.current!; side.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose();} if(e.key==='Tab'){const items=Array.from(side.querySelectorAll<HTMLElement>('a[href],button')).filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  const media=window.matchMedia('(min-width:769px)'); const resize=()=>{if(media.matches)onClose();};
  document.addEventListener('keydown',key);media.addEventListener('change',resize);return()=>{document.removeEventListener('keydown',key);media.removeEventListener('change',resize);previous?.focus();};
 },[isOpen,onClose,leavePending]);
 const nav=[{name:'Home',url:'/',icon:Home,active:path==='/'},{name:'Playbooks',url:'/playbooks',icon:BookOpen,active:path.startsWith('/playbooks')||path.startsWith('/guides')},{name:'Troubleshooting',url:'/troubleshooting',icon:HelpCircle,active:path==='/troubleshooting'},{name:'Create',url:'/create',icon:Plus,active:path.startsWith('/create')}];
 return <>{isOpen&&<div className="sidebar-overlay" onClick={onClose} aria-hidden="true"/>}<aside ref={ref} id="sidebar-navigation" className={`sidebar ${isOpen?'open':''}`} role={isOpen?'dialog':undefined} aria-modal={isOpen||undefined} aria-label="Main navigation"><button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={20}/></button>
 <div className="sidebar-logo-section"><a href="#/" onClick={onClose} className="logo-wrapper" aria-label="Iceberg Playbook Home"><div className="logo-mark">I</div><div className="logo-text"><span className="logo-brand">ICEBERG</span><span className="logo-subbrand">PLAYBOOK</span></div></a></div>
 <nav className="sidebar-nav">{nav.map(({name,url,icon:Icon,active})=><a key={url} href={`#${url}`} onClick={onClose} aria-current={active?'page':undefined} className={`nav-item ${active?'active':''}`}><Icon className="nav-item-icon"/><span>{name}</span></a>)}</nav>
 <div className="sidebar-footer"><a className={`nav-item ${path==='/settings'?'active':''}`} href="#/settings" aria-current={path==='/settings'?'page':undefined} onClick={onClose}><Settings className="nav-item-icon"/>Settings</a><div className="sidebar-profile"><div className="profile-avatar" aria-hidden="true">{avatarInitial}</div><div className="profile-info"><span className="profile-name">{session?.profile?.full_name || session?.user.email}</span><span className="profile-role">{session?.profile?.role || "Internal user"}</span></div><button className="profile-logout" aria-label="Sign out" onClick={()=>guardedAction(logout)}><LogOut size={17}/></button></div>{logoutError&&<p role="alert">{logoutError}</p>}</div></aside></>;
}
