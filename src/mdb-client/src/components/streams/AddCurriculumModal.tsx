import InlineAlert from '../shared/InlineAlert';
import TextField from '@mui/material/TextField';
import './AddCurriculumModal.css';
import Button from '../shared/Button';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { DanceStream } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../shared/Modal';

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

  async function submit(event: FormEvent) {
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
    <Modal title={title} eyebrow={schoolName} description={stream ? `Add a class to ${stream.name}.` : 'A stream is a dance style, such as Salsa On1 or Bachata.'} busy={saving} onClose={onClose} onSubmit={submit}
      actions={<>
        <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : title}</Button>
      </>}>
      
      <TextField fullWidth label={stream ? 'Class name' : 'Stream name'}
        id="curriculum-name" autoFocus required placeholder={stream ? 'e.g. Bachata Silver' : 'e.g. Bachata'} value={name} disabled={saving} onChange={(event) => setName(event.target.value)}
        slotProps={{ htmlInput: { maxLength: stream ? 200 : 100 } }} />
      {stream && <>
        
        <TextField fullWidth label="Level"
        id="curriculum-level" type="number" required value={level} disabled={saving} onChange={(event) => setLevel(event.target.value)} helperText="Decimal levels such as 1.5 are supported. Students enrolled here can access this level and below in this stream."
        slotProps={{ htmlInput: { min: "0", max: "9999.99", step: "0.01" } }} />
        
      </>}
      {error && <InlineAlert>{error}</InlineAlert>}
    </Modal>
  );
}
