import './EditMoveModal.css';
import Button from './shared/Button';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { DanceMove } from '../api';
import { useAuthStore } from '../stores/authStore';
import Modal from './shared/Modal';

interface Props {
  move: DanceMove;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditMoveModal({ move, onClose, onSaved }: Props) {
  const token = useAuthStore((state) => state.accessToken);
  const [name, setName] = useState(move.name);
  const [level, setLevel] = useState(String(move.level));
  const [block, setBlock] = useState(move.block ?? '');
  const [videoUrl, setVideoUrl] = useState(move.videoUrl);
  const [description, setDescription] = useState(move.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!token || busy) {
      return;
    }

    if (block.trim().split(/\s+/).filter(Boolean).length > 20) {
      setError('Block must contain at most 20 words.');

      return;
    }

    setBusy(true);
    setError('');

    try {
      await api.updateMove(move.id, { name: name.trim(), level: Number(level), block: block.trim() || null, videoUrl: videoUrl.trim(), description: description.trim() || null }, token);

      if (useAuthStore.getState().accessToken === token) {
        onSaved();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save move.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit move" description={`${move.schoolName}. Changes apply everywhere this move is used. Class assignments and class levels stay the same.`} busy={busy} onClose={onClose}>
      <form onSubmit={(event) => { void save(event); }}>
        <fieldset disabled={busy} className="move-edit-fields">
          <label htmlFor="edit-move-name">Move name</label>
          <input id="edit-move-name" required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
          <label htmlFor="edit-move-level">Move level</label>
          <input id="edit-move-level" type="number" required min="0" max="9999.99" step="0.01" value={level} onChange={(event) => setLevel(event.target.value)} />
          <label htmlFor="edit-move-block">Block (up to 20 words)</label>
          <input id="edit-move-block" value={block} onChange={(event) => setBlock(event.target.value)} />
          <label htmlFor="edit-move-video">Video URL</label>
          <input id="edit-move-video" type="url" maxLength={2048} value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
          <label htmlFor="edit-move-description">Description</label>
          <textarea id="edit-move-description" maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
