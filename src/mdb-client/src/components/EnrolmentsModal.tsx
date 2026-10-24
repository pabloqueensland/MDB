import './EnrolmentsModal.css';
import Button from './shared/Button';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { DanceStream, Enrolment, Member } from '../api';
import { useAuthStore } from '../stores/authStore';

interface Props { student: Member; onClose: () => void }

export default function EnrolmentsModal({ student, onClose }: Props) {
  const token = useAuthStore((state) => state.accessToken);
  const dialog = useRef<HTMLDialogElement>(null);
  const [streams, setStreams] = useState<DanceStream[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [streamId, setStreamId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();

    return () => element?.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [available, enrolled] = await Promise.all([
          api.listStreams(student.schoolId, token, controller.signal),
          api.listEnrolments(student.schoolId, student.userId, token, controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setStreams(available);
          setEnrolments(enrolled);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load enrolments.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [student.schoolId, student.userId, token, attempt]);

  async function save(selectedStreamId: string, selectedClassId: string, isActive: boolean) {
    if (!token || saving) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const saved = await api.saveEnrolment({ schoolId: student.schoolId, userId: student.userId,
        streamId: selectedStreamId, classId: selectedClassId, isActive }, token);
      setEnrolments((current) => [...current.filter((item) => item.classId !== saved.classId), saved]);
      setNotice(isActive ? 'Enrolment activated.' : 'Enrolment deactivated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save enrolment.');
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(streamId, classId, true);
  }

  const classes = streams.find((stream) => stream.id === streamId)?.classes ?? [];

  return <dialog ref={dialog} className="school-modal enrolments-modal" aria-labelledby="enrolments-title" onCancel={(event) => {
    event.preventDefault();

    if (!saving) {
      onClose();
    }
  }}>
    <div className="modal-heading"><span className="section-number">{student.schoolName}</span><Button variant="ghost" size="icon" aria-label="Close enrolments" onClick={onClose} disabled={saving}>×</Button></div>
    <h2 id="enrolments-title">Student enrolments</h2><p className="intro">{student.name || student.email}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="created-message" role="status">{notice}</p>}
    {loading ? <p role="status">Loading streams and enrolments…</p> : <>
      <div className="enrolment-list">{enrolments.map((item) => <div key={item.classId} className="enrolment-row"><div><strong>{item.className}</strong><small>{item.streamName} · Level {item.level} · {item.isActive ? 'Active' : 'Inactive'}</small></div><Button variant="secondary" disabled={saving} onClick={() => { void save(item.streamId, item.classId, !item.isActive); }}>{item.isActive ? 'Deactivate' : 'Reactivate'}</Button></div>)}{enrolments.length === 0 && <p className="intro">No enrolments yet.</p>}</div>
      {streams.length > 0 ? <form onSubmit={submit}>
        <label htmlFor="enrol-stream">Stream</label><select id="enrol-stream" required value={streamId} disabled={saving} onChange={(event) => { setStreamId(event.target.value); setClassId(''); }}><option value="">Choose a stream</option>{streams.map((stream) => <option key={stream.id} value={stream.id}>{stream.name}</option>)}</select>
        <label htmlFor="enrol-class">Class</label><select id="enrol-class" required value={classId} disabled={saving || !streamId} onChange={(event) => setClassId(event.target.value)}><option value="">Choose a class</option>{classes.map((danceClass) => <option key={danceClass.id} value={danceClass.id}>{danceClass.name} · Level {danceClass.level}</option>)}</select>
        <p className="intro">An active enrolment unlocks this class and lower levels in the same stream. Deactivate any higher enrolment to reduce access.</p>
        <Button type="submit" disabled={saving || !classId}>{saving ? 'Saving…' : 'Activate enrolment'}</Button>
      </form> : <p className="intro">This school has no streams or classes configured yet.</p>}
      {error && <Button variant="secondary" disabled={saving} onClick={() => setAttempt((value) => value + 1)}>Reload enrolments</Button>}
    </>}
  </dialog>;
}
