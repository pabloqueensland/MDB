import InlineAlert from '../shared/InlineAlert';
import './MemberDetailsModal.css';
import { useState } from 'react';
import type { FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { api } from '../../api';
import type { Member, SchoolRole } from '../../api';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

const roleLabels: Record<SchoolRole, string> = {
  Student: 'Student',
  Instructor: 'Teacher',
  SchoolAdmin: 'Studio admin',
  SchoolManager: 'School manager',
};

export default function MemberDetailsModal({ member, onClose, onSaved }: Props) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const [role, setRole] = useState<SchoolRole>(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isPlatform = user?.roles.includes('PlatformAdmin') ?? false;
  const callerRole = user?.memberships.find((item) => item.schoolId === member.schoolId)?.role;
  const isManager = callerRole === 'SchoolManager';
  const canEdit = isPlatform || (isManager && member.role !== 'SchoolManager')
    || (callerRole === 'SchoolAdmin' && member.role !== 'SchoolManager' && member.role !== 'SchoolAdmin');
  const allowedRoles: SchoolRole[] = ['Student', 'Instructor'];

  if (isPlatform || isManager) {
    allowedRoles.push('SchoolAdmin');
  }

  if (isPlatform) {
    allowedRoles.push('SchoolManager');
  }

  // Read-only details still show the current role even when the caller cannot assign it.
  const options = allowedRoles.includes(member.role) ? allowedRoles : [...allowedRoles, member.role];

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!token || saving || !canEdit || role === member.role) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.assignMembership({ schoolId: member.schoolId, email: member.email, role }, token);

      if (useAuthStore.getState().accessToken === token) {
        onSaved();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update school role.');
      setSaving(false);
    }
  }

  return (
    <Modal title={member.name || 'Member details'} eyebrow="SCHOOL TEAM" busy={saving} onClose={onClose}
      onSubmit={submit}
      actions={<>
        <Button variant="secondary" disabled={saving} onClick={onClose}>Close</Button>
        {canEdit && <Button type="submit" disabled={saving || role === member.role}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>}
      </>}>
      <dl className="member-details">
        <div><dt>Email</dt><dd>{member.email}</dd></div>
        <div><dt>School</dt><dd>{member.schoolName}</dd></div>
      </dl>
      <TextField select fullWidth label="School role" value={role} disabled={saving || !canEdit}
        onChange={(event) => setRole(event.target.value as SchoolRole)}
        helperText={canEdit ? 'Changes apply only to this school.' : 'You do not have permission to change this member’s school role.'}>
        {options.map((option) => <MenuItem key={option} value={option}>{roleLabels[option]}</MenuItem>)}
      </TextField>
      {error && <InlineAlert>{error}</InlineAlert>}
    </Modal>
  );
}
