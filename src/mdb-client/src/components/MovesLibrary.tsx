import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { DanceMove } from '../api';
import { useAuthStore } from '../stores/authStore';
import SearchInput from './shared/SearchInput';
import MovesTable from './MovesTable';
import MovesBlockView from './MovesBlockView';

export default function MovesLibrary() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [view, setView] = useState<'list' | 'blocks'>('list');
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

  const schools = [...new Map([...schoolOptions, ...moves.map((move) => [move.schoolId, move.schoolName] as [string, string])]).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const showSchoolFilter = schools.length > 1;
  const schoolMoves = moves.filter((move) => !schoolId || move.schoolId === schoolId);
  const classes = [...new Map(schoolMoves.flatMap((move) => move.classes.map((danceClass) => [danceClass.id, danceClass] as const))).values()]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const streams = [...new Map(classes.map((danceClass) => [danceClass.streamId, danceClass.streamName])).entries()];
  const streamClasses = classes.filter((danceClass) => !streamId || danceClass.streamId === streamId);
  const term = search.trim().toLowerCase();
  const visible = schoolMoves.filter((move) => (!classId || move.classes.some((danceClass) => danceClass.id === classId))
    && (!streamId || move.classes.some((danceClass) => danceClass.streamId === streamId))
    && `${move.name} ${move.description ?? ''} ${move.block ?? ''}`.toLowerCase().includes(term));

  return (
    <section aria-label="Moves">
      {loading ? <p className="panel-message" role="status">Loading moves…</p>
        : error ? <div><p className="error" role="alert">{error}</p><button className="secondary" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
          : moves.length === 0 ? <div className="dashboard-welcome"><h2>No available moves yet.</h2><p>Students need an active stream and class enrolment. Your school also needs moves linked to a class at your enrolled level or below.</p></div>
            : <>
              <div className={`move-filters${showSchoolFilter ? '' : ' move-filters--single-school'}`}>
                <SearchInput label="Search moves" placeholder="e.g. Titanic or Copa" value={search} onChange={setSearch} />
                {showSchoolFilter && <div><label htmlFor="move-school">School</label><select id="move-school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setStreamId(''); setClassId(''); }}><option value="">All schools</option>{schools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>}
                <div><label htmlFor="move-stream">Stream</label><select id="move-stream" value={streamId} onChange={(event) => { setStreamId(event.target.value); setClassId(''); }}><option value="">All streams</option>{streams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
                <div><label htmlFor="move-class">Class</label><select id="move-class" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">All classes</option>{streamClasses.map((danceClass) => <option key={danceClass.id} value={danceClass.id}>{danceClass.name}</option>)}</select></div>
              </div>
              {masteryError && <p className="error" role="alert">{masteryError}</p>}
              <p className="mastery-notice" role="status">{masteryNotice}</p>
              <div className="schools-panel">
                <div className="schools-panel-heading moves-view-toolbar">
                  <div><h2>Move library</h2><span className="stream-count" role="status">{visible.length} {visible.length === 1 ? 'move' : 'moves'}</span></div>
                  <div className="view-toggle" role="group" aria-label="Move visualization">
                    <button type="button" aria-pressed={view === 'blocks'} onClick={() => setView('blocks')}>Toggle Block View</button>
                    <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Toggle Full list</button>
                  </div>
                </div>
                {visible.length === 0 ? <p className="panel-message">No moves match your filters.</p>
                  : view === 'blocks'
                    ? <MovesBlockView moves={visible} allMoves={moves} selectedClassId={classId} selectedStreamId={streamId} savingMoveIds={savingMoveIds} onMasteryChange={(id, mastered) => { void changeMastery(id, mastered); }} />
                    : <MovesTable moves={visible} savingMoveIds={savingMoveIds} onMasteryChange={(id, mastered) => { void changeMastery(id, mastered); }} />}
              </div>
            </>}
    </section>
  );
}
