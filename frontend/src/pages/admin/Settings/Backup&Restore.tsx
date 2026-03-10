// frontend/src/pages/admin/Settings/BackupRestore.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DatabaseBackup, UploadCloud, Clock, Calendar,
  ShieldCheck, Trash2, Download, RefreshCw, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Schedule = 'daily' | 'weekly';

export default function BackupRestore() {
  const qc = useQueryClient();

  const [schedule, setSchedule]     = useState<Schedule>('daily');
  const [retention, setRetention]   = useState(14);
  const [backupTime, setBackupTime] = useState('02:00');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  // ── Fetch schedule settings ───────────────────────────────────────────────
  const { data: scheduleData } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn:  () => api.get('/admin/backups/schedule').then(r => r.data.data),
  });

  useEffect(() => {
    if (!scheduleData) return;
    setSchedule(scheduleData.schedule   || 'daily');
    setRetention(scheduleData.retention || 14);
    setBackupTime(scheduleData.time     || '02:00');
  }, [scheduleData]);

  // ── Fetch backup list ─────────────────────────────────────────────────────
  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn:  () => api.get('/admin/backups').then(r => r.data.data),
  });

  // ── Save schedule ─────────────────────────────────────────────────────────
  const saveSchedule = useMutation({
    mutationFn: () => api.post('/admin/backups/schedule', { schedule, retention, time: backupTime }),
    onSuccess:  () => toast.success('Schedule saved.'),
    onError:    (e: any) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  // ── Manual backup ─────────────────────────────────────────────────────────
  async function handleManualBackup() {
    setIsBackingUp(true);
    try {
      await api.post('/admin/backups', { type: 'manual' });
      toast.success('Backup created successfully.');
      qc.invalidateQueries({ queryKey: ['backups'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Backup failed.');
    } finally { setIsBackingUp(false); }
  }

  // ── Restore ───────────────────────────────────────────────────────────────
  async function handleRestore() {
    if (!restoreFile) return;
    if (!confirmRestore) return setConfirmRestore(true);
    try {
      const fd = new FormData();
      fd.append('file', restoreFile);
      await api.post('/admin/backups/restore', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Database restored successfully.');
      setRestoreFile(null);
      setConfirmRestore(false);
      qc.invalidateQueries({ queryKey: ['backups'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Restore failed.');
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────
  function handleDownload(filename: string) {
    window.open(`${api.defaults.baseURL}/admin/backups/download/${filename}`, '_blank');
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteBackup = useMutation({
    mutationFn: (filename: string) => api.delete(`/admin/backups/${filename}`),
    onSuccess:  () => { toast.success('Backup deleted.'); qc.invalidateQueries({ queryKey: ['backups'] }); },
    onError:    (e: any) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">Backup & Restore</h1>
        <p className="text-sm mt-1 text-text-muted">Manage database backups and restoration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

        {/* Schedule Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-accent" />
            <h2 className="font-semibold text-sm text-text-primary">Backup Schedule</h2>
          </div>

          <label className="label">Frequency</label>
          <div className="flex gap-2 mb-4">
            {(['daily', 'weekly'] as Schedule[]).map(s => (
              <button
                key={s}
                onClick={() => setSchedule(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${
                  schedule === s
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-input border-border text-text-secondary hover:border-accent/50'
                }`}
              >
                <Calendar size={13} className="inline mr-1.5" />{s}
              </button>
            ))}
          </div>

          <label className="label">
            Backup Time
            <span className="ml-2 text-xs text-text-muted">(24-hour, Asia/Manila)</span>
          </label>
          <input
            type="time"
            className="input-base mb-4"
            value={backupTime}
            onChange={e => setBackupTime(e.target.value)}
          />

          <label className="label">
            Retention Period
            <span className="ml-2 text-xs text-text-muted">(min. 7 days)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={7} max={90} value={retention}
              onChange={e => setRetention(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <div className="w-16 text-center">
              <span className="font-mono font-bold text-text-primary text-sm">{retention}</span>
              <span className="text-xs text-text-muted ml-1">days</span>
            </div>
          </div>

          {retention === 7 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-amber-500">
              <AlertTriangle size={12} /> Minimum retention — consider increasing for safety.
            </div>
          )}
          {retention >= 14 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-accent">
              <ShieldCheck size={12} /> Recommended retention period.
            </div>
          )}

          <button
            className="btn-primary w-full justify-center mt-4 text-sm"
            onClick={() => saveSchedule.mutate()}
            disabled={saveSchedule.isPending}
          >
            {saveSchedule.isPending ? 'Saving...' : 'Save Schedule'}
          </button>
        </motion.div>

        {/* Manual Backup & Restore */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className="card p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DatabaseBackup size={16} className="text-accent" />
              <h2 className="font-semibold text-sm text-text-primary">Manual Backup</h2>
            </div>
            <p className="text-xs text-text-muted mb-3">Create an immediate backup of the current database state.</p>
            <button className="btn-primary w-full justify-center text-sm" onClick={handleManualBackup} disabled={isBackingUp}>
              {isBackingUp
                ? <><RefreshCw size={14} className="animate-spin" /> Creating Backup...</>
                : <><DatabaseBackup size={14} /> Create Backup Now</>}
            </button>
          </div>

          <div className="border-t border-border" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <UploadCloud size={16} className="text-accent" />
              <h2 className="font-semibold text-sm text-text-primary">Restore from File</h2>
            </div>
            <p className="text-xs text-text-muted mb-3">Upload a <span className="font-mono">.sql</span> backup file to restore the database.</p>

            <label className="block w-full cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${
                restoreFile ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
              }`}>
                {restoreFile ? (
                  <>
                    <p className="text-xs font-semibold text-accent">{restoreFile.name}</p>
                    <p className="text-xs text-text-muted mt-1">{(restoreFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={20} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-xs text-text-muted">Click to select a <span className="font-mono">.sql</span> file</p>
                  </>
                )}
              </div>
              <input type="file" accept=".sql" className="hidden"
                onChange={e => { setRestoreFile(e.target.files?.[0] || null); setConfirmRestore(false); }} />
            </label>

            {confirmRestore && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                <AlertTriangle size={12} className="inline mr-1.5" />
                This will <strong>overwrite all current data</strong>. Click Restore again to confirm.
              </div>
            )}

            <button
              className={`w-full justify-center mt-3 text-sm py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                restoreFile
                  ? confirmRestore ? 'bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'
                  : 'btn-ghost opacity-50 cursor-not-allowed'
              }`}
              onClick={handleRestore} disabled={!restoreFile}
            >
              <UploadCloud size={14} />
              {confirmRestore ? 'Confirm Restore' : 'Restore Database'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Backup History */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-accent" />
            <h2 className="font-semibold text-sm text-text-primary">Backup History</h2>
          </div>
          <span className="text-xs text-text-muted">{backups.length} backups stored</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th><th>Type</th><th>Size</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-text-muted">Loading...</td></tr>
              ) : backups.map((b: any) => (
                <tr key={b.name}>
                  <td className="font-mono text-xs text-text-secondary">{b.name}</td>
                  <td><span className={`badge ${b.type === 'auto' ? 'badge-blue' : 'badge-green'}`}>{b.type}</span></td>
                  <td className="text-xs text-text-muted">{b.size}</td>
                  <td className="text-xs text-text-muted">{new Date(b.created_at).toLocaleString('en-PH')}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button title="Download"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                        onClick={() => handleDownload(b.name)}>
                        <Download size={14} />
                      </button>
                      <button title="Delete"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                        onClick={() => deleteBackup.mutate(b.name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
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