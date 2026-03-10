// frontend/src/pages/shared/Reports.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Eye, Archive, Filter, RefreshCw, FilePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function Reports() {
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [course, setCourse] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registrants', page, search, course],
    queryFn: () =>
      api.get('/registrants', { params: { page, limit: 15, search, course } }).then(r => r.data),
    staleTime: 10000,
  });

  // Only fetch courses for admin (used in the course filter dropdown)
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/admin/courses').then(r => r.data.data),
    enabled: isAdmin,
  });

  async function handleArchive(id: number, name: string) {
    if (!confirm(`Archive ${name}?`)) return;
    try {
      await api.patch(`/registrants/${id}/archive`);
      toast.success('Registrant archived.');
      refetch();
    } catch {
      toast.error('Failed to archive.');
    }
  }

  const registrants = data?.data  || [];
  const total       = data?.total || 0;
  const pages       = data?.pages || 1;

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">
            {isAdmin ? 'Reports' : 'Registration Records'}
          </h1>
          <p className="text-sm mt-1 text-text-muted">
            {isAdmin
              ? `All learner registrations · ${total} total`
              : `${total} total registrants`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm">
            <RefreshCw size={14} />
            {isAdmin && <span className="ml-1">Refresh</span>}
          </button>
          {!isAdmin && (
            <Link to="/encoder/register" className="btn-primary text-sm">
              <FilePlus size={14} /> New
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input-base pl-9"
            placeholder="Search by name, ULI, or contact number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Course filter — admin only */}
        {isAdmin && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <select
              className="input-base pl-9 min-w-[180px]"
              value={course}
              onChange={e => { setCourse(e.target.value); setPage(1); }}
            >
              <option value="">All Courses</option>
              {coursesData?.map((c: any) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ULI Number</th>
                <th>Course</th>
                <th>Sex</th>
                {isAdmin && <th>Civil Status</th>}
                <th>Contact</th>
                {isAdmin && <th>Encoded By</th>}
                <th>Date</th>
                <th>{isAdmin ? 'Actions' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(isAdmin ? 6 : 8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(isAdmin ? 9 : 8)].map((_, j) => (
                      <td key={j}>
                        <div className={`skeleton ${isAdmin ? 'skeleton-wide' : ''}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : registrants.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-14">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-xs text-text-muted">No registrants found.</div>
                    {!isAdmin && (
                      <div className="mt-2">
                        <Link to="/encoder/register" className="text-sm text-accent hover:underline">
                          Register the first learner →
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ) : registrants.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-semibold text-sm text-text-primary">
                      {r.last_name}, {r.first_name} {r.middle_name?.[0] ? r.middle_name[0] + '.' : ''}
                    </div>
                    <div className="text-xs text-text-muted">{r.email || '—'}</div>
                  </td>
                  <td className="font-mono text-xs text-text-secondary">{r.uli_number}</td>
                  <td>
                    <div className="text-xs text-text-secondary max-w-[140px] truncate">
                      {r.course_qualification || '—'}
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{r.sex || '—'}</span></td>
                  {isAdmin && (
                    <td className="text-xs text-text-secondary">{r.civil_status || '—'}</td>
                  )}
                  <td className="text-xs text-text-secondary">{r.contact_no || '—'}</td>
                  {isAdmin && (
                    <td className="text-xs text-text-muted">{r.encoder_name || '—'}</td>
                  )}
                  <td className="text-xs text-text-muted">
                    {new Date(r.created_at).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          title="Archive"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                          onClick={() => handleArchive(r.id, `${r.last_name}, ${r.first_name}`)}
                        >
                          <Archive size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">
              Page {page} of {pages}{isAdmin && ` · ${total} records`}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost text-xs py-1.5 px-3"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <button
                className="btn-ghost text-xs py-1.5 px-3"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}