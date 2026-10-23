import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { School, SchoolRole } from '../api';
import { useAuthStore } from '../stores/authStore';

interface Props { schools: School[]; initialRole: SchoolRole; onClose: () => void; onSaved: () => void }

export default function MembershipModal({ schools, initialRole, onClose, onSaved }: Props) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const dialog = useRef<HTMLDialogElement>(null);
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SchoolRole>(initialRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isPlatform = user?.roles.includes('PlatformAdmin') ?? false;
  const isManager = user?.memberships?.some((item) => item.schoolId === schoolId && item.role === 'SchoolManager');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.assignMembership({ schoolId, email: email.trim(), role }, token);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save membership.');
      setSaving(false);
    }
  }

  return <dialog ref={dialog} className="school-modal" aria-labelledby="member-title" onCancel={(event) => {
    event.preventDefault();
    if (!saving) {
      onClose();
    }
  }}>
    <div className="modal-heading"><span className="section-number">SCHOOL TEAM</span><button className="modal-close" onClick={onClose} disabled={saving} aria-label="Close membership form">×</button></div>
    <h2 id="member-title">Assign school role</h2>
    <p className="intro">Add a registered user to a school, or update their existing role.</p>
    <form onSubmit={submit}>
      <label htmlFor="member-school">School</label>
      <select id="member-school" value={schoolId} required disabled={saving} onChange={(event) => { setSchoolId(event.target.value); setRole(initialRole); }}>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select>
      <label htmlFor="member-email">User email</label>
      <input autoFocus id="member-email" type="email" required value={email} disabled={saving} onChange={(event) => setEmail(event.target.value)} placeholder="Their registered email" />
      <label htmlFor="member-role">School role</label>
      <select id="member-role" value={role} disabled={saving} onChange={(event) => setRole(event.target.value as SchoolRole)}>
        <option value="Student">Student</option><option value="Instructor">Teacher</option>
        {(isPlatform || isManager) && <option value="SchoolAdmin">Studio admin</option>}
        {isPlatform && <option value="SchoolManager">School manager</option>}
      </select>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="secondary" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving || !schoolId}>{saving ? 'Saving…' : 'Save membership'}</button></div>
    </form>
  </dialog>;
}
