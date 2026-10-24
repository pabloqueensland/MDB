import './Modal.css';
import Button from './Button';
import { useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';

interface ModalProps {
  title: string;
  description?: string;
  eyebrow?: string;
  busy?: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  onSubmit?: (event: FormEvent) => void;
}

export default function Modal({ title, description, eyebrow, busy = false, className = '', onClose, children, actions, onSubmit }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog open maxWidth={false} className="mdb-modal" aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      slotProps={{ paper: {
        className: `school-modal ${className}`.trim(),
        ...(onSubmit ? { component: 'form', onSubmit } : {}),
      } }}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}>
      <DialogTitle component="div">
        <div className="modal-heading">
          <div>
            {eyebrow && <span className="section-number">{eyebrow}</span>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label={`Close ${title.toLowerCase()}`} disabled={busy} onClick={onClose}>×</Button>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        {description && <DialogContentText className="modal-description" id={descriptionId}>{description}</DialogContentText>}
        {children}
      </DialogContent>
      {actions && <DialogActions className="modal-actions">{actions}</DialogActions>}
    </Dialog>
  );
}
