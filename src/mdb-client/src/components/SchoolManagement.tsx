import { useEffect, useState } from 'react';
import { api } from '../api';
import type { School } from '../api';
import { useAuthStore } from '../stores/authStore';
import AddSchoolModal from './AddSchoolModal';

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
      <div className="page-heading"><div><h1 className="page-title" id="schools-title">School management</h1><p className="page-description">All your schools, in one place.</p></div><button className="primary add-school-button" disabled={isLoading || !!error} onClick={() => { setNotice(''); setShowModal(true); }}>Add school <span aria-hidden="true">＋</span></button></div>
      {notice && <p className="created-message" role="status">{notice}</p>}
      <div className="schools-panel" aria-busy={isLoading}>
        <div className="schools-panel-heading"><h2>Schools</h2>{!isLoading && !error && <span>{schools.length} total</span>}</div>
        {isLoading ? <p className="panel-message" role="status">Loading schools…</p>
          : error ? <div className="panel-message"><p className="error" role="alert">{error}</p><button className="secondary" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
            : schools.length === 0 ? <div className="empty-schools"><span className="card-icon" aria-hidden="true">▤</span><h3>Your first school starts here.</h3><p>Add a school to start building your dance community.</p><button className="secondary" onClick={() => { setNotice(''); setShowModal(true); }}>Add your first school</button></div>
              : <div className="school-table-scroll"><table className="school-table"><thead><tr><th scope="col">School name</th><th scope="col">Slug</th></tr></thead><tbody>{schools.map((school) => <tr key={school.id}><td><span className="school-avatar" aria-hidden="true">{school.name.charAt(0).toUpperCase()}</span>{school.name}</td><td>{school.slug}</td></tr>)}</tbody></table></div>}
      </div>
      {showModal && <AddSchoolModal onClose={() => setShowModal(false)} onCreated={created} />}
    </section>
  );
}
