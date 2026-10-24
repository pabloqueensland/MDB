import './StreamsManagement.css';
import DataTable, { TableScroll } from './shared/DataTable';
import ManagementPanel, { PanelHeading } from './shared/ManagementPanel';
import Button from './shared/Button';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DanceStream, School } from '../api';
import { useAuthStore } from '../stores/authStore';
import AddCurriculumModal from './AddCurriculumModal';
import PageHeader from './shared/PageHeader';

export default function StreamsManagement() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [streams, setStreams] = useState<DanceStream[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [schoolError, setSchoolError] = useState('');
  const [streamError, setStreamError] = useState('');
  const [notice, setNotice] = useState('');
  const [schoolAttempt, setSchoolAttempt] = useState(0);
  const [streamAttempt, setStreamAttempt] = useState(0);
  const [modal, setModal] = useState<{ stream: DanceStream | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token || !user) {
        return;
      }

      setLoadingSchools(true);
      setSchoolError('');

      try {
        const available = user.roles.includes('PlatformAdmin')
          ? await api.listSchools(token, controller.signal)
          : user.memberships.filter((membership) => membership.role === 'SchoolManager' || membership.role === 'SchoolAdmin')
            .map((membership) => ({ id: membership.schoolId, name: membership.schoolName, slug: '' }));

        if (!controller.signal.aborted) {
          setSchools(available);
          setSchoolId((current) => available.some((school) => school.id === current) ? current : available[0]?.id ?? '');
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setSchoolError(cause instanceof Error ? cause.message : 'Could not load schools.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSchools(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [token, user, schoolAttempt]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!token || !schoolId) {
        return;
      }

      setLoadingStreams(true);
      setStreamError('');

      try {
        const available = await api.listStreams(schoolId, token, controller.signal);

        if (!controller.signal.aborted) {
          setStreams(available);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStreamError(cause instanceof Error ? cause.message : 'Could not load streams.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingStreams(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [token, schoolId, streamAttempt]);

  function saved(message: string) {
    setModal(null);
    setNotice(message);
    setStreamAttempt((value) => value + 1);
  }

  return (
    <section className="streams-management" aria-labelledby="streams-title">
      <PageHeader titleId="streams-title" eyebrow="CURRICULUM" title="Streams & classes"
        description="Build each school's dance styles and the classes within them."
        actions={<Button className="add-school-button" disabled={!schoolId || loadingSchools || loadingStreams || !!schoolError || !!streamError} onClick={() => { setNotice(''); setModal({ stream: null }); }}>Add stream <span aria-hidden="true">＋</span></Button>} />
      {notice && <p className="created-message" role="status">{notice}</p>}
      {loadingSchools ? <p role="status">Loading schools…</p>
        : schoolError ? <><p className="error" role="alert">{schoolError}</p><Button variant="secondary" onClick={() => setSchoolAttempt((value) => value + 1)}>Try again</Button></>
          : schools.length === 0 ? <div className="dashboard-welcome"><h2>No schools available.</h2><p>A platform admin must create a school and assign its administrators first.</p></div>
            : <>
              <div className="curriculum-school"><label htmlFor="curriculum-school">School</label><select id="curriculum-school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setStreams([]); setLoadingStreams(true); setNotice(''); }}>
                {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </select></div>
              {loadingStreams ? <p className="panel-message" role="status">Loading streams…</p>
                : streamError ? <><p className="error" role="alert">{streamError}</p><Button variant="secondary" onClick={() => setStreamAttempt((value) => value + 1)}>Try again</Button></>
                  : streams.length === 0 ? <div className="dashboard-welcome"><h2>Your first stream starts here.</h2><p>Add a dance style such as Salsa On1, Salsa On2, or Bachata, then create its classes.</p></div>
                    : <div className="stream-list">{streams.map((stream) => <ManagementPanel  key={stream.id} aria-labelledby={`stream-${stream.id}`}>
                      <PanelHeading><div><h2 id={`stream-${stream.id}`}>{stream.name}</h2><span className="stream-count">{stream.classes.length} {stream.classes.length === 1 ? 'class' : 'classes'}</span></div><Button variant="secondary" onClick={() => { setNotice(''); setModal({ stream }); }}>Add class ＋</Button></PanelHeading>
                      {stream.classes.length === 0 ? <p className="panel-message">No classes yet. Add the first class for this stream.</p>
                        : <TableScroll><DataTable><thead><tr><th scope="col">Class name</th><th scope="col">Level</th></tr></thead><tbody>{stream.classes.map((danceClass) => <tr key={danceClass.id}><td>{danceClass.name}</td><td><span className="level-badge">{danceClass.level}</span></td></tr>)}</tbody></DataTable></TableScroll>}
                    </ManagementPanel>)}</div>}
            </>}
      {modal && <AddCurriculumModal schoolId={schoolId} schoolName={schools.find((school) => school.id === schoolId)?.name ?? ''} stream={modal.stream} onClose={() => setModal(null)} onSaved={saved} />}
    </section>
  );
}
