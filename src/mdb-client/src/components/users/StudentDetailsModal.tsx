import NotificationSnackbar from '../shared/NotificationSnackbar';
import InlineAlert from '../shared/InlineAlert';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Modal from '../shared/Modal';
import './StudentDetailsModal.css';
import Button from '../shared/Button';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api';
import type { DanceStream, Enrolment, Member } from '../../api';
import { useAuthStore } from '../../stores/authStore';

interface Props { student: Member; onClose: () => void }

export default function StudentDetailsModal({ student, onClose }: Props) {
  const token = useAuthStore((state) => state.accessToken);
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

  return <Modal title={student.name || 'Student details'} eyebrow="STUDENT DETAILS"
    className="student-details-modal" busy={saving} onClose={onClose}>
    <dl className="student-profile">
      <div><dt>Email</dt><dd>{student.email}</dd></div>
      <div><dt>School</dt><dd>{student.schoolName}</dd></div>
      <div><dt>Role</dt><dd>Student</dd></div>
    </dl>
    <div className="student-section-heading">
      <h3>Enrolments</h3>
      {!loading && !error && <Chip size="small" label={enrolments.filter((item) => item.isActive).length + ' active'} />}
    </div>
    {error && <InlineAlert>{error}</InlineAlert>}
    {notice && <NotificationSnackbar message={notice} onClose={() => setNotice('')} />}
    {loading ? <p role="status">Loading streams and enrolments…</p> : <>
      <div className="enrolment-list">
        {enrolments.map((item) => (
          <div key={item.classId} className="enrolment-row">
            <div className="student-enrolment-info">
              <strong>{item.className}</strong>
              <small>{item.streamName} · Level {item.level}</small>
              <Chip size="small" variant="outlined" color={item.isActive ? 'success' : 'default'} label={item.isActive ? 'Active' : 'Inactive'} />
            </div>
            <Button variant="secondary" size="compact" disabled={saving}
              onClick={() => { void save(item.streamId, item.classId, !item.isActive); }}>
              {item.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        ))}
        {!error && enrolments.length === 0 && <p className="intro">No enrolments yet.</p>}
      </div>
      {streams.length > 0 ? <Accordion className="student-add-enrolment" disableGutters elevation={0}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><h3>Add enrolment</h3></AccordionSummary>
        <AccordionDetails>
          <form onSubmit={submit}>
        <TextField select fullWidth label="Stream" id="enrol-stream" required value={streamId} disabled={saving}
          onChange={(event) => { setStreamId(event.target.value); setClassId(''); }}>
          <MenuItem value="">Choose a stream</MenuItem>
          {streams.map((stream) => <MenuItem key={stream.id} value={stream.id}>{stream.name}</MenuItem>)}
        </TextField>
        <TextField select fullWidth label="Class" id="enrol-class" required value={classId} disabled={saving || !streamId}
          onChange={(event) => setClassId(event.target.value)}>
          <MenuItem value="">Choose a class</MenuItem>
          {classes.map((danceClass) => <MenuItem key={danceClass.id} value={danceClass.id}>{danceClass.name} · Level {danceClass.level}</MenuItem>)}
        </TextField>
        <p className="intro">An active enrolment unlocks this class and lower levels in the same stream. Deactivate any higher enrolment to reduce access.</p>
        <Button type="submit" disabled={saving || !classId}>{saving ? 'Saving…' : 'Activate enrolment'}</Button>
          </form>
        </AccordionDetails>
      </Accordion> : !error && <p className="intro">This school has no streams or classes configured yet.</p>}
      {error && <Button variant="secondary" disabled={saving} onClick={() => setAttempt((value) => value + 1)}>Reload enrolments</Button>}
    </>}
  </Modal>;
}
