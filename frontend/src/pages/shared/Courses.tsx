// frontend/src/pages/shared/Courses.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, CheckCircle, Edit2, Archive,
  BookOpen, Tag, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTORS = [
  'Agriculture, Forestry and Fishery',
  'Automotive and Land Transportation',
  'Construction',
  'Electrical and Electronics',
  'Food and Beverage',
  'Garments, Textiles and Leather Industries',
  'Health Social and Other Community Development Services',
  'ICT',
  'Language and Related Services',
  'Metals and Engineering',
  'Personal Services',
  'Tourism (Hotel and Restaurant)',
  'Visual Arts and Graphic Design',
  'Wholesale and Retail Trading / Services',
  'Others',
];

const emptyCourse: CourseForm = {
  name: '',
  sector: '',
  description: '',
  is_active: true,
};

// ─── Helper ───────────────────────────────────────────────────────────────────
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

// ─── Course Form Modal ────────────────────────────────────────────────────────
function CourseModal({ course, onClose }: { course?: Course; onClose: () => void }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="card w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEdit ? 'Edit Course' : 'Add New Course'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Course / Qualification record</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <Field label="Course / Qualification Name" required>
            <input
              className="input-base"
              placeholder="e.g. Computer Systems Servicing NC II"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>

          <Field label="Sector / Industry">
            <select
              className="input-base"
              value={form.sector}
              onChange={e => set('sector', e.target.value)}
            >
              <option value="">— Select Sector —</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Description / Remarks">
            <textarea
              className="input-base min-h-[80px] resize-y"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the course..."
            />
          </Field>

          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-bg-input">
            <div>
              <p className="text-sm font-medium text-text-primary">Active</p>
              <p className="text-xs text-text-muted">This course is currently offered</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={clsx('transition-colors', form.is_active ? 'text-accent' : 'text-text-muted')}
            >
              {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmitClick} disabled={loading}>
            {loading
              ? 'Saving...'
              : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Add Course'}</>
            }
          </button>
        </div>
      </motion.div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h2 className="text-base font-semibold text-text-primary mb-2">
                {isEdit ? 'Save Changes?' : 'Add Course?'}
              </h2>
              <p className="text-sm text-text-muted mb-5">
                Please confirm the course details are correct.
              </p>
              <div className="flex justify-end gap-3">
                <button className="btn-ghost" onClick={() => setShowConfirm(false)} disabled={loading}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={doSubmit} disabled={loading}>
                  {loading ? 'Saving...' : <><CheckCircle size={14} /> Confirm</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Courses() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [sectorFilter, setSector] = useState('');
  const [page, setPage]           = useState(1);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Course | null>(null);
  const [archiving, setArchiving] = useState<Course | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search, sectorFilter],
    queryFn: () =>
      api.get('/courses', { params: { page, limit: 15, search, sector: sectorFilter } }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/courses/${id}/toggle`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Status updated.');
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const archiveMut = useMutation({
    mutationFn: (id: number) => api.patch(`/courses/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course archived.');
      setArchiving(null);
    },
    onError: () => toast.error('Failed to archive.'),
  });

  const courses: Course[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title">Courses & Qualifications</h1>
          <p className="text-sm text-text-muted mt-1">Manage TESDA course offerings</p>
        </div>
        <button
          className="btn-primary shrink-0"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <Plus size={15} /> Add Course
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9"
              placeholder="Search by name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-base max-w-xs"
            value={sectorFilter}
            onChange={e => { setSector(e.target.value); setPage(1); }}
          >
            <option value="">All Sectors</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {([
          { label: 'Total Courses', value: total,                                    icon: BookOpen,    color: 'text-accent'     },
          { label: 'Active',        value: courses.filter(c => c.is_active).length,  icon: CheckCircle, color: 'text-green-400'  },
          { label: 'Sectors',       value: new Set(courses.map(c => c.sector)).size, icon: Tag,         color: 'text-blue-400'   },
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
                <th className="text-left px-4 py-3 text-text-muted font-medium text-xs">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-text-muted">Loading...</td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-text-muted">No courses found.</td>
                </tr>
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
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[200px] truncate">
                    {c.sector || '—'}
                  </td>
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
                      {c.is_active
                        ? <><ToggleRight size={12} /> Active</>
                        : <><ToggleLeft size={12} /> Inactive</>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        title="Edit"
                        onClick={() => { setEditing(c); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-input transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        title="Archive"
                        onClick={() => setArchiving(c)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-bg-input transition-colors"
                      >
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">
              Showing {courses.length} of {total} courses
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost py-1 px-2 text-xs"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="text-xs text-text-muted">Page {page} of {pages}</span>
              <button
                className="btn-ghost py-1 px-2 text-xs"
                disabled={page === pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <CourseModal
            course={editing ?? undefined}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
        {archiving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h2 className="text-base font-semibold text-text-primary mb-2">Archive Course?</h2>
              <p className="text-sm text-text-muted mb-5">
                Are you sure you want to archive <strong>{archiving.name}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button className="btn-ghost" onClick={() => setArchiving(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary bg-red-500 border-red-500 hover:bg-red-600"
                  onClick={() => archiveMut.mutate(archiving.id)}
                  disabled={archiveMut.isPending}
                >
                  <Archive size={14} /> Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}