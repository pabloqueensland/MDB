import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import './MovesLibrary.css';
import ManagementPanel, { PanelHeading } from '../shared/ManagementPanel';
import Button from '../shared/Button';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import type { DanceMove } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import SearchInput from '../shared/SearchInput';
import MovesTable from './MovesTable';
import MovesBlockView from './MovesBlockView';
import EditMoveModal from './EditMoveModal';
import MoveVideoModal from './MoveVideoModal';

export default function MovesLibrary() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isStudent = !user?.roles.includes('PlatformAdmin') && user?.memberships.some((membership) => membership.role === 'Student');
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [editingMove, setEditingMove] = useState<DanceMove | null>(null);
  const [watchingMove, setWatchingMove] = useState<DanceMove | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [view, setView] = useState<'list' | 'blocks' | 'favorites'>(isStudent ? 'blocks' : 'list');
  const [savingMoveIds, setSavingMoveIds] = useState<Set<string>>(new Set());
  const pendingMoves = useRef(new Set<string>());
  const [masteryError, setMasteryError] = useState('');
  const [masteryNotice, setMasteryNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token || !user) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [result, accessibleSchools] = await Promise.all([
          api.listMoves(token, controller.signal),
          user.roles.includes('PlatformAdmin')
            ? api.listSchools(token, controller.signal)
            : Promise.resolve(user.memberships.map((membership) => ({ id: membership.schoolId, name: membership.schoolName }))),
        ]);

        if (!controller.signal.aborted) {
          setMoves(result);
          setSchoolOptions(accessibleSchools.map((school) => [school.id, school.name]));
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load moves.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [token, user, attempt]);

  async function changeMastery(moveId: string, isMastered: boolean) {
    if (!token || pendingMoves.current.has(moveId)) {
      return;
    }

    pendingMoves.current.add(moveId);
    setSavingMoveIds(new Set(pendingMoves.current));
    setMasteryError('');
    setMasteryNotice('');

    try {
      const result = await api.setMoveMastery(moveId, isMastered, token);

      if (useAuthStore.getState().accessToken !== token) {
        return;
      }

      setMoves((current) => current.map((move) => move.id === moveId ? { ...move, isMastered: result.isMastered } : move));
      const name = moves.find((move) => move.id === moveId)?.name ?? 'Move';
      setMasteryNotice(`${name} ${result.isMastered ? 'marked as mastered' : 'marked as not mastered'}.`);
    } catch (cause) {
      setMasteryError(cause instanceof Error ? cause.message : 'Could not save mastery. Please try again.');
    } finally {
      pendingMoves.current.delete(moveId);
      setSavingMoveIds(new Set(pendingMoves.current));
    }
  }

  async function changeFavorite(moveId: string, isFavorite: boolean) {
    if (!token || pendingMoves.current.has(moveId)) {
      return;
    }

    pendingMoves.current.add(moveId);
    setSavingMoveIds(new Set(pendingMoves.current));
    setMasteryError('');
    setMasteryNotice('');

    try {
      const result = await api.setMoveFavorite(moveId, isFavorite, token);

      if (useAuthStore.getState().accessToken !== token) {
        return;
      }

      setMoves((current) => current.map((move) => move.id === moveId ? { ...move, isFavorite: result.isFavorite } : move));
      setMasteryNotice(result.isFavorite ? 'Move added to favorites.' : 'Move removed from favorites.');
    } catch (cause) {
      setMasteryError(cause instanceof Error ? cause.message : 'Could not save favorite. Please try again.');
    } finally {
      pendingMoves.current.delete(moveId);
      setSavingMoveIds(new Set(pendingMoves.current));
    }
  }

  const schools = [...new Map([...schoolOptions, ...moves.map((move) => [move.schoolId, move.schoolName] as [string, string])]).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const showSchoolFilter = schools.length > 1;
  const canEdit = (move: DanceMove) => user?.roles.includes('PlatformAdmin') === true
    || user?.memberships.some((membership) => membership.schoolId === move.schoolId
      && (membership.role === 'SchoolAdmin' || membership.role === 'SchoolManager')) === true;
  const schoolMoves = moves.filter((move) => !schoolId || move.schoolId === schoolId);
  const classes = [...new Map(schoolMoves.flatMap((move) => move.classes.map((danceClass) => [danceClass.id, danceClass] as const))).values()]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const streams = [...new Map(classes.map((danceClass) => [danceClass.streamId, danceClass.streamName])).entries()];
  const streamClasses = classes.filter((danceClass) => !streamId || danceClass.streamId === streamId);
  const term = search.trim().toLowerCase();
  const visible = schoolMoves.filter((move) => (!classId || move.classes.some((danceClass) => danceClass.id === classId))
    && (view !== 'favorites' || move.isFavorite)
    && (!streamId || move.classes.some((danceClass) => danceClass.streamId === streamId))
    && `${move.name} ${move.description ?? ''} ${move.block ?? ''}`.toLowerCase().includes(term));

  return (
    <section className="moves-library" aria-label="Moves">
      {watchingMove && <MoveVideoModal key={watchingMove.id} move={watchingMove} onClose={() => setWatchingMove(null)} />}
      {editingMove && <EditMoveModal key={editingMove.id} move={editingMove} onClose={() => setEditingMove(null)} onSaved={() => { setEditingMove(null); setAttempt((value) => value + 1); }} />}
      {loading ? <p className="panel-message" role="status">Loading moves…</p>
        : error ? <div><p className="error" role="alert">{error}</p><Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Try again</Button></div>
          : moves.length === 0 ? <div className="dashboard-welcome"><h2>No available moves yet.</h2><p>Students need an active stream and class enrolment. Your school also needs moves linked to a class at your enrolled level or below.</p></div>
            : <>
              <div className={`move-filters${showSchoolFilter ? '' : ' move-filters--single-school'}`}>
                <SearchInput label="Search moves" placeholder="e.g. Titanic or Copa" value={search} onChange={setSearch} />
                {showSchoolFilter && <TextField select fullWidth label="School" id="move-school" value={schoolId}
                  onChange={(event) => { setSchoolId(event.target.value); setStreamId(''); setClassId(''); }}>
                  <MenuItem value="">All schools</MenuItem>
                  {schools.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
                </TextField>}
                <TextField select fullWidth label="Stream" id="move-stream" value={streamId}
                  onChange={(event) => { setStreamId(event.target.value); setClassId(''); }}>
                  <MenuItem value="">All streams</MenuItem>
                  {streams.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
                </TextField>
                <TextField select fullWidth label="Class" id="move-class" value={classId}
                  onChange={(event) => setClassId(event.target.value)}>
                  <MenuItem value="">All classes</MenuItem>
                  {streamClasses.map((danceClass) => <MenuItem key={danceClass.id} value={danceClass.id}>{danceClass.name}</MenuItem>)}
                </TextField>
              </div>
              {masteryError && <p className="error" role="alert">{masteryError}</p>}
              <p className="mastery-notice" role="status">{masteryNotice}</p>
              <ManagementPanel>
                <PanelHeading className="moves-view-toolbar">
                  <div><h2>Move library</h2><span className="stream-count" role="status">{visible.length} {visible.length === 1 ? 'move' : 'moves'}</span></div>
                  <div className="view-toggle" role="group" aria-label="Move visualization">
                    <Button variant="segmented" size="compact" type="button" aria-pressed={view === 'blocks'} onClick={() => setView('blocks')}>{isStudent ? 'See blocks' : 'Toggle Block View'}</Button>
                    <Button variant="segmented" size="compact" type="button" aria-pressed={view === (isStudent ? 'favorites' : 'list')}
                      onClick={() => setView(isStudent ? 'favorites' : 'list')}>{isStudent ? 'See favorites' : 'Toggle Full list'}</Button>
                  </div>
                </PanelHeading>
                {visible.length === 0 ? <p className="panel-message">{view === 'favorites' ? 'No favorites match your filters. Use the star beside a move in See blocks to add it to favorites.' : 'No moves match your filters.'}</p>
                  : view === 'blocks'
                    ? <MovesBlockView moves={visible} allMoves={moves} selectedClassId={classId} selectedStreamId={streamId} savingMoveIds={savingMoveIds} onMasteryChange={(id, mastered) => { void changeMastery(id, mastered); }} onFavoriteChange={(id, favorite) => { void changeFavorite(id, favorite); }} canEdit={canEdit} onEdit={setEditingMove} onWatch={setWatchingMove} />
                    : <MovesTable moves={visible} savingMoveIds={savingMoveIds} onMasteryChange={(id, mastered) => { void changeMastery(id, mastered); }} onFavoriteChange={(id, favorite) => { void changeFavorite(id, favorite); }} canEdit={canEdit} onEdit={setEditingMove} onWatch={setWatchingMove} />}
              </ManagementPanel>
            </>}
    </section>
  );
}
