import CardIcon from './shared/CardIcon';
import './SchoolManagement.css';
import DataTable, { TableScroll } from './shared/DataTable';
import ManagementPanel, { PanelHeading } from './shared/ManagementPanel';
import Button from './shared/Button';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { School } from '../api';
import { useAuthStore } from '../stores/authStore';
import AddSchoolModal from './AddSchoolModal';
import PageHeader from './shared/PageHeader';

export default function SchoolManagement() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await api.listSchools(accessToken, controller.signal);

        if (!controller.signal.aborted) {
          setSchools(result);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load schools.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [accessToken, attempt]);

  function created(school: School) {
    setSchools((current) => [...current, school].sort((a, b) => a.name.localeCompare(b.name)));

    setNotice(`${school.name} was created successfully.`);
    setShowModal(false);
  }

  return (
    <section aria-labelledby="schools-title">
      <a href="#/dashboard" className="breadcrumb">← Dashboard</a>
      <PageHeader
        titleId="schools-title"
        title="School management"
        description="All your schools, in one place."
        actions={<Button className="add-school-button" disabled={isLoading || !!error} onClick={() => { setNotice(''); setShowModal(true); }}>Add school <span aria-hidden="true">＋</span></Button>}
      />
      {notice && <p className="created-message" role="status">{notice}</p>}
      <ManagementPanel  aria-busy={isLoading}>
        <PanelHeading><h2>Schools</h2>{!isLoading && !error && <span>{schools.length} total</span>}</PanelHeading>
        {isLoading ? <p className="panel-message" role="status">Loading schools…</p>
          : error ? <div className="panel-message"><p className="error" role="alert">{error}</p><Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Try again</Button></div>
            : schools.length === 0 ? <div className="empty-schools"><CardIcon>▤</CardIcon><h3>Your first school starts here.</h3><p>Add a school to start building your dance community.</p><Button variant="secondary" onClick={() => { setNotice(''); setShowModal(true); }}>Add your first school</Button></div>
              : <TableScroll><DataTable><thead><tr><th scope="col">School name</th><th scope="col">Slug</th></tr></thead><tbody>{schools.map((school) => <tr key={school.id}><td><span className="school-avatar" aria-hidden="true">{school.name.charAt(0).toUpperCase()}</span>{school.name}</td><td>{school.slug}</td></tr>)}</tbody></DataTable></TableScroll>}
      </ManagementPanel>
      {showModal && <AddSchoolModal onClose={() => setShowModal(false)} onCreated={created} />}
    </section>
  );
}
