import { useEffect, useRef, useSyncExternalStore } from 'react';
import { planHashChange, shouldBlockFileDrop, shouldGuardLinkClick } from './navigationGuard';

export interface RouteState {
  path: string;
  params: { [key: string]: string };
}

export function parseHash(hash: string): RouteState {
  // Normalize hash (remove '#' and leading/trailing slashes)
  let cleanHash = hash.replace(/^#/, '');
  if (!cleanHash.startsWith('/')) {
    cleanHash = '/' + cleanHash;
  }
  // Remove trailing slash if not root
  if (cleanHash.length > 1 && cleanHash.endsWith('/')) {
    cleanHash = cleanHash.slice(0, -1);
  }

  const [routePath, query = ''] = cleanHash.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(query));
  const path = routePath || '/';

  const editMatch = path.match(/^\/guides\/([^/]+)\/edit$/);
  if (editMatch) return { path: '/guides/[id]/edit', params: { id: decodeURIComponent(editMatch[1]) } };

  // 1. Matches: /playbooks/[slug]/issues/[id]
  const issueMatch = path.match(/^\/playbooks\/([^/]+)\/issues\/([^/]+)$/);
  if (issueMatch) {
    return {
      path: '/playbooks/[slug]/issues/[id]',
      params: { slug: issueMatch[1], id: decodeURIComponent(issueMatch[2]) }
    };
  }

  // 2. Matches: /playbooks/[slug]/guides/[id]
  const guideMatch = path.match(/^\/playbooks\/([^/]+)\/guides\/([^/]+)$/);
  if (guideMatch) {
    return {
      path: '/playbooks/[slug]/guides/[id]',
      params: { ...queryParams, slug: guideMatch[1], id: decodeURIComponent(guideMatch[2]) }
    };
  }

  // 3. Matches: /playbooks/[slug]/sops/[id]
  const sopMatch = path.match(/^\/playbooks\/([^/]+)\/sops\/([^/]+)$/);
  if (sopMatch) {
    return {
      path: '/playbooks/[slug]/sops/[id]',
      params: { slug: sopMatch[1], id: decodeURIComponent(sopMatch[2]) }
    };
  }

  // 4. Matches: /playbooks/[slug]
  const playbookMatch = path.match(/^\/playbooks\/([^/]+)$/);
  if (playbookMatch) {
    return {
      path: '/playbooks/[slug]',
      params: { slug: playbookMatch[1] }
    };
  }

  // 5. Exact matches
  const exactPaths = [
    '/login',
    '/forgot-password',
    '/playbooks',
    '/search',
    '/troubleshooting',
    '/create',
    '/create/issue',
    '/create/guide',
    '/create/sop',
    '/create/playbook',
    '/settings'
  ];

  if (exactPaths.includes(path)) {
    return { path, params: queryParams };
  }

  return { path: '/', params: {} };
}

// One shared, accepted route for the whole app. A hash change only becomes the route once the
// unsaved-changes guard lets it through, so a blocked Back never unmounts the open form.
interface AcceptedRoute {
  route: RouteState;
  idx: number;
}

let accepted: AcceptedRoute | null = null;
const routeListeners = new Set<() => void>();
let guard: (() => boolean) | null = null;
let pending: (() => void) | null = null;
const pendingListeners = new Set<() => void>();
// Set right before a navigation the user already confirmed (or a save made); cleared when it lands.
let bypass = false;
// Set while the guard undoes a blocked Back/Forward; the resulting hash change is not a new route.
let expectRevert = false;
let installed = false;

const historyIdx = (): unknown => (window.history.state as { idx?: unknown } | null)?.idx;
const writeIdx = (idx: number) => {
  const state = window.history.state;
  window.history.replaceState(state && typeof state === 'object' ? { ...state, idx } : { idx }, '');
};

function currentRoute(): AcceptedRoute {
  if (!accepted) {
    // After a reload or a Back/Forward into the app the entry keeps its position; never reset it.
    const stored = historyIdx();
    const idx = typeof stored === 'number' ? stored : 0;
    if (typeof stored !== 'number') writeIdx(idx);
    accepted = { route: parseHash(window.location.hash), idx };
  }
  return accepted;
}

const isDirty = () => !!guard?.();

function setPending(action: (() => void) | null) {
  pending = action;
  pendingListeners.forEach(listener => listener());
}

// Only one leave question at a time; the first request stays the one being asked.
function requestLeave(action: () => void) {
  if (!pending) setPending(action);
}

function go(path: string, force: boolean) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (target === window.location.hash) return;
  if (!force && isDirty()) {
    requestLeave(() => go(target, true));
    return;
  }
  if (force) bypass = true;
  window.location.hash = target;
}

function handleHashChange() {
  const newIdx = historyIdx();
  const plan = planHashChange({ guardActive: isDirty(), bypass, expectRevert, currentIdx: currentRoute().idx, newIdx });
  switch (plan.type) {
    case 'ignore-revert':
      expectRevert = false;
      return;
    case 'accept': {
      bypass = false;
      const idx = typeof newIdx === 'number' ? newIdx : currentRoute().idx + 1;
      if (typeof newIdx !== 'number') writeIdx(idx);
      accepted = { route: parseHash(window.location.hash), idx };
      routeListeners.forEach(listener => listener());
      return;
    }
    case 'block-traverse':
      expectRevert = true;
      window.history.go(-plan.delta);
      requestLeave(() => { bypass = true; window.history.go(plan.delta); });
      return;
    case 'block-push': {
      const target = window.location.hash;
      expectRevert = true;
      window.history.back();
      requestLeave(() => { bypass = true; window.location.hash = target; });
      return;
    }
  }
}

function handleLinkClick(event: MouseEvent) {
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  const click = {
    button: event.button, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey,
    defaultPrevented: event.defaultPrevented, href, target: anchor.getAttribute('target'), download: anchor.hasAttribute('download'),
  };
  if (!href || !shouldGuardLinkClick(click, window.location.hash) || !isDirty()) return;
  event.preventDefault();
  requestLeave(() => go(href, true));
}

function handleFileDrag(event: DragEvent) {
  if (!shouldBlockFileDrop({ defaultPrevented: event.defaultPrevented, types: Array.from(event.dataTransfer?.types ?? []) })) return;
  event.preventDefault();
  if (event.type === 'dragover' && event.dataTransfer) event.dataTransfer.dropEffect = 'none';
}

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener('hashchange', handleHashChange);
  // Bubble phase: React's own click handlers (for example the skip link) have already run.
  document.addEventListener('click', handleLinkClick);
  window.addEventListener('dragover', handleFileDrag);
  window.addEventListener('drop', handleFileDrag);
}

function subscribeRoute(listener: () => void) {
  install();
  routeListeners.add(listener);
  return () => { routeListeners.delete(listener); };
}

function subscribePending(listener: () => void) {
  pendingListeners.add(listener);
  return () => { pendingListeners.delete(listener); };
}

// force skips the unsaved-changes question, for the redirect after a successful save.
function navigate(path: string, options?: { force?: boolean }) {
  go(path, !!options?.force);
}

// Runs a non-navigation exit (Sign out) after the same unsaved-changes question.
export function guardedAction(action: () => void) {
  if (isDirty()) requestLeave(action);
  else action();
}

// Registers the open form's unsaved state for in-app navigation and for closing or reloading the tab.
export function useLeaveGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; });
  useEffect(() => {
    const check = () => dirtyRef.current;
    guard = check;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!check()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      if (guard === check) {
        guard = null;
        setPending(null);
      }
    };
  }, []);
}

export function usePendingLeave() {
  const hasPending = useSyncExternalStore(subscribePending, () => pending !== null);
  const stay = () => setPending(null);
  const leave = () => {
    const action = pending;
    setPending(null);
    action?.();
  };
  return { pending: hasPending, stay, leave };
}

export function useRouter() {
  const { route } = useSyncExternalStore(subscribeRoute, currentRoute);
  return {
    path: route.path,
    params: route.params,
    navigate
  };
}
