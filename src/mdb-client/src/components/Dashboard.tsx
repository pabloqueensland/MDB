import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../api';
import SchoolManagement from './SchoolManagement';
import PeopleManagement from './PeopleManagement';
import UsersManagement from './UsersManagement';

type Page = 'dashboard' | 'schools' | 'teachers' | 'students' | 'moves' | 'users';

function allowedPages(user: User | null): Page[] {
  if (user?.roles?.includes('PlatformAdmin')) {
    return ['dashboard', 'schools', 'teachers', 'students', 'moves', 'users'];
  }
  if (user?.memberships?.some((membership) => membership.role === 'SchoolAdmin' || membership.role === 'SchoolManager')) {
    return ['dashboard', 'teachers', 'students', 'moves'];
  }
  return ['dashboard', 'moves'];
}

const menu: { page: Page; label: string; icon: string }[] = [
  { page: 'schools', label: 'Schools', icon: '▤' },
  { page: 'teachers', label: 'Teachers', icon: '◇' },
  { page: 'students', label: 'Students', icon: '◉' },
  { page: 'moves', label: 'Moves', icon: '✳' },
  { page: 'users', label: 'All users', icon: '◌' },
];

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const adminSession = useAuthStore((state) => state.adminSession);
  const stopImpersonating = useAuthStore((state) => state.stopImpersonating);
  const impersonationBusy = useAuthStore((state) => state.impersonationBusy);
  const impersonationError = useAuthStore((state) => state.impersonationError);
  const [page, setPage] = useState<Page>('dashboard');
  const isPlatform = user?.roles?.includes('PlatformAdmin') ?? false;
  const allowed = allowedPages(user);

  useEffect(() => {
    window.history.replaceState(null, '', '#/dashboard');
    setPage('dashboard');
    function navigate() {
      const route = window.location.hash.slice(2) as Page;
      if (allowedPages(user).includes(route)) {
        setPage(route);
      } else {
        window.history.replaceState(null, '', '#/dashboard');
        setPage('dashboard');
      }
    }
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, [user]);

  if (!user) {
    return null;
  }

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <a href="#/dashboard" className="brand"><span className="brand-mark">m</span> MDB</a>
      <p className="sidebar-label">YOUR WORKSPACE</p>
      <nav aria-label="Main navigation">
        {menu.filter((item) => allowed.includes(item.page)).map((item) => <a key={item.page} href={`#/${item.page}`} className={page === item.page ? 'selected' : ''} aria-current={page === item.page ? 'page' : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}</a>)}
      </nav>
      <div className="sidebar-account"><span className="sidebar-label">SIGNED IN AS</span><strong>{user.email}</strong>{isPlatform && <span className="role-pill">Platform admin</span>}<button onClick={logout}>Sign out <span aria-hidden="true">↗</span></button></div>
    </aside>
    <main className="dashboard-main">
      <header className="workspace-header"><a href="#/dashboard">MDB / YOUR WORKSPACE</a><span>MOVE. DANCE. BECOME.</span></header>
      {adminSession && <div className="impersonation-banner" role="status"><div><strong>Viewing as {user.email}</strong><span>Actions use this account’s permissions and change real data. Session lasts up to 15 minutes.</span></div><button className="secondary" disabled={impersonationBusy} onClick={() => { void stopImpersonating(); }}>{impersonationBusy ? 'Returning…' : 'Return to my account'}</button></div>}
      {impersonationError && <p className="error" role="alert">{impersonationError}</p>}
      <div className="workspace-content">
        {page === 'dashboard' && <section aria-labelledby="dashboard-title"><span className="section-number">YOUR NEXT CHAPTER</span><h1 id="dashboard-title" className="page-title">Welcome to your dashboard.</h1><p className="page-description">Your community. Your practice. Your next move.</p><div className="dashboard-cards">
          {menu.filter((item) => allowed.includes(item.page)).map((item) => <a key={item.page} className="management-card" href={`#/${item.page}`}><span className="card-icon" aria-hidden="true">{item.icon}</span><h2>{item.label}</h2><p>{item.page === 'schools' ? 'Create and manage schools across MDB.' : item.page === 'moves' ? 'Your dance move library will live here.' : `View ${item.label.toLowerCase()} in the schools you manage.`}</p><span className="card-link">Open {item.label.toLowerCase()} <span aria-hidden="true">↗</span></span></a>)}
        </div></section>}
        {isPlatform && page === 'schools' && <SchoolManagement />}
        {isPlatform && page === 'users' && <UsersManagement />}
        {allowed.includes(page) && (page === 'teachers' || page === 'students') && <PeopleManagement key={page} role={page === 'teachers' ? 'Instructor' : 'Student'} />}
        {page === 'moves' && <section aria-labelledby="moves-title"><span className="section-number">YOUR PRACTICE</span><h1 id="moves-title" className="page-title">Moves</h1><p className="page-description">A home for the steps you’re learning.</p><div className="dashboard-welcome"><h2>The move library is coming next.</h2><p>Videos and progress tracking will appear here once the library is added.</p></div></section>}
      </div>
      <footer className="main-footer"><span>MADE FOR YOUR NEXT MOVE.</span><span>MDB / 2026</span></footer>
    </main>
  </div>;
}
