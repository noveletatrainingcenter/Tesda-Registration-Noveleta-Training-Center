// frontend/src/pages/admin/Settings/AuditTrail.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';

function actionBadge(action: string) {
  const a = action?.toLowerCase();
  if (a?.includes('delete') || a?.includes('archive')) return 'badge badge-audit-delete';
  if (a?.includes('create') || a?.includes('register')) return 'badge badge-audit-create';
  if (a?.includes('update') || a?.includes('edit'))     return 'badge badge-audit-update';
  return 'badge badge-blue';
}

export default function AuditTrail() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit'],
    queryFn: () =>
      api.get('/admin/audit-logs', { params: { limit: 50 } }).then(r => r.data.data),
  });

  return (
    <div className="max-w-6xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Audit Trail</h1>
          <p className="text-sm mt-1 text-text-muted">
            A log of all user actions across the system.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

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
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.map((l: any) => (
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
      </motion.div>

    </div>
  );
}