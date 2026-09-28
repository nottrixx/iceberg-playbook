import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { useRouter, usePendingLeave } from './router';

// Page Views
import { Home } from './pages/Home';
import { Playbooks } from './pages/Playbooks';
import { PlaybookDetail } from './pages/PlaybookDetail';
import { IssueDetail } from './pages/IssueDetail';
import { GuideDetail } from './pages/GuideDetail';
import { SOPDetail } from './pages/SOPDetail';
import { Search } from './pages/Search';
import { Troubleshooting } from './pages/Troubleshooting';
import { Create } from './pages/Create';
import { CreateIssue } from './pages/CreateIssue';
import { CreateGuide } from './pages/CreateGuide';
import { CreateSOP } from './pages/CreateSOP';
import { CreatePlaybook } from './pages/CreatePlaybook';
import { Settings } from './pages/Settings';

import { ContentErrorBoundary } from './components/knowledge/ContentErrorBoundary';
import { StorageRecovery } from './components/knowledge/StorageRecovery';
import { StateMessage } from './components/knowledge/ApplicationUI';
import { LeaveDialog } from './components/knowledge/LeaveDialog';
import { checkStorageIntegrity } from './data';
import './product.css';
import { useAuth } from './auth/AuthProvider';
import { LoginPage, ForgotPasswordPage } from './pages/LoginPage';

function App() {
  const [integrity, setIntegrity] = useState(() => checkStorageIntegrity());
  const { session } = useAuth();
  const { path } = useRouter();
  const isAuthPage = path === '/login' || path === '/forgot-password';

  useEffect(() => {
    if (integrity.status === 'corrupted' || integrity.status === 'unavailable') return;
    if (!session && !isAuthPage) window.location.replace('#/login');
    else if (session && isAuthPage) window.location.replace('#/');
  }, [session, isAuthPage, integrity.status]);

  if (integrity.status === 'unavailable') {
    return (
      <div className="editor" style={{ maxWidth: 680, margin: '40px auto', padding: '0 20px' }}>
        <StateMessage
          error
          title="Storage Unavailable"
          action={
            <button type="button" className="btn-secondary" onClick={() => setIntegrity(checkStorageIntegrity())}>
              Retry
            </button>
          }
        >
          Browser local storage could not be accessed. Please check your browser privacy or cookie settings.
        </StateMessage>
      </div>
    );
  }

  if (integrity.status === 'corrupted') {
    return <StorageRecovery integrity={integrity} onRecovered={() => setIntegrity(checkStorageIntegrity())} />;
  }

  if (!session) return path === '/forgot-password' ? <ForgotPasswordPage/> : <LoginPage/>;
  return <WorkspaceApp/>;
}

function WorkspaceApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { path, params } = useRouter();
  const leaveRequest = usePendingLeave();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [path, params.id, params.slug, params.version]);

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderPage = () => {
    switch (path) {
      case '/':
        return <Home onSearchTrigger={setSearchQuery} />;
      case '/playbooks':
        return <Playbooks />;
      case '/playbooks/[slug]':
        return <PlaybookDetail />;
      case '/playbooks/[slug]/issues/[id]':
        return <IssueDetail />;
      case '/playbooks/[slug]/guides/[id]':
        return <GuideDetail />;
      case '/playbooks/[slug]/sops/[id]':
        return <SOPDetail />;
      case '/search':
        return <Search searchQuery={searchQuery} onSearchChange={setSearchQuery} />;
      case '/troubleshooting':
        return <Troubleshooting />;
      case '/create':
        return <Create />;
      case '/create/issue':
        return <CreateIssue />;
      case '/create/guide':
        return <CreateGuide key="create-guide" />;
      case '/guides/[id]/edit':
        // Keyed by the accepted route, not the address bar: a blocked Back briefly changes the address.
        return <CreateGuide key={`edit-${params.id}`} />;
      case '/create/sop':
        return <CreateSOP />;
      case '/create/playbook':
        return <CreatePlaybook />;
      case '/settings':
        return <Settings />;
      default:
        return <Home onSearchTrigger={setSearchQuery} />;
    }
  };

  return (
    <div className={`app-container${path === '/' ? ' home-layout' : ''}`}>
      <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault(); document.getElementById('main-content')?.focus();}}>Skip to content</a>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Layout */}
      <div className="main-layout" ref={scrollRef} inert={sidebarOpen || undefined}>
        {/* Topbar Actions */}
        <Topbar
          onMenuToggle={handleMenuToggle}
        />

        {/* Selected Page Content */}
        <main className="content-container" id="main-content" tabIndex={-1}>
          <ContentErrorBoundary key={`${path}-${params.id || params.slug || ""}`}>{renderPage()}</ContentErrorBoundary>
        </main>
      </div>
      {/* Outside main-layout, which is inert while the mobile sidebar is open. */}
      {leaveRequest.pending && <LeaveDialog onStay={leaveRequest.stay} onLeave={leaveRequest.leave} />}
    </div>
  );
}

export default App;
