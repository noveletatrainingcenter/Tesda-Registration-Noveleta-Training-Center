// frontend/src/pages/admin/Reports.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Download, Eye, Archive, Filter, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [course, setCourse] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registrants', page, search, course],
    queryFn: () => api.get('/registrants', { params: { page, limit: 15, search, course } }).then(r => r.data),
    staleTime: 10000,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/admin/courses').then(r => r.data.data),
  });

  async function handleArchive(id: number, name: string) {
    if (!confirm(`Archive ${name}?`)) return;
    try {
      await api.patch(`/registrants/${id}/archive`);
      toast.success('Registrant archived.');
      refetch();
    } catch { toast.error('Failed to archive.'); }
  }

  const registrants = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>All learner registrations · {total} total</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="input-base pl-9" placeholder="Search by name, ULI, or contact..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <select className="input-base pl-9 pr-8 min-w-[180px]" value={course} onChange={e => { setCourse(e.target.value); setPage(1); }}
            style={{ appearance: 'none', cursor: 'pointer' }}>
            <option value="">All Courses</option>
            {coursesData?.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ULI Number</th>
                <th>Course</th>
                <th>Sex</th>
                <th>Contact</th>
                <th>Encoded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-input)', width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : registrants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    No registrants found.
                  </td>
                </tr>
              ) : registrants.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {r.last_name}, {r.first_name} {r.middle_name?.[0] || ''}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.email || '—'}</div>
                  </td>
                  <td className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{r.uli_number}</td>
                  <td>
                    <div className="text-xs max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {r.course_qualification || '—'}
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{r.sex || '—'}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.contact_no || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.encoder_name || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button title="View" className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Eye size={14} />
                      </button>
                      <button title="Archive" onClick={() => handleArchive(r.id, `${r.last_name}, ${r.first_name}`)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Archive size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {pages} · {total} records</span>
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
