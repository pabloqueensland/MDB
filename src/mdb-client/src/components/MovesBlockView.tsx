import { useId } from 'react';
import type { DanceMove } from '../api';
import MovesTable from './MovesTable';
import type { MovesTableProps } from './MovesTable';

interface MovesBlockViewProps extends Omit<MovesTableProps, 'showBlock'> {
  selectedClassId?: string;
  selectedStreamId?: string;
  allMoves: DanceMove[];
}

interface BlockGroup {
  key: string;
  schoolId: string;
  classId: string;
  schoolName: string;
  streamName: string;
  className: string;
  level: number;
  label: string;
  moves: DanceMove[];
}

export default function MovesBlockView({ moves, allMoves, savingMoveIds, onMasteryChange, selectedClassId, selectedStreamId }: MovesBlockViewProps) {
  const headingId = useId();
  const grouped = new Map<string, BlockGroup>();

  for (const move of moves) {
    const label = move.block?.trim() || '';
    const classes = move.classes.filter((danceClass) => (!selectedClassId || danceClass.id === selectedClassId)
      && (!selectedStreamId || danceClass.streamId === selectedStreamId));

    // A shared move appears under each matching class; its mastery is still per move.
    const contexts = move.classes.length === 0 && !selectedClassId && !selectedStreamId
      ? [{ id: '', name: 'Unclassified moves', streamName: '', level: move.level }]
      : classes;

    for (const danceClass of contexts) {
      const key = JSON.stringify([move.schoolId, danceClass.id, danceClass.id ? null : move.level, label.toLowerCase()]);
      const group = grouped.get(key);

      if (group) {
        group.moves.push(move);
      } else {
        grouped.set(key, {
          key, label, schoolId: move.schoolId, classId: danceClass.id,
          schoolName: move.schoolName, streamName: danceClass.streamName,
          className: danceClass.name, level: danceClass.level, moves: [move],
        });
      }
    }
  }

  const groups = [...grouped.values()].sort((a, b) => {
    const contextOrder = a.schoolName.localeCompare(b.schoolName)
      || a.streamName.localeCompare(b.streamName)
      || a.level - b.level
      || a.className.localeCompare(b.className);

    if (contextOrder) {
      return contextOrder;
    }

    if (!a.label || !b.label) {
      return a.label ? -1 : b.label ? 1 : 0;
    }

    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="move-blocks">
      {groups.map((group, index) => {
        // Search may hide unfinished moves; completion must include the entire block.
        const blockMoves = allMoves.filter((move) => move.schoolId === group.schoolId
          && (move.block?.trim().toLowerCase() || '') === group.label.toLowerCase()
          && (group.classId ? move.classes.some((danceClass) => danceClass.id === group.classId)
            : move.classes.length === 0 && move.level === group.level));
        const masteredCount = blockMoves.filter((move) => move.isMastered).length;
        const allMastered = blockMoves.length > 0 && masteredCount === blockMoves.length;

        return (
        <details className={`move-block${allMastered ? ' move-block--mastered' : ''}`} key={group.key} aria-labelledby={`${headingId}-${index}`}>
          <summary className="move-block-heading">
            <div>
              <h3 id={`${headingId}-${index}`}>{group.className} · {!group.label ? 'No block' : group.label.toLowerCase() === 'common' ? 'Common' : `Block ${group.label}`}</h3>
              <span className="stream-count">{group.schoolName}{group.streamName && ` · ${group.streamName}`} · Level {group.level}</span>
            </div>
            <div className="block-progress" aria-live="polite">
              {allMastered && <span className="block-mastered-badge">✓ All mastered</span>}
              <span>{masteredCount} / {blockMoves.length} mastered</span>
            </div>
            <span className="block-chevron" aria-hidden="true">›</span>
          </summary>
          <MovesTable moves={group.moves} showBlock={false} savingMoveIds={savingMoveIds} onMasteryChange={onMasteryChange} />
        </details>
        );
      })}
    </div>
  );
}
