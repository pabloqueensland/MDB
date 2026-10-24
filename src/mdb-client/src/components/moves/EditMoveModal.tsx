import InlineAlert from '../shared/InlineAlert';
import './EditMoveModal.css';
import Button from '../shared/Button';
import { useId, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { DanceMove } from '../../api';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  move: DanceMove;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditMoveModal({ move, onClose, onSaved }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const token = useAuthStore((state) => state.accessToken);
  const [name, setName] = useState(move.name);
  const [level, setLevel] = useState(String(move.level));
  const [block, setBlock] = useState(move.block ?? '');
  const [videoUrl, setVideoUrl] = useState(move.videoUrl);
  const [description, setDescription] = useState(move.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const blockWords = block.trim().split(/\s+/).filter(Boolean).length;

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!token || busy) {
      return;
    }

    if (blockWords > 20) {
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
    <Dialog open fullWidth maxWidth="sm" className="edit-move-dialog"
      aria-labelledby={titleId} aria-describedby={descriptionId}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      slotProps={{ paper: { component: 'form', onSubmit: (event: FormEvent) => { void save(event); } } }}>
      <DialogTitle component="div" className="edit-move-heading">
        <h2 id={titleId}>Edit move</h2>
        <Button variant="ghost" size="icon" aria-label="Close edit move" disabled={busy} onClick={onClose}>×</Button>
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText id={descriptionId} className="edit-move-description">
          {move.schoolName}. Changes apply everywhere this move is used. Class assignments and class levels stay the same.
        </DialogContentText>
        <fieldset disabled={busy} className="move-edit-fields" aria-busy={busy}>
          <TextField id="edit-move-name" label="Move name" autoFocus required fullWidth disabled={busy}
            value={name} onChange={(event) => setName(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }} />

          <TextField id="edit-move-level" label="Move level" type="number" required fullWidth disabled={busy}
            value={level} onChange={(event) => setLevel(event.target.value)}
            helperText="Decimal levels such as 1.5 are supported."
            slotProps={{ htmlInput: { min: 0, max: 9999.99, step: 0.01 } }} />

          <TextField id="edit-move-block" label="Block" fullWidth disabled={busy}
            value={block} onChange={(event) => setBlock(event.target.value)}
            error={blockWords > 20} helperText={`${blockWords} / 20 words`} />

          <TextField id="edit-move-video" label="Video URL" type="url" fullWidth disabled={busy}
            value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)}
            helperText="Optional. Enter the full HTTP or HTTPS video URL."
            slotProps={{ htmlInput: { maxLength: 2048 } }} />

          <TextField id="edit-move-description" label="Description" multiline minRows={3} fullWidth disabled={busy}
            value={description} onChange={(event) => setDescription(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 4000 } }} />
        </fieldset>
        {error && <InlineAlert>{error}</InlineAlert>}
      </DialogContent>
      <DialogActions className="edit-move-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </DialogActions>
    </Dialog>
  );
}
