import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import './PeopleManagement.css';
import DataTable, { TableScroll } from '../shared/DataTable';
import ManagementPanel, { PanelHeading } from '../shared/ManagementPanel';
import Button from '../shared/Button';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Member, School, SchoolRole } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import MembershipModal from './MembershipModal';
import ImpersonateButton from './ImpersonateButton';
import PageHeader from '../shared/PageHeader';
import StudentDetailsModal from './StudentDetailsModal';
import SearchInput from '../shared/SearchInput';

export default function PeopleManagement({ role }: { role: 'Instructor' | 'Student' }) {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [members, setMembers] = useState<Member[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const title = role === 'Instructor' ? 'Teachers' : 'Students';
  const adminSession = useAuthStore((state) => state.adminSession);
  const isPlatform = user?.roles.includes('PlatformAdmin') ?? false;
  const canImpersonate = isPlatform && !adminSession;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token || !user) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [people, available] = await Promise.all([
          api.listMembers(token, undefined, controller.signal),
          user.roles.includes('PlatformAdmin') ? api.listSchools(token, controller.signal)
            : Promise.resolve((user.memberships ?? []).filter((item) => item.role === 'SchoolManager' || item.role === 'SchoolAdmin')
              .map((item) => ({ id: item.schoolId, name: item.schoolName, slug: '' }))),
        ]);

        if (!controller.signal.aborted) {
          setMembers(people);
          setSchools(available);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load members.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [token, user, revision]);

  const term = search.trim().toLowerCase();
  const roleMembers = members.filter((member) => member.role === role);
  const visibleMembers = roleMembers.filter((member) => `${member.name ?? ''} ${member.email}`.toLowerCase().includes(term));

  function table(items: Member[], empty: string, showRole = false) {
    if (items.length === 0) {
      return <p className="panel-message">{empty}</p>;
    }

    return (
      <TableScroll>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell scope="col">Name</TableCell>
              <TableCell scope="col" className="table-mobile-hidden">Email</TableCell>
              {isPlatform && <TableCell scope="col" className="table-mobile-hidden">School</TableCell>}
              {showRole && <TableCell scope="col">Role</TableCell>}
              <TableCell scope="col">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((member) => (
              <TableRow key={`${member.schoolId}-${member.userId}`}>
                <TableCell>{member.name || member.email}</TableCell>
                <TableCell className="table-mobile-hidden">{member.email}</TableCell>
                {isPlatform && <TableCell className="table-mobile-hidden">{member.schoolName}</TableCell>}
                {showRole && <TableCell>{roleLabel(member.role)}</TableCell>}
                <TableCell>
                  <div className="row-actions">
                    {member.role === 'Student' && <Button variant="secondary" onClick={() => setSelectedStudent(member)}>View</Button>}
                    {canImpersonate && <ImpersonateButton userId={member.userId} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </TableScroll>
    );
  }

  return <section aria-labelledby="people-title">
    <PageHeader
      titleId="people-title"
      eyebrow="YOUR COMMUNITY"
      title={title}
      description={user?.roles.includes('PlatformAdmin') ? 'Memberships across all schools.' : 'Memberships in the schools you administer.'}
      actions={<Button className="add-school-button" disabled={loading || !!error || schools.length === 0} onClick={() => { setNotice(''); setOpen(true); }}>Assign school role <span aria-hidden="true">＋</span></Button>}
    />
    {notice && <p className="created-message" role="status">{notice}</p>}
    <SearchInput label={`Search ${title.toLowerCase()}`} value={search} onChange={setSearch}
      placeholder="Search by name or email" disabled={loading} />
    {error ? <div><p className="error" role="alert">{error}</p><Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>Try again</Button></div>
      : loading ? <p className="panel-message" role="status">Loading memberships…</p>
        : <><ManagementPanel><PanelHeading><h2>{title}</h2><span role="status">{visibleMembers.length} of {roleMembers.length}</span></PanelHeading>{table(visibleMembers, term ? `No ${title.toLowerCase()} match your search.` : `No ${title.toLowerCase()} have been assigned yet.`)}</ManagementPanel>
          <ManagementPanel className="team-panel"><PanelHeading><h2>School leadership</h2></PanelHeading>{table(members.filter((member) => member.role === 'SchoolManager' || member.role === 'SchoolAdmin'), 'No school managers or studio admins have been assigned yet.', true)}</ManagementPanel>
          {schools.length === 0 && <p className="field-help team-help">Create a school from Schools before assigning users.</p>}</>}
    {open && <MembershipModal schools={schools} initialRole={role} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setNotice('School membership saved.'); setRevision((value) => value + 1); }} />}
    {selectedStudent && <StudentDetailsModal key={`${selectedStudent.schoolId}-${selectedStudent.userId}`} student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
  </section>;
}

function roleLabel(role: SchoolRole) {
  return { Student: 'Student', Instructor: 'Teacher', SchoolAdmin: 'Studio admin', SchoolManager: 'School manager' }[role];
}
