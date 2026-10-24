import Navigation from './Navigation';
import Footer from '../shared/Footer';
import './Dashboard.css';
import Button from '../shared/Button';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SportsGymnasticsOutlinedIcon from '@mui/icons-material/SportsGymnasticsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../api';
import SchoolManagement from '../schools/SchoolManagement';
import PeopleManagement from '../users/PeopleManagement';
import UsersManagement from '../users/UsersManagement';
import DashboardHome from './DashboardHome';
import MovesLibrary from '../moves/MovesLibrary';
import StreamsManagement from '../streams/StreamsManagement';

type Page = 'dashboard' | 'schools' | 'teachers' | 'students' | 'moves' | 'users' | 'streams';

function allowedPages(user: User | null): Page[] {
  if (user?.roles?.includes('PlatformAdmin')) {
    return ['dashboard', 'schools', 'teachers', 'students', 'moves', 'users', 'streams'];
  }

  if (user?.memberships?.some((membership) => membership.role === 'SchoolAdmin' || membership.role === 'SchoolManager')) {
    return ['dashboard', 'teachers', 'students', 'moves', 'streams'];
  }

  return ['dashboard', 'moves'];
}

const menu: { page: Page; label: string; icon: ReactNode; description: string }[] = [
  { page: 'schools', label: 'Schools', icon: <DomainOutlinedIcon fontSize="inherit" />, description: 'Create and manage schools across MDB.' },
  { page: 'streams', label: 'Streams & classes', icon: <AccountTreeOutlinedIcon fontSize="inherit" />, description: 'Manage dance styles and their class levels.' },
  { page: 'teachers', label: 'Teachers', icon: <CoPresentOutlinedIcon fontSize="inherit" />, description: 'View teachers in the schools you manage.' },
  { page: 'students', label: 'Students', icon: <SchoolOutlinedIcon fontSize="inherit" />, description: 'View students in the schools you manage.' },
  { page: 'moves', label: 'Moves', icon: <SportsGymnasticsOutlinedIcon fontSize="inherit" />, description: 'Browse the moves taught at your schools.' },
  { page: 'users', label: 'All users', icon: <GroupsOutlinedIcon fontSize="inherit" />, description: 'View every account, including users without a school.' },
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
  const visibleMenu = menu.filter((item) => allowed.includes(item.page));
  const cards = visibleMenu.map((item) => ({
    title: item.label,
    description: item.description,
    icon: item.icon,
    href: `#/${item.page}`,
    linkLabel: `Open ${item.label.toLowerCase()}`,
  }));

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
    <Navigation items={visibleMenu} page={page} email={user.email} isPlatform={isPlatform} onLogout={logout} />
    <main className="dashboard-main">
      {adminSession && <div className="impersonation-banner" role="status"><div><strong>Viewing as {user.email}</strong><span>Actions use this account’s permissions and change real data. Session lasts up to 15 minutes.</span></div><Button variant="secondary" disabled={impersonationBusy} onClick={() => { void stopImpersonating(); }}>{impersonationBusy ? 'Returning…' : 'Return to my account'}</Button></div>}
      {impersonationError && <p className="error" role="alert">{impersonationError}</p>}
      <div className="workspace-content">
        {page === 'dashboard' && <DashboardHome cards={cards} />}
        {isPlatform && page === 'schools' && <SchoolManagement />}
        {isPlatform && page === 'users' && <UsersManagement />}
        {allowed.includes(page) && (page === 'teachers' || page === 'students') && <PeopleManagement key={page} role={page === 'teachers' ? 'Instructor' : 'Student'} />}
        {page === 'moves' && <MovesLibrary />}
        {allowed.includes('streams') && page === 'streams' && <StreamsManagement />}
      </div>
      <Footer />
    </main>
  </div>;
}
