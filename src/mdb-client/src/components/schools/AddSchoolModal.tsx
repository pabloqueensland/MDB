import InlineAlert from '../shared/InlineAlert';
import TextField from '@mui/material/TextField';
import Modal from '../shared/Modal';
import './AddSchoolModal.css';
import Button from '../shared/Button';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { School } from '../../api';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  onClose: () => void;
  onCreated: (school: School) => void;
}

function toSlug(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '');
}

export default function AddSchoolModal({ onClose, onCreated }: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!accessToken || isSaving) {
      return;
    }

    setError(null);

    if (!name.trim()) {
      setError('Enter a school name.');

      return;
    }

    setIsSaving(true);

    try {
      const school = await api.createSchool({ name: name.trim(), slug }, accessToken);
      onCreated(school);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the school.');
      setIsSaving(false);
    }
  }

  return (
    <Modal title="Add a school" eyebrow="SCHOOL MANAGEMENT" description="Create a new space for a dance community."
      busy={isSaving} onClose={onClose} onSubmit={submit}
      actions={<>
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create school'}<span aria-hidden="true">＋</span></Button>
      </>}>
      
      <TextField fullWidth label="School name"
        id="school-name" autoFocus required placeholder="e.g. Brisbane Salsa" value={name} disabled={isSaving} onChange={(event) => {
          setName(event.target.value);

          if (!slugEdited) {
            setSlug(toSlug(event.target.value));
          }
        }}
        slotProps={{ htmlInput: { maxLength: 200 } }} />
      
      <TextField fullWidth label="School slug"
        id="school-slug" required placeholder="e.g. brisbane-salsa" helperText="A unique identifier using lowercase letters, numbers and hyphens." value={slug} disabled={isSaving} onChange={(event) => {
          setSlugEdited(true);
          setSlug(event.target.value.toLowerCase());
        }}
        slotProps={{ htmlInput: { maxLength: 100, pattern: "[a-z0-9]+(-[a-z0-9]+)*" } }} />
      
      {error && <InlineAlert>{error}</InlineAlert>}
    </Modal>
  );
}
