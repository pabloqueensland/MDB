import './MovesTable.css';
import DataTable, { TableScroll } from './shared/DataTable';
import Button from './shared/Button';
import type { DanceMove } from '../api';

export interface MovesTableProps {
  moves: DanceMove[];
  showBlock?: boolean;
  canEdit?: (move: DanceMove) => boolean;
  onEdit?: (move: DanceMove) => void;
  onWatch: (move: DanceMove) => void;
  savingMoveIds: ReadonlySet<string>;
  onMasteryChange: (moveId: string, isMastered: boolean) => void;
}

export default function MovesTable({ moves, showBlock = true, savingMoveIds, onMasteryChange, canEdit, onEdit, onWatch }: MovesTableProps) {
  const showActions = Boolean(onEdit && moves.some((move) => canEdit?.(move)));

  return (
    <TableScroll>
      <DataTable className={`moves-table ${showBlock ? 'moves-table--full' : 'moves-table--blocks'}`}>
        <colgroup>
          <col className="moves-col-mastery" />
          <col className="moves-col-name" />
          {showBlock && <col className="moves-col-block" />}
          {showBlock && <col className="moves-col-level" />}
          {showBlock && <col className="moves-col-school" />}
          <col className="moves-col-video" />
          {showActions && <col className="moves-col-actions" />}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="mastery-column">Mastered</th>
            <th scope="col">Move</th>
            {showBlock && <th scope="col">Block</th>}
            {showBlock && <th scope="col">Level</th>}
            {showBlock && <th scope="col">School / Classes</th>}
            <th scope="col">Video</th>
            {showActions && <th scope="col" className="move-actions">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {moves.map((move) => (
            <tr key={move.id} className={move.isMastered ? 'mastered-move' : undefined}>
              <td className="mastery-column">
                <label className="mastery-control" title={move.canMarkMastered ? 'Mark or unmark this move as mastered' : 'Only enrolled students can mark their own moves'}>
                  <input className="mastery-checkbox" type="checkbox" checked={move.isMastered}
                    disabled={!move.canMarkMastered || savingMoveIds.has(move.id)}
                    aria-label={`Mastered: ${move.name}`} aria-busy={savingMoveIds.has(move.id)}
                    onChange={(event) => onMasteryChange(move.id, event.target.checked)} />
                </label>
                {savingMoveIds.has(move.id) && <span className="mastery-saving">Saving…</span>}
              </td>
              <td>
                {/^https?:\/\//i.test(move.videoUrl)
                  ? <Button variant="ghost" className="move-watch-name" onClick={() => onWatch(move)} aria-label={`Watch ${move.name}`}>{move.name}</Button>
                  : <strong>{move.name}</strong>}
                {move.description && <p className="move-description">{move.description}</p>}
              </td>
              {showBlock && <td>{move.block ?? '—'}</td>}
              {showBlock && <td><span className="level-badge">{move.level}</span></td>}
              {showBlock && <td>
                <span>{move.schoolName}</span>
                <div className="move-class-labels">
                  {move.classes.map((danceClass) => <span key={danceClass.id}>{danceClass.streamName} · {danceClass.name}</span>)}
                </div>
              </td>}
              <td>
                {/^https?:\/\//i.test(move.videoUrl)
                  ? <Button variant="secondary" size="compact" onClick={() => onWatch(move)} aria-label={`Watch ${move.name}`}><span aria-hidden="true">▷</span> Watch video</Button>
                  : <span className="video-placeholder">Video coming soon</span>}
              </td>
              {showActions && <td className="move-actions">
                {canEdit?.(move) && <Button type="button" variant="secondary" size="compact" onClick={() => onEdit?.(move)} aria-label={`Edit ${move.name}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m14 5 5 5" /></svg>
                  Edit
                </Button>}
              </td>}
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableScroll>
  );
}
