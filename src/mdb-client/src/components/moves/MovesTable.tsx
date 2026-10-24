import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import './MovesTable.css';
import DataTable, { TableScroll } from '../shared/DataTable';
import Button from '../shared/Button';
import type { DanceMove } from '../../api';

export interface MovesTableProps {
  moves: DanceMove[];
  showBlock?: boolean;
  canEdit?: (move: DanceMove) => boolean;
  onEdit?: (move: DanceMove) => void;
  onWatch: (move: DanceMove) => void;
  savingMoveIds: ReadonlySet<string>;
  onMasteryChange: (moveId: string, isMastered: boolean) => void;
  onFavoriteChange: (moveId: string, isFavorite: boolean) => void;
}

export default function MovesTable({ moves, showBlock = true, savingMoveIds, onMasteryChange, onFavoriteChange, canEdit, onEdit, onWatch }: MovesTableProps) {
  const showActions = Boolean(onEdit && moves.some((move) => canEdit?.(move)));
  const showFavorites = moves.some((move) => move.canMarkMastered);

  return (
    <TableScroll>
      <DataTable className={`moves-table ${showBlock ? 'moves-table--full' : 'moves-table--blocks'}${showActions ? ' moves-table--editable' : ''}${showFavorites ? ' moves-table--favorites' : ''}`}>
        <colgroup>
          <col className="moves-col-mastery" />
          <col className="moves-col-name" />
          {showBlock && <col className="moves-col-block" />}
          {showBlock && <col className="moves-col-level" />}
          {showBlock && <col className="moves-col-school" />}
          {showFavorites && <col className="moves-col-favorite" />}
          <col className="moves-col-video" />
          {showActions && <col className="moves-col-actions" />}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell scope="col" className="mastery-column">Mastered</TableCell>
            <TableCell scope="col">Move</TableCell>
            {showBlock && <TableCell scope="col">Block</TableCell>}
            {showBlock && <TableCell scope="col">Level</TableCell>}
            {showBlock && <TableCell scope="col">School / Classes</TableCell>}
            {showFavorites && <TableCell scope="col" className="move-favorite-cell">Favorite</TableCell>}
            <TableCell scope="col">Video</TableCell>
            {showActions && <TableCell scope="col" className="move-actions">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {moves.map((move) => (
            <TableRow key={move.id} className={move.isMastered ? 'mastered-move' : undefined}>
              <TableCell className="mastery-column">
                <Checkbox className="mastery-control" checked={move.isMastered}
                  title={move.canMarkMastered ? 'Mark or unmark this move as mastered' : 'Only enrolled students can mark their own moves'}
                  disabled={!move.canMarkMastered || savingMoveIds.has(move.id)}
                  slotProps={{ input: { 'aria-label': `Mastered: ${move.name}`, 'aria-busy': savingMoveIds.has(move.id) } }}
                  onChange={(event) => onMasteryChange(move.id, event.target.checked)} />
                {savingMoveIds.has(move.id) && <span className="mastery-saving">Saving…</span>}
              </TableCell>
              <TableCell className="move-name-cell">
                {/^https?:\/\//i.test(move.videoUrl)
                  ? <Button variant="ghost" className="move-watch-name" onClick={() => onWatch(move)} aria-label={`Watch ${move.name}`}>{move.name}</Button>
                  : <strong>{move.name}</strong>}
                {move.description && <p className="move-description">{move.description}</p>}
              </TableCell>
              {showBlock && <TableCell className="move-detail-cell" data-label="Block">{move.block ?? '—'}</TableCell>}
              {showBlock && <TableCell className="move-detail-cell" data-label="Level"><span className="level-badge">{move.level}</span></TableCell>}
              {showBlock && <TableCell className="move-detail-cell" data-label="Classes">
                <span className="table-mobile-hidden">{move.schoolName}</span>
                <div className="move-class-labels">
                  {move.classes.map((danceClass) => <span key={danceClass.id}>{danceClass.streamName} · {danceClass.name}</span>)}
                </div>
              </TableCell>}
              {showFavorites && <TableCell className="move-favorite-cell">
                {move.canMarkMastered && <Button variant="ghost" size="icon"
                  disabled={savingMoveIds.has(move.id)} aria-pressed={move.isFavorite}
                  aria-label={`${move.isFavorite ? 'Remove from favorites' : 'Add to favorites'}: ${move.name}`}
                  title={move.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={() => onFavoriteChange(move.id, !move.isFavorite)}>
                  {move.isFavorite ? <StarIcon /> : <StarBorderIcon />}
                </Button>}
              </TableCell>}
              <TableCell className="move-video-cell">
                {/^https?:\/\//i.test(move.videoUrl)
                  ? <Button variant="secondary" size="compact" onClick={() => onWatch(move)} aria-label={`Watch ${move.name}`}>
                    <PlayArrowIcon fontSize="small" />
                    <span className="move-watch-label">Watch video</span>
                  </Button>
                  : <span className="video-placeholder">Video coming soon</span>}
              </TableCell>
              {showActions && <TableCell className="move-actions">
                {canEdit?.(move) && <Button type="button" variant="secondary" size="compact" onClick={() => onEdit?.(move)} aria-label={`Edit ${move.name}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m14 5 5 5" /></svg>
                  <span className="move-edit-label">Edit</span>
                </Button>}
              </TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </DataTable>
    </TableScroll>
  );
}
