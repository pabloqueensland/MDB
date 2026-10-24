import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DanceMove } from '../api';
import { useAuthStore } from '../stores/authStore';
import PageHeader from './shared/PageHeader';

export default function MovesLibrary() {
  const token = useAuthStore((state) => state.accessToken);
  const [moves, setMoves] = useState<DanceMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [streamId, setStreamId] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const result = await api.listMoves(token, controller.signal);

        if (!controller.signal.aborted) {
          setMoves(result);
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
  }, [token, attempt]);

  const schools = [...new Map(moves.map((move) => [move.schoolId, move.schoolName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const schoolMoves = moves.filter((move) => !schoolId || move.schoolId === schoolId);
  const classes = [...new Map(schoolMoves.flatMap((move) => move.classes.map((danceClass) => [danceClass.id, danceClass] as const))).values()]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const streams = [...new Map(classes.map((danceClass) => [danceClass.streamId, danceClass.streamName])).entries()];
  const streamClasses = classes.filter((danceClass) => !streamId || danceClass.streamId === streamId);
  const term = search.trim().toLowerCase();
  const visible = schoolMoves.filter((move) => (!classId || move.classes.some((danceClass) => danceClass.id === classId))
    && (!streamId || move.classes.some((danceClass) => danceClass.streamId === streamId))
    && `${move.name} ${move.description ?? ''}`.toLowerCase().includes(term));

  return (
    <section aria-labelledby="moves-title">
      <PageHeader titleId="moves-title" eyebrow="YOUR PRACTICE" title="Moves" description="Find your next step. Browse the moves taught at your schools." />
      {loading ? <p className="panel-message" role="status">Loading moves…</p>
        : error ? <div><p className="error" role="alert">{error}</p><button className="secondary" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
          : moves.length === 0 ? <div className="dashboard-welcome"><h2>No available moves yet.</h2><p>Students need an active stream and class enrolment. Your school also needs moves linked to a class at your enrolled level or below.</p></div>
            : <>
              <div className="move-filters">
                <div><label htmlFor="move-search">Search moves</label><input id="move-search" type="search" placeholder="e.g. Titanic or Copa" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
                <div><label htmlFor="move-school">School</label><select id="move-school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setStreamId(''); setClassId(''); }}><option value="">All schools</option>{schools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
                <div><label htmlFor="move-stream">Stream</label><select id="move-stream" value={streamId} onChange={(event) => { setStreamId(event.target.value); setClassId(''); }}><option value="">All streams</option>{streams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
                <div><label htmlFor="move-class">Class</label><select id="move-class" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">All classes</option>{streamClasses.map((danceClass) => <option key={danceClass.id} value={danceClass.id}>{danceClass.name}</option>)}</select></div>
              </div>
              <div className="schools-panel">
                <div className="schools-panel-heading"><h2>Move library</h2><span role="status">{visible.length} {visible.length === 1 ? 'move' : 'moves'}</span></div>
                {visible.length === 0 ? <p className="panel-message">No moves match your filters.</p>
                  : <div className="school-table-scroll"><table className="school-table moves-table">
                    <thead><tr><th scope="col">Move</th><th scope="col">Level</th><th scope="col">School / Classes</th><th scope="col">Video</th></tr></thead>
                    <tbody>{visible.map((move) => <tr key={move.id}>
                      <td><strong>{move.name}</strong>{move.description && <p className="move-description">{move.description}</p>}</td>
                      <td><span className="level-badge">{move.level}</span></td>
                      <td><span>{move.schoolName}</span><div className="move-class-labels">{move.classes.map((danceClass) => <span key={danceClass.id}>{danceClass.streamName} · {danceClass.name}</span>)}</div></td>
                      <td>{/^https?:\/\//i.test(move.videoUrl) ? <video controls preload="none" src={move.videoUrl} aria-label={`${move.name} demonstration`} /> : <span className="video-placeholder">Video coming soon</span>}</td>
                    </tr>)}</tbody>
                  </table></div>}
              </div>
            </>}
    </section>
  );
}
