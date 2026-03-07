// frontend/src/pages/encoder/Reports.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Eye, RefreshCw, FilePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

export default function EncoderReports() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registrants-enc', page, search],
    queryFn: () => api.get('/registrants', { params: { page, limit: 15, search } }).then(r => r.data),
    staleTime: 10000,
  });

  const registrants = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Registration Records</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{total} total registrants</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw size={14} /></button>
          <Link to="/encoder/register" className="btn-primary text-sm"><FilePlus size={14} /> New</Link>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="input-base pl-9" placeholder="Search by name, ULI, or contact number..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ULI Number</th>
                <th>Course</th>
                <th>Sex</th>
                <th>Civil Status</th>
                <th>Contact</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-input)' }} /></td>)}</tr>
              )) : registrants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14" style={{ color: 'var(--text-muted)' }}>
                    <div className="mb-3 text-4xl">📋</div>
                    No registrants found.
                    <div className="mt-2">
                      <Link to="/encoder/register" className="text-sm" style={{ color: 'var(--accent)' }}>Register the first learner →</Link>
                    </div>
                  </td>
                </tr>
              ) : registrants.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {r.last_name}, {r.first_name} {r.middle_name?.[0] ? r.middle_name[0] + '.' : ''}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.email || '—'}</div>
                  </td>
                  <td className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{r.uli_number}</td>
                  <td><div className="text-xs max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>{r.course_qualification || '—'}</div></td>
                  <td><span className="badge badge-blue text-xs">{r.sex || '—'}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.civil_status || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.contact_no || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    <button title="View" className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs py-1.5 px-3" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn-ghost text-xs py-1.5 px-3" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
