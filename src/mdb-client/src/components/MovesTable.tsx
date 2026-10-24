import type { DanceMove } from '../api';

export interface MovesTableProps {
  moves: DanceMove[];
  showBlock?: boolean;
  savingMoveIds: ReadonlySet<string>;
  onMasteryChange: (moveId: string, isMastered: boolean) => void;
}

export default function MovesTable({ moves, showBlock = true, savingMoveIds, onMasteryChange }: MovesTableProps) {
  return (
    <div className="school-table-scroll">
      <table className={`school-table moves-table ${showBlock ? 'moves-table--full' : 'moves-table--blocks'}`}>
        <colgroup>
          <col className="moves-col-mastery" />
          <col className="moves-col-name" />
          {showBlock && <col className="moves-col-block" />}
          <col className="moves-col-level" />
          <col className="moves-col-school" />
          <col className="moves-col-video" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="mastery-column">Mastered</th>
            <th scope="col">Move</th>
            {showBlock && <th scope="col">Block</th>}
            <th scope="col">Level</th>
            <th scope="col">School / Classes</th>
            <th scope="col">Video</th>
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
                <strong>{move.name}</strong>
                {move.description && <p className="move-description">{move.description}</p>}
              </td>
              {showBlock && <td>{move.block ?? '—'}</td>}
              <td><span className="level-badge">{move.level}</span></td>
              <td>
                <span>{move.schoolName}</span>
                <div className="move-class-labels">
                  {move.classes.map((danceClass) => <span key={danceClass.id}>{danceClass.streamName} · {danceClass.name}</span>)}
                </div>
              </td>
              <td>
                {/^https?:\/\//i.test(move.videoUrl)
                  ? <video controls preload="none" src={move.videoUrl} aria-label={`${move.name} demonstration`} />
                  : <span className="video-placeholder">Video coming soon</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
