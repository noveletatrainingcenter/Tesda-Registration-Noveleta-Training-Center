// frontend/src/pages/admin/Settings/AuditTrail.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function actionBadge(action: string) {
  const a = action?.toLowerCase();
  if (a?.includes('delete') || a?.includes('archive')) return 'badge badge-audit-delete';
  if (a?.includes('create') || a?.includes('register')) return 'badge badge-audit-create';
  if (a?.includes('update') || a?.includes('edit'))     return 'badge badge-audit-update';
  return 'badge badge-blue';
}

export default function AuditTrail() {
  const [page, setPage]         = useState(1);
  const [limit, setLimit]       = useState(10);
  const [search, setSearch]     = useState('');
  const [action, setAction]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', page, limit, search, action, dateFrom, dateTo],
    queryFn: () =>
      api.get('/admin/audit-logs', {
        params: {
          page, limit,
          search:    search   || undefined,
          action:    action   || undefined,
          date_from: dateFrom || undefined,
          date_to:   dateTo   || undefined,
        },
      }).then(r => r.data),
    staleTime: 10000,
  });

  const logs  = data?.data  || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  function clearFilters() {
    setSearch(''); setAction('');
    setDateFrom(''); setDateTo('');
    setPage(1);
  }

  const hasFilters = !!(search || action || dateFrom || dateTo);

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Audit Trail</h1>
          <p className="text-sm mt-1 text-text-muted">
            A log of all user actions across the system.{total > 0 && ` ${total} total records.`}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters - FIXED */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search input - fixed */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              placeholder="Search user or details…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          
          {/* Action dropdown - fixed */}
          <select
            className="w-full h-10 px-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all cursor-pointer appearance-none"
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '16px'
            }}
          >
            <option value="">All Actions</option>
            <option value="create">Create / Register</option>
            <option value="update">Update / Edit</option>
            <option value="delete">Delete / Archive</option>
            <option value="login">Login</option>
          </select>
          
          {/* Date From - fixed */}
          <input
            type="date" 
            className="w-full h-10 px-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          />
          
          {/* Date To - fixed */}
          <input
            type="date" 
            className="w-full h-10 px-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost text-xs mt-3 text-red-400 hover:text-red-500">
            ✕ Clear all filters
          </button>
        )}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th><th>Action</th><th>Module</th>
                <th>Details</th><th>IP</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(limit)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-text-muted text-sm">
                    No audit logs found.
                  </td>
                </tr>
              ) : logs.map((l: any) => (
                <tr key={l.id}>
                  <td className="text-sm text-text-primary">{l.user_name}</td>
                  <td><span className={actionBadge(l.action)}>{l.action}</span></td>
                  <td className="text-xs text-text-secondary">{l.module}</td>
                  <td className="text-xs text-text-muted max-w-[280px] break-words whitespace-normal leading-relaxed">
                    {l.details || '—'}
                  </td>
                  <td className="font-mono text-xs text-text-secondary">{l.ip_address}</td>
                  <td className="text-xs text-text-muted">
                    {new Date(l.created_at).toLocaleString('en-PH')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Rows per page:</span>
            <select
              className="text-xs py-1 px-2 rounded-lg border border-border bg-bg-input text-text-primary w-16 cursor-pointer"
              value={limit}
              onChange={e => handleLimitChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <span className="text-xs text-text-muted ml-5">
            {total === 0 ? '0–0 of 0' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
          </span>
          <button className="btn-ghost text-xs py-1.5 px-3" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={13} /> Prev
          </button>
          <button className="btn-ghost text-xs py-1.5 px-3" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>

    </div>
  );
}