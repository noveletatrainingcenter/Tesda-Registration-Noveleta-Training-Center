// frontend/src/pages/shared/Reports.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Eye, Archive, Filter, RefreshCw, FilePlus, ArrowLeft, Pencil } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function Reports() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const user     = useAuthStore(state => state.user);
  const isAdmin  = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [course, setCourse] = useState('');
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);

  // ── List query (only runs on list view) ──────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registrations', page, search, course],
    queryFn: () =>
      api.get('/registrations', { params: { page, limit: 15, search, course } }).then(r => r.data),
    staleTime: 10000,
    enabled: !id,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/admin/courses').then(r => r.data.data),
    enabled: isAdmin,
  });

  // ── Single record query (only runs on detail view) ────────────────────────
  const { data: single, isLoading: singleLoading } = useQuery({
    queryKey: ['registration', id],
    queryFn: () => api.get(`/registrations/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  async function handleArchive(rid: number) {
    try {
      await api.patch(`/registrations/${rid}/archive`);
      toast.success('Registration archived.');
      setConfirmArchiveId(null);
      refetch();
    } catch {
      toast.error('Failed to archive.');
    }
  }

  const registrations = data?.data  || [];
  const total         = data?.total || 0;
  const pages         = data?.pages || 1;

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (id) {
    if (singleLoading || !single) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="skeleton h-10 w-48 mb-6 rounded-xl" />
          <div className="card p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
          </div>
        </div>
      );
    }

    const r = single;
    const fields: [string, string | number | null | undefined][] = [
      ['Course / Qualification', r.course_qualification],
      ['Scholarship',            r.scholarship_type],
      ['Sex',                    r.sex],
      ['Civil Status',           r.civil_status],
      ['Contact No.',            r.contact_no],
      ['Email',                  r.email],
      ['Nationality',            r.nationality],
      ['Employment Status',      r.employment_status],
      ['Employment Type',        r.employment_type],
      ['Birthdate',              r.birth_month && r.birth_day && r.birth_year ? `${r.birth_month} ${r.birth_day}, ${r.birth_year}` : null],
      ['Age',                    r.age],
      ['Birthplace',             [r.birthplace_city, r.birthplace_province, r.birthplace_region].filter(Boolean).join(', ')],
      ['Region',                 r.address_region],
      ['Province',               r.address_province],
      ['City / Municipality',    r.address_city],
      ['Barangay',               r.address_barangay],
      ['Street',                 r.address_street],
      ['Subdivision',            r.address_subdivision],
      ['Educational Attainment', r.educational_attainment],
      ['Parent / Guardian',      r.parent_guardian_name],
      ['Guardian Address',       r.parent_guardian_address],
      ['Client Classification',  r.client_classification],
      ['Disability',             r.has_disability ? `${r.disability_type || '—'} · ${r.disability_cause || '—'}` : 'None'],
      ['Privacy Consent',        r.privacy_consent ? 'Agreed' : 'Disagreed'],
      ['Encoded By',             r.encoder_name],
      ['Date Registered',        new Date(r.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })],
    ];

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex-1">
            <h1 className="section-title">
              {r.last_name}, {r.first_name} {r.middle_name ? r.middle_name[0] + '.' : ''}
              {r.extension_name ? ` ${r.extension_name}` : ''}
            </h1>
            <p className="text-xs text-text-muted font-mono mt-0.5">{r.uli_number}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate(`/admin/reports/${id}/edit`)}
              className="btn-primary text-sm"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>

        {/* Fields grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5"
        >
          {fields.map(([label, value]) => (
            <div key={label}>
              <div className="label text-xs mb-0.5">{label}</div>
              <div className="text-sm text-text-primary font-medium">
                {value || <span className="text-text-muted font-normal">—</span>}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
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
              : `${total} total registrations`}
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
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-14">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-xs text-text-muted">No registrations found.</div>
                    {!isAdmin && (
                      <div className="mt-2">
                        <Link to="/encoder/register" className="text-sm text-accent hover:underline">
                          Register the first learner →
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ) : registrations.map((r: any) => (
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
                        onClick={() => navigate(isAdmin ? `/admin/reports/${r.id}` : `/encoder/reports/${r.id}`)}
                      >
                        <Eye size={14} />
                      </button>
                      {isAdmin && (
                        confirmArchiveId === r.id ? (
                          <>
                            <button
                              title="Cancel"
                              className="px-2 h-7 rounded-lg text-xs font-medium btn-ghost transition-colors"
                              onClick={() => setConfirmArchiveId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              title="Confirm Archive"
                              className="px-2 h-7 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                              onClick={() => handleArchive(r.id)}
                            >
                              Confirm
                            </button>
                          </>
                        ) : (
                          <button
                            title="Archive"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                            onClick={() => setConfirmArchiveId(r.id)}
                          >
                            <Archive size={14} />
                          </button>
                        )
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