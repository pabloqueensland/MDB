import './MoveVideoModal.css';
import { useState } from 'react';
import type { DanceMove } from '../../api';
import Button from '../shared/Button';
import Modal from '../shared/Modal';

export default function MoveVideoModal({ move, onClose }: { move: DanceMove; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function retry() {
    setFailed(false);
    setAttempt((value) => value + 1);
  }

  return (
    <Modal title={move.name} description={move.schoolName} className="move-video-modal" onClose={onClose}>
      <video key={attempt} className="move-video-player" controls playsInline preload="metadata"
        src={move.videoUrl} aria-label={`${move.name} demonstration`} onError={() => setFailed(true)} />
      {failed && <div className="move-video-error">
        <p className="error" role="alert">Could not play this video. Check that the video URL is available and the file is supported by your browser.</p>
        <Button variant="secondary" onClick={retry}>Try again</Button>
      </div>}
      {move.description && <p className="move-video-description">{move.description}</p>}
    </Modal>
  );
}
