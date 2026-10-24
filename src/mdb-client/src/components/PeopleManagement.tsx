import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Member, School, SchoolRole } from '../api';
import { useAuthStore } from '../stores/authStore';
import MembershipModal from './MembershipModal';
import ImpersonateButton from './ImpersonateButton';
import PageHeader from './shared/PageHeader';
import EnrolmentsModal from './EnrolmentsModal';
import SearchInput from './shared/SearchInput';

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
  const [enrolStudent, setEnrolStudent] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const title = role === 'Instructor' ? 'Teachers' : 'Students';
  const adminSession = useAuthStore((state) => state.adminSession);
  const canImpersonate = user?.roles.includes('PlatformAdmin') && !adminSession;

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

  function table(items: Member[], empty: string) {
    if (items.length === 0) {
      return <p className="panel-message">{empty}</p>;
    }

    return <div className="school-table-scroll"><table className="school-table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">School</th><th scope="col">Role</th><th scope="col">Actions</th></tr></thead><tbody>{items.map((member) => <tr key={`${member.schoolId}-${member.userId}`}><td>{member.name || member.email}</td><td>{member.email}</td><td>{member.schoolName}</td><td>{roleLabel(member.role)}</td><td><div className="row-actions">{member.role === 'Student' && <button className="secondary" onClick={() => setEnrolStudent(member)}>Enrolments</button>}{canImpersonate && <ImpersonateButton userId={member.userId} />}</div></td></tr>)}</tbody></table></div>;
  }

  return <section aria-labelledby="people-title">
    <PageHeader
      titleId="people-title"
      eyebrow="YOUR COMMUNITY"
      title={title}
      description={user?.roles.includes('PlatformAdmin') ? 'Memberships across all schools.' : 'Memberships in the schools you administer.'}
      actions={<button className="primary add-school-button" disabled={loading || !!error || schools.length === 0} onClick={() => { setNotice(''); setOpen(true); }}>Assign school role <span aria-hidden="true">＋</span></button>}
    />
    {notice && <p className="created-message" role="status">{notice}</p>}
    <SearchInput label={`Search ${title.toLowerCase()}`} value={search} onChange={setSearch}
      placeholder="Search by name or email" disabled={loading} />
    {error ? <div><p className="error" role="alert">{error}</p><button className="secondary" onClick={() => setRevision((value) => value + 1)}>Try again</button></div>
      : loading ? <p className="panel-message" role="status">Loading memberships…</p>
        : <><div className="schools-panel"><div className="schools-panel-heading"><h2>{title}</h2><span role="status">{visibleMembers.length} of {roleMembers.length}</span></div>{table(visibleMembers, term ? `No ${title.toLowerCase()} match your search.` : `No ${title.toLowerCase()} have been assigned yet.`)}</div>
          <div className="schools-panel team-panel"><div className="schools-panel-heading"><h2>School leadership</h2></div>{table(members.filter((member) => member.role === 'SchoolManager' || member.role === 'SchoolAdmin'), 'No school managers or studio admins have been assigned yet.')}</div>
          {schools.length === 0 && <p className="field-help team-help">Create a school from Schools before assigning users.</p>}</>}
    {open && <MembershipModal schools={schools} initialRole={role} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setNotice('School membership saved.'); setRevision((value) => value + 1); }} />}
    {enrolStudent && <EnrolmentsModal key={`${enrolStudent.schoolId}-${enrolStudent.userId}`} student={enrolStudent} onClose={() => setEnrolStudent(null)} />}
  </section>;
}

function roleLabel(role: SchoolRole) {
  return { Student: 'Student', Instructor: 'Teacher', SchoolAdmin: 'Studio admin', SchoolManager: 'School manager' }[role];
}
