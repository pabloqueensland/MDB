import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { DanceStream } from '../api';
import { useAuthStore } from '../stores/authStore';
import Modal from './shared/Modal';

interface Props {
  schoolId: string;
  schoolName: string;
  stream: DanceStream | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function AddCurriculumModal({ schoolId, schoolName, stream, onClose, onSaved }: Props) {
  const token = useAuthStore((state) => state.accessToken);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = stream ? 'Add class' : 'Add stream';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || saving) {
      return;
    }

    if (!name.trim()) {
      setError('Enter a name.');

      return;
    }

    setSaving(true);
    setError('');

    try {
      if (stream) {
        await api.createClass(schoolId, stream.id, name.trim(), Number(level), token);
      } else {
        await api.createStream(schoolId, name.trim(), token);
      }

      onSaved(`${name.trim()} was created successfully.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <Modal title={title} eyebrow={schoolName} description={stream ? `Add a class to ${stream.name}.` : 'A stream is a dance style, such as Salsa On1 or Bachata.'} busy={saving} onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor="curriculum-name">{stream ? 'Class name' : 'Stream name'}</label>
        <input id="curriculum-name" autoFocus required maxLength={stream ? 200 : 100}
          placeholder={stream ? 'e.g. Bachata Silver' : 'e.g. Bachata'} value={name} disabled={saving}
          onChange={(event) => setName(event.target.value)} />
        {stream && <>
          <label htmlFor="curriculum-level">Level</label>
          <input id="curriculum-level" type="number" min="0" max="9999.99" step="0.01" required value={level} disabled={saving} onChange={(event) => setLevel(event.target.value)} aria-describedby="curriculum-level-help" />
          <p className="field-help" id="curriculum-level-help">Decimal levels such as 1.5 are supported. Students enrolled here can access this level and below in this stream.</p>
        </>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" type="button" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : title}</button>
        </div>
      </form>
    </Modal>
  );
}
