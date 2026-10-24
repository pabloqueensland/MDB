import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { School } from '../api';
import { useAuthStore } from '../stores/authStore';

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
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();

    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    <dialog ref={dialog} className="school-modal" aria-labelledby="add-school-title" aria-describedby="add-school-description"
      onCancel={(event) => {
        event.preventDefault();

        if (!isSaving) {
          onClose();
        }
      }}>
      <div className="modal-heading"><span className="section-number">SCHOOL MANAGEMENT</span><button className="modal-close" aria-label="Close add school" onClick={onClose} disabled={isSaving}>×</button></div>
      <h2 id="add-school-title">Add a school</h2>
      <p className="intro" id="add-school-description">Create a new space for a dance community.</p>
      <form onSubmit={submit}>
        <label htmlFor="school-name">School name</label>
        <input id="school-name" autoFocus required maxLength={200} placeholder="e.g. Brisbane Salsa" value={name} disabled={isSaving}
          onChange={(event) => {
            setName(event.target.value);

            if (!slugEdited) {
              setSlug(toSlug(event.target.value));
            }
          }} />
        <label htmlFor="school-slug">School slug</label>
        <input id="school-slug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="e.g. brisbane-salsa" aria-describedby="slug-help" value={slug} disabled={isSaving}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value.toLowerCase());
          }} />
        <p id="slug-help" className="field-help">A unique identifier using lowercase letters, numbers and hyphens.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={onClose} disabled={isSaving}>Cancel</button><button className="primary" type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create school'}<span aria-hidden="true">＋</span></button></div>
      </form>
    </dialog>
  );
}
