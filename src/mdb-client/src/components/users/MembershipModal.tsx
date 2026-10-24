import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Modal from '../shared/Modal';
import './MembershipModal.css';
import Button from '../shared/Button';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { School, SchoolRole } from '../../api';
import { useAuthStore } from '../../stores/authStore';

interface Props { schools: School[]; initialRole: SchoolRole; onClose: () => void; onSaved: () => void }

export default function MembershipModal({ schools, initialRole, onClose, onSaved }: Props) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SchoolRole>(initialRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isPlatform = user?.roles.includes('PlatformAdmin') ?? false;
  const isManager = user?.memberships?.some((item) => item.schoolId === schoolId && item.role === 'SchoolManager');

  async function submit(event: FormEvent) {
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

  return <Modal title="Assign school role" eyebrow="SCHOOL TEAM"
    description="Add a registered user to a school, or update their existing role."
    busy={saving} onClose={onClose} onSubmit={submit}
    actions={<>
      <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving || !schoolId}>{saving ? 'Saving…' : 'Save membership'}</Button>
    </>}>
    
    <TextField select fullWidth label="School"
        id="member-school" value={schoolId} required disabled={saving} onChange={(event) => { setSchoolId(event.target.value); setRole(initialRole); }}>{schools.map((school) => <MenuItem key={school.id} value={school.id}>{school.name}</MenuItem>)}</TextField>
    
    <TextField fullWidth label="User email"
        autoFocus id="member-email" type="email" required value={email} disabled={saving} onChange={(event) => setEmail(event.target.value)} placeholder="Their registered email" />
    
    <TextField select fullWidth label="School role"
        id="member-role" value={role} disabled={saving} onChange={(event) => setRole(event.target.value as SchoolRole)}>
      <MenuItem value="Student">Student</MenuItem><MenuItem value="Instructor">Teacher</MenuItem>
      {(isPlatform || isManager) && <MenuItem value="SchoolAdmin">Studio admin</MenuItem>}
      {isPlatform && <MenuItem value="SchoolManager">School manager</MenuItem>}
    </TextField>
    {error && <p className="error" role="alert">{error}</p>}
  </Modal>;
}
