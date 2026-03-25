// frontend/src/pages/shared/Courses.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, CheckCircle, Edit2, Archive, Trash2,
  BookOpen, Tag, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight,
  Layers, RefreshCw, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CourseForm {
  name: string;
  sector: string;
  description: string;
  is_active: boolean;
}
interface Course extends CourseForm {
  id: number;
  created_by_name?: string;
  created_at?: string;
  status?: string;
}
interface Sector {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyCourse: CourseForm = { name: '', sector: '', description: '', is_active: true };

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-accent"> *</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger = false, loading = false,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="card p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            danger ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent')}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-text-primary leading-snug">{title}</h3>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={clsx('btn-primary', danger && 'bg-red-500 border-red-500 hover:bg-red-600')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Course Modal ─────────────────────────────────────────────────────────────
function CourseModal({
  course, sectors, onClose,
}: {
  course?: Course; sectors: Sector[]; onClose: () => void;
}) {
  const isEdit = !!course;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CourseForm>({ ...emptyCourse, ...(course ?? {}) });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function set<K extends keyof CourseForm>(key: K, val: CourseForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmitClick() {
    if (!form.name.trim()) return toast.error('Course name is required.');
    setShowConfirm(true);
  }

  async function doSubmit() {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/courses/${course!.id}`, form);
        toast.success('Course updated successfully.');
      } else {
        await api.post('/courses', form);
        toast.success('Course added successfully.');
      }
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowConfirm(false);
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save.');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  const activeSectors = sectors.filter(s => s.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="card w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEdit ? 'Edit Course' : 'Add New Course'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Course / Qualification record</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Course / Qualification Name" required>
            <input className="input-base" placeholder="e.g. Computer Systems Servicing NC II"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Sector / Industry">
            <select className="input-base" value={form.sector} onChange={e => set('sector', e.target.value)}>
              <option value="">— Select Sector —</option>
              {activeSectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              {activeSectors.length === 0 && (
                <option disabled>No active sectors — add one in the Sectors tab</option>
              )}
            </select>
          </Field>
          <Field label="Description / Remarks">
            <textarea className="input-base min-h-[80px] resize-y"
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the course..." />
          </Field>
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-bg-input">
            <div>
              <p className="text-sm font-medium text-text-primary">Active</p>
              <p className="text-xs text-text-muted">This course is currently offered</p>
            </div>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={clsx('transition-colors', form.is_active ? 'text-accent' : 'text-text-muted')}>
              {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmitClick} disabled={loading}>
            {loading ? 'Saving...' : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Add Course'}</>}
          </button>
        </div>
      </motion.div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title={isEdit ? 'Save Changes?' : 'Add Course?'}
        description="Please confirm the course details are correct."
        confirmLabel={isEdit ? 'Save Changes' : 'Add Course'}
        loading={loading}
      />
    </div>
  );
}

// ─── Sector Modal ─────────────────────────────────────────────────────────────
function SectorModal({ sector, onClose }: { sector?: Sector; onClose: () => void }) {
  const isEdit = !!sector;
  const queryClient = useQueryClient();
  const [name, setName] = useState(sector?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function doSubmit() {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/sectors/${sector!.id}`, { name });
        toast.success('Sector updated.');
      } else {
        await api.post('/sectors', { name });
        toast.success('Sector added.');
      }
      await queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setShowConfirm(false);
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save.');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitClick() {
    if (!name.trim()) return toast.error('Sector name is required.');
    setShowConfirm(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="card w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEdit ? 'Edit Sector' : 'Add New Sector'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Industry / Sector classification</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <Field label="Sector Name" required>
            <input
              className="input-base"
              placeholder="e.g. ICT"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmitClick(); }}
              autoFocus
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmitClick} disabled={loading}>
            {loading ? 'Saving...' : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Add Sector'}</>}
          </button>
        </div>
      </motion.div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title={isEdit ? 'Save Changes?' : 'Add Sector?'}
        description="Please confirm the sector details are correct."
        confirmLabel={isEdit ? 'Save Changes' : 'Add Sector'}
        loading={loading}
      />
    </div>
  );
}

// ─── Sectors Tab Panel ────────────────────────────────────────────────────────
function SectorsPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'toggle' | 'delete'; sector: Sector;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sectors', 'all'],
    queryFn: () => api.get('/sectors', { params: { includeInactive: true } }).then(r => r.data),
  });

  const sectors: Sector[] = data?.data ?? [];
  const filtered = sectors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = sectors.filter(s => s.is_active).length;

  async function handleConfirm() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'toggle') {
        await api.patch(`/sectors/${confirmAction.sector.id}/toggle`, { is_active: !confirmAction.sector.is_active });
        toast.success('Sector status updated.');
      } else {
        await api.delete(`/sectors/${confirmAction.sector.id}`);
        toast.success('Sector deleted.');
      }
      await queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setConfirmAction(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        loading={actionLoading}
        danger={confirmAction?.type === 'delete'}
        title={
          confirmAction?.type === 'delete'
            ? 'Delete Sector?'
            : confirmAction?.sector.is_active ? 'Deactivate Sector?' : 'Activate Sector?'
        }
        description={
          confirmAction?.type === 'delete'
            ? `"${confirmAction?.sector.name}" will be permanently deleted. This cannot be undone.`
            : `Change status of "${confirmAction?.sector.name}"?`
        }
        confirmLabel={
          confirmAction?.type === 'delete'
            ? 'Delete'
            : confirmAction?.sector.is_active ? 'Deactivate' : 'Activate'
        }
      />

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="card p-3 flex items-center gap-2">
            <Tag size={15} className="text-accent" />
            <div>
              <p className="text-xs text-text-muted">Total Sectors</p>
              <p className="text-base font-bold text-text-primary">{sectors.length}</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-2">
            <CheckCircle size={15} className="text-green-400" />
            <div>
              <p className="text-xs text-text-muted">Active</p>
              <p className="text-base font-bold text-text-primary">{activeCount}</p>
            </div>
          </div>
        </div>
        <button className="btn-primary shrink-0" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={15} /> Add Sector
        </button>
      </div>

      {/* Search */}
      <div className="card p-3 mb-3">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
            placeholder="Search sectors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Sector Name</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Status</th>
                <th className="px-4 py-3 text-text-muted font-medium text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="text-center py-10 text-text-muted">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-text-muted">No sectors found.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg-input transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Tag size={12} />
                      </div>
                      <span className="font-medium text-text-primary">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmAction({ type: 'toggle', sector: s })}
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                        s.is_active
                          ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                          : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                      )}
                    >
                      {s.is_active
                        ? <><ToggleRight size={12} /> Active</>
                        : <><ToggleLeft size={12} /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        title="Edit"
                        onClick={() => { setEditing(s); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-input transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setConfirmAction({ type: 'delete', sector: s })}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-bg-input transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <SectorModal
            sector={editing ?? undefined}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Courses Tab Panel ────────────────────────────────────────────────────────
function CoursesPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [sectorFilter, setSector] = useState('');
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(10);
  const [tab, setTab]             = useState<'active' | 'archived'>('active');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Course | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'archive' | 'restore' | 'delete'; course: Course;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => api.get('/sectors', { params: { includeInactive: false } }).then(r => r.data),
  });
  const sectors: Sector[] = sectorsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, limit, search, sectorFilter, tab],
    queryFn: () =>
      api.get('/courses', { params: { page, limit, search, sector: sectorFilter, status: tab } }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/courses/${id}/toggle`, { is_active }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courses'] }); toast.success('Status updated.'); },
    onError: () => toast.error('Failed to update status.'),
  });

  const courses: Course[] = data?.data  ?? [];
  const total              = data?.total ?? 0;
  const pages              = data?.pages ?? 1;

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'archive') {
        await api.patch(`/courses/${confirmAction.course.id}/archive`);
        toast.success('Course archived.');
      } else if (confirmAction.type === 'restore') {
        await api.patch(`/courses/${confirmAction.course.id}/restore`);
        toast.success('Course restored.');
      } else {
        await api.delete(`/courses/${confirmAction.course.id}`);
        toast.success('Course deleted.');
      }
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      setConfirmAction(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        loading={actionLoading}
        danger={confirmAction?.type === 'delete'}
        title={
          confirmAction?.type === 'archive' ? 'Archive Course?' :
          confirmAction?.type === 'restore' ? 'Restore Course?' : 'Delete Course?'
        }
        description={
          confirmAction?.type === 'archive'
            ? `"${confirmAction?.course.name}" will be moved to archived. You can restore it later.`
            : confirmAction?.type === 'restore'
            ? `"${confirmAction?.course.name}" will be moved back to active.`
            : `"${confirmAction?.course.name}" will be permanently deleted. This cannot be undone.`
        }
        confirmLabel={
          confirmAction?.type === 'archive' ? 'Archive' :
          confirmAction?.type === 'restore' ? 'Restore' : 'Delete'
        }
      />

      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        {(['active', 'archived'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
              tab === t ? 'btn-primary' : 'btn-ghost'
            )}
          >
            {t === 'archived' && <Archive size={13} />}
            {t === 'active' ? 'Active' : 'Archived'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              placeholder="Search by name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="w-full sm:w-64 h-10 px-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all cursor-pointer appearance-none"
            value={sectorFilter}
            onChange={e => { setSector(e.target.value); setPage(1); }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '16px',
            }}
          >
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {([
          { label: 'Total Courses', value: total,                                    icon: BookOpen,    color: 'text-accent'    },
          { label: 'Active',        value: courses.filter(c => c.is_active).length,  icon: CheckCircle, color: 'text-green-400' },
          { label: 'Sectors Used',  value: new Set(courses.map(c => c.sector)).size, icon: Tag,         color: 'text-blue-400'  },
        ] as const).map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <Icon size={18} className={color} />
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-lg font-bold text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Course / Qualification</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Sector</th>
                {tab === 'active' && <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Status</th>}
                <th className="px-4 py-3 text-text-muted font-medium text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={tab === 'active' ? 4 : 3} className="text-center py-12 text-text-muted">Loading...</td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan={tab === 'active' ? 4 : 3} className="text-center py-12 text-text-muted">
                  {tab === 'archived' ? 'No archived courses.' : 'No courses found.'}
                </td></tr>
              ) : courses.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg-input transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <BookOpen size={13} />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary leading-tight">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-text-muted truncate max-w-[300px]">{c.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[200px] truncate">{c.sector || '—'}</td>
                  {tab === 'active' && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          c.is_active
                            ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                            : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                        )}
                      >
                        {c.is_active ? <><ToggleRight size={12} /> Active</> : <><ToggleLeft size={12} /> Inactive</>}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {tab === 'active' ? (
                        <>
                          <button title="Edit" onClick={() => { setEditing(c); setShowForm(true); }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-input transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button title="Archive" onClick={() => setConfirmAction({ type: 'archive', course: c })}
                            className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-bg-input transition-colors">
                            <Archive size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button title="Restore" onClick={() => setConfirmAction({ type: 'restore', course: c })}
                            className="p-1.5 rounded-lg text-text-muted hover:text-green-400 hover:bg-bg-input transition-colors">
                            <RefreshCw size={14} />
                          </button>
                          <button title="Delete permanently" onClick={() => setConfirmAction({ type: 'delete', course: c })}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-bg-input transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
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
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <CourseModal
            course={editing ?? undefined}
            sectors={sectors}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      {/* Add Course button — only on active tab */}
      {tab === 'active' && (
        <div className="flex justify-end mt-4">
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={15} /> Add Course
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = 'courses' | 'sectors';

export default function Courses() {
  const [activeTab, setActiveTab] = useState<Tab>('courses');

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: 'courses', label: 'Courses & Qualifications', icon: BookOpen },
    { key: 'sectors', label: 'Sectors',                  icon: Layers  },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">Courses & Qualifications</h1>
        <p className="text-sm text-text-muted mt-1">Manage TESDA course offerings and sector classifications</p>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'courses' ? <CoursesPanel /> : <SectorsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}