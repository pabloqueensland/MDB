import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import './UsersManagement.css';
import DataTable, { TableScroll } from '../shared/DataTable';
import ManagementPanel, { PanelHeading } from '../shared/ManagementPanel';
import Button from '../shared/Button';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { PlatformUser } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import ImpersonateButton from './ImpersonateButton';
import PageHeader from '../shared/PageHeader';
import SearchInput from '../shared/SearchInput';

export default function UsersManagement() {
  const token = useAuthStore((state) => state.accessToken);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const people = await api.listUsers(token, controller.signal);

        if (!controller.signal.aborted) {
          setUsers(people);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load users.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [token, attempt]);

  const visible = users.filter((user) => `${user.name} ${user.email} ${user.roles.join(' ')} ${user.memberships.map((m) => `${m.schoolName} ${m.role}`).join(' ')}`.toLowerCase().includes(filter.toLowerCase()));

  return <section aria-labelledby="users-title"><PageHeader titleId="users-title" eyebrow="PLATFORM ADMIN" title="All users" description="Every account, including platform admins and users without a school. View as a user to explore their access." />
    <SearchInput label="Search users" value={filter} onChange={setFilter} placeholder="Search names, emails, schools or roles" />
    {loading ? <p role="status">Loading users…</p> : error ? <><p className="error" role="alert">{error}</p><Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Try again</Button></>
      : <ManagementPanel><PanelHeading><h2>Users</h2><span>{visible.length} accounts</span></PanelHeading><TableScroll><DataTable><TableHead><TableRow><TableCell scope="col">User</TableCell><TableCell scope="col">Access</TableCell><TableCell scope="col">Action</TableCell></TableRow></TableHead><TableBody>{visible.map((user) => <TableRow key={user.id}><TableCell><strong>{user.name}</strong><div className="user-email table-mobile-hidden">{user.email}</div></TableCell><TableCell>{user.roles.length > 0 && <div>{user.roles.join(', ')}</div>}{user.memberships.map((membership) => <div key={membership.schoolId}><span className="table-mobile-hidden">{membership.schoolName} · </span>{membership.role}</div>)}{user.roles.length === 0 && user.memberships.length === 0 && <span className="unassigned-badge">Unassigned</span>}</TableCell><TableCell><ImpersonateButton userId={user.id} /></TableCell></TableRow>)}</TableBody></DataTable>{visible.length === 0 && <p className="panel-message">No users match your search.</p>}</TableScroll></ManagementPanel>}
  </section>;
}
