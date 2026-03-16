// frontend/src/pages/shared/Reports.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, ChevronDown, ChevronUp, Plus, Printer,
  Check, AlertCircle, User, Building2, BookOpen, Briefcase,
  CheckCircle2, ChevronRight, ChevronLeft, Save, Eye,
  Archive, RefreshCw, AlertTriangle, Pencil,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const INSTITUTION_TYPES = ['Public', 'Private', 'TESDA'];

const INDUSTRY_SECTORS = [
  'Agriculture, Forestry and Fishing',
  'Arts and Crafts',
  'Automotive and Land Transportation',
  'Business and Management',
  'Construction',
  'Electrical and Electronics',
  'Fashion Design and Apparel',
  'Food and Beverage',
  'Health Social and Other Community Development Services',
  'ICT',
  'Infrastructure including Rail',
  'Land Transportation',
  'Metals and Engineering',
  'Tourism (Hotel and Restaurant)',
  'Utilities (Water, Gas and Waste Management)',
  'Wholesale and Retail Trading / Services',
  'Others',
];

const SECTOR_CODES: Record<string, string> = {
  'Agriculture, Forestry and Fishing':                      'AG',
  'Arts and Crafts':                                        'AC',
  'Automotive and Land Transportation':                     'AT',
  'Business and Management':                                'BM',
  'Construction':                                           'CN',
  'Electrical and Electronics':                             'EE',
  'Fashion Design and Apparel':                             'FD',
  'Food and Beverage':                                      'FB',
  'Health Social and Other Community Development Services': 'HS',
  'ICT':                                                    'IC',
  'Infrastructure including Rail':                          'IR',
  'Land Transportation':                                    'LT',
  'Metals and Engineering':                                 'ME',
  'Tourism (Hotel and Restaurant)':                        'TR',
  'Utilities (Water, Gas and Waste Management)':            'UT',
  'Wholesale and Retail Trading / Services':                'WR',
  'Others':                                                 'OT',
};

const CLIENT_TYPES = [
  'Employed', 'Underemployed', 'Unemployed',
  'Self-Employed', 'Student', 'OFW', 'Others',
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TraineeExtra {
  registration_id:         number;
  student_id_number:       string;
  pgs_training_component:  string;
  voucher_number:          string;
  client_type:             string;
  date_started:            string;
  date_finished:           string;
  reason_not_finishing:    string;
  assessment_results:      string;
  employment_date:         string;
  employer_name:           string;
  employer_address:        string;
  // ── Per-trainee TVET Provider ──
  region:                  string;
  province:                string;
  district:                string;
  municipality:            string;
  provider_name:           string;
  tbp_id:                  string;
  address:                 string;
  institution_type:        string;
  classification:          string;
  full_qualification:      string;
  qualification_clustered: string;
  // ── Per-trainee Program Profile ──
  qualification_ntr:       string;
  copr_number:             string;
  industry_sector:         string;
  industry_sector_other:   string;
  delivery_mode:           string;
}

function emptyExtra(id: number): TraineeExtra {
  return {
    registration_id: id,
    student_id_number: '',
    pgs_training_component: '', voucher_number: '', client_type: '',
    date_started: '', date_finished: '', reason_not_finishing: '',
    assessment_results: '', employment_date: '', employer_name: '', employer_address: '',
    // Provider defaults (pre-filled for convenience)
    region: 'REGION 4A', province: 'CAVITE', district: 'District I',
    municipality: 'Noveleta', provider_name: 'Noveleta Training Center',
    tbp_id: '', address: 'Poblacion, Noveleta Cavite',
    institution_type: 'Public', classification: 'LGU',
    full_qualification: '', qualification_clustered: '',
    // Program defaults
    qualification_ntr: '', copr_number: '',
    industry_sector: '', industry_sector_other: '', delivery_mode: '',
  };
}

// ProviderInfo now only holds report-level info + signatories
interface ProviderInfo {
  title:            string;
  program_title:    string;
  prepared_by_left: string;
  prepared_by_right:string;
  nclc_admin:       string;
}

// ProgramInfo kept for backward compat (used in step 0 sector filter only)
interface ProgramInfo {
  qualification_ntr:     string;
  copr_number:           string;
  industry_sector:       string;
  industry_sector_other: string;
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  open:          boolean;
  onClose:       () => void;
  onConfirm:     () => void;
  title:         string;
  description:   string;
  confirmLabel?: string;
}

function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm' }: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{   opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto w-full max-w-sm card p-6 shadow-2xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-accent/10 text-accent">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary leading-snug">{title}</h3>
                  <p className="text-sm text-text-muted mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
                 <button className="btn-primary text-sm" onClick={onConfirm}>
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="label text-xs mb-1 block">
        {label}{required && <span className="text-accent"> *</span>}
      </label>
      {children}
    </div>
  );
}
function Inp({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input className={clsx('input-base text-sm', className)}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  );
}
function Sel({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select className="input-base text-sm" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder ?? '— Select —'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Select Course',     icon: BookOpen   },
  { label: 'Select Applicants', icon: User       },
  { label: 'Training Details',  icon: Briefcase  },
  { label: 'Signatories',       icon: User       },
  { label: 'Review & Print',    icon: FileText   },
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 — Select Course (for sectorCode derivation only now)
// ─────────────────────────────────────────────────────────────────────────────
function StepSelectCourse({
  selectedCourse, setSelectedCourse,
  programInfo, setProgramInfo,
}: {
  selectedCourse: any;
  setSelectedCourse: (c: any) => void;
  programInfo: ProgramInfo;
  setProgramInfo: (p: ProgramInfo) => void;
}) {
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses-active'],
    queryFn: () => api.get('/courses', { params: { status: 'active', limit: 100 } }).then(r => r.data.data),
    staleTime: 60000,
  });
  const courses: any[] = coursesData || [];

  function handleSectorChange(v: string) {
    setProgramInfo({
      ...programInfo,
      industry_sector: v,
      industry_sector_other: v !== 'Others' ? '' : programInfo.industry_sector_other,
    });
    if (selectedCourse?.sector && selectedCourse.sector !== v) {
      setSelectedCourse(null);
    }
  }

  const filteredCourses = courses.filter((c: any) => {
    if (!programInfo.industry_sector) return false;
    if (!c.sector) return true;
    return c.sector === programInfo.industry_sector;
  });

  function isSelected(c: any) {
    if (!selectedCourse) return false;
    if (selectedCourse.id && selectedCourse.id === c.id) return true;
    if (selectedCourse.name && selectedCourse.name === c.name) return true;
    return false;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="form-section-title"><FileText size={15} /> Program Details</div>
        <p className="text-xs text-text-muted -mt-2 mb-4">
          Select the industry sector to filter courses. This is used for the Student ID code only.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Industry Sector of Qualification" required>
            <Sel value={programInfo.industry_sector} onChange={handleSectorChange} options={INDUSTRY_SECTORS} />
          </Field>
          {programInfo.industry_sector === 'Others' && (
            <Field label="Please Specify">
              <Inp
                value={programInfo.industry_sector_other}
                onChange={v => setProgramInfo({ ...programInfo, industry_sector_other: v })}
                placeholder="Specify sector"
              />
            </Field>
          )}
        </div>
      </div>

      {programInfo.industry_sector && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="form-section-title"><BookOpen size={15} /> Select Course / Training Program</div>
          <p className="text-xs text-text-muted -mt-2">
            Showing courses for <span className="text-accent font-medium">{programInfo.industry_sector}</span>.
            {filteredCourses.length === 0 && !isLoading && ' No matching courses — check that your courses have a sector assigned.'}
          </p>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-sm border border-dashed border-border rounded-xl">
              No courses found for this sector.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCourses.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  className={clsx(
                    'text-left p-4 rounded-xl border transition-all',
                    isSelected(c)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/50 bg-bg-input hover:bg-accent/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-text-primary leading-snug">{c.name}</div>
                    {isSelected(c) && <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />}
                  </div>
                  {c.sector && <div className="text-xs text-text-muted mt-1">{c.sector}</div>}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Select Applicants
// ─────────────────────────────────────────────────────────────────────────────
function StepSelectApplicants({
  selectedIds, setSelectedIds,
}: {
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['all-applicants-report', search, page],
    queryFn: () => api.get('/registrations', { params: { page, limit: 10, search, status: 'active' } }).then(r => r.data),
    staleTime: 10000,
  });

  const applicants: any[] = data?.data  || [];
  const pages              = data?.pages || 1;
  const total              = data?.total || 0;

  function toggle(id: number) {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  }
  function togglePage() {
    const pageIds     = applicants.map((r: any) => r.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
    else             setSelectedIds([...new Set([...selectedIds, ...pageIds])]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="form-section-title"><User size={15} /> Select Applicants for This Batch</div>
        {selectedIds.length > 0 && <span className="badge badge-blue">{selectedIds.length} selected</span>}
      </div>
      <p className="text-xs text-text-muted -mt-2">
        Select all applicants who attended this training batch.
      </p>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="input-base pl-9 text-sm" placeholder="Search by name, ULI, contact…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" className="rounded"
                  checked={applicants.length > 0 && applicants.every((r: any) => selectedIds.includes(r.id))}
                  onChange={togglePage} />
              </th>
              <th>Name</th><th>ULI</th><th>Contact</th><th>Sex</th><th>Civil Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" /></td>)}</tr>
              ))
            ) : applicants.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-muted text-sm">No applicants found.</td></tr>
            ) : applicants.map((r: any) => (
              <tr key={r.id} onClick={() => toggle(r.id)}
                className={clsx('cursor-pointer transition-colors', selectedIds.includes(r.id) && 'bg-accent/5')}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="rounded"
                    checked={selectedIds.includes(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td>
                  <div className="font-medium text-sm text-text-primary">
                    {r.last_name}, {r.first_name}{r.middle_name ? ` ${r.middle_name[0]}.` : ''}
                  </div>
                  <div className="text-xs text-text-muted">{r.email || '—'}</div>
                </td>
                <td className="font-mono text-xs text-text-secondary">{r.uli_number}</td>
                <td className="text-xs text-text-secondary">{r.contact_no || '—'}</td>
                <td><span className="badge badge-blue text-xs">{r.sex || '—'}</span></td>
                <td className="text-xs text-text-secondary">{r.civil_status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border">
            <span className="text-xs text-text-muted">Page {page} of {pages} · {total} records</span>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs py-1 px-2" disabled={page <= 1}    onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn-ghost text-xs py-1 px-2" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Training Details + TVET Provider + Program Profile per trainee
// ─────────────────────────────────────────────────────────────────────────────
function StepTrainingDetails({
  applicants, extras, setExtras, sectorCode,
}: {
  applicants: any[];
  extras: Record<number, TraineeExtra>;
  setExtras: (e: Record<number, TraineeExtra>) => void;
  sectorCode: string;
}) {
  const [openId, setOpenId] = useState<number | null>(applicants[0]?.id ?? null);

  function setEx(id: number, k: keyof TraineeExtra, v: string) {
    setExtras({ ...extras, [id]: { ...(extras[id] ?? emptyExtra(id)), [k]: v } });
  }
  function getEx(id: number): TraineeExtra { return extras[id] ?? emptyExtra(id); }
  function suggestId(idx: number) { return `NTC-${sectorCode || 'S'}-${String(idx + 1).padStart(4, '0')}`; }

  return (
    <div className="space-y-3">
      <div className="form-section-title"><Briefcase size={15} /> Training Details per Trainee</div>
      <p className="text-xs text-text-muted -mt-2">
        Each trainee has their own TVET Provider, Program Profile, and training details.
      </p>

      {applicants.map((r: any, idx) => {
        const ex         = getEx(r.id);
        const isOpen     = openId === r.id;
        const suggested  = suggestId(idx);
        const isComplete = !!(ex.client_type && ex.date_started && ex.date_finished && ex.provider_name && ex.delivery_mode);

        return (
          <div key={r.id} className="card overflow-hidden">
            {/* Accordion header */}
            <button
              className={clsx(
                'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                isOpen ? 'bg-accent/5 border-b border-border' : 'hover:bg-bg-input'
              )}
              onClick={() => setOpenId(isOpen ? null : r.id)}
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                  isOpen ? 'bg-accent text-white' : 'bg-bg-input text-text-muted'
                )}>
                  {idx + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {r.last_name}, {r.first_name}{r.middle_name ? ` ${r.middle_name[0]}.` : ''}
                  </div>
                  <div className="text-xs text-text-muted font-mono">
                    {ex.student_id_number || suggested} · {r.contact_no || 'no contact'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isComplete
                  ? <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12} /> Done</span>
                  : <span className="text-xs text-amber-500 flex items-center gap-1"><AlertCircle size={12} /> Incomplete</span>}
                {isOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-5">

                    {/* ── Personal Info (read-only) ── */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                        Personal Info (from Registration)
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-bg-input">
                        {[
                          ['Full Name',    `${r.last_name}, ${r.first_name} ${r.middle_name || ''}`],
                          ['Contact',      r.contact_no],
                          ['Email',        r.email],
                          ['Sex',          r.sex],
                          ['Date of Birth', r.birth_month && r.birth_day && r.birth_year
                            ? `${String(new Date(`${r.birth_month} 1`).getMonth()+1).padStart(2,'0')}-${String(r.birth_day).padStart(2,'0')}-${String(r.birth_year).slice(-2)}`
                            : '—'],
                          ['Age',          r.age],
                          ['Civil Status', r.civil_status],
                          ['Education',    r.educational_attainment],
                          ['Address',      [r.address_street, r.address_barangay, r.address_city].filter(Boolean).join(', ')],
                        ].map(([label, val]) => (
                          <div key={label as string}>
                            <div className="text-xs text-text-muted">{label}</div>
                            <div className="text-xs font-medium text-text-primary truncate">{val || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Student ID ── */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Student ID</div>
                      <div className="max-w-xs">
                        <Field label="Student ID Number">
                          <Inp
                            value={ex.student_id_number || suggested}
                            onChange={v => setEx(r.id, 'student_id_number', v)}
                            placeholder={suggested}
                          />
                        </Field>
                        <p className="text-xs text-text-muted mt-1">
                          NTC = Noveleta Training Center · {sectorCode || 'XX'} = Sector Code
                        </p>
                      </div>
                    </div>

                    {/* ── TVET Provider Info (per trainee) ── */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                        <Building2 size={12} className="inline mr-1" />TVET Provider Info
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Region">
                          <Inp value={ex.region} onChange={v => setEx(r.id, 'region', v)} />
                        </Field>
                        <Field label="Province">
                          <Inp value={ex.province} onChange={v => setEx(r.id, 'province', v)} />
                        </Field>
                        <Field label="District">
                          <Inp value={ex.district} onChange={v => setEx(r.id, 'district', v)} />
                        </Field>
                        <Field label="Municipality / City">
                          <Inp value={ex.municipality} onChange={v => setEx(r.id, 'municipality', v)} />
                        </Field>
                        <Field label="Name of Provider" required>
                          <Inp value={ex.provider_name} onChange={v => setEx(r.id, 'provider_name', v)} />
                        </Field>
                        <Field label="TBP ID Number">
                          <Inp value={ex.tbp_id} onChange={v => setEx(r.id, 'tbp_id', v)} placeholder="(optional)" />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Address">
                            <Inp value={ex.address} onChange={v => setEx(r.id, 'address', v)} />
                          </Field>
                        </div>
                        <Field label="Type of Institution">
                          <Sel value={ex.institution_type} onChange={v => setEx(r.id, 'institution_type', v)} options={INSTITUTION_TYPES} />
                        </Field>
                        <Field label="Classification of Provider">
                          <Inp value={ex.classification} onChange={v => setEx(r.id, 'classification', v)} />
                        </Field>
                        <Field label="Full Qualification (WTR)">
                          <Inp value={ex.full_qualification} onChange={v => setEx(r.id, 'full_qualification', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Qualification (Clustered)">
                          <Inp value={ex.qualification_clustered} onChange={v => setEx(r.id, 'qualification_clustered', v)} placeholder="(optional)" />
                        </Field>
                      </div>
                    </div>

                    {/* ── Program Profile (per trainee) ── */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                        <BookOpen size={12} className="inline mr-1" />Program Profile
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Delivery Mode" required>
                          <Inp value={ex.delivery_mode} onChange={v => setEx(r.id, 'delivery_mode', v)} placeholder="e.g. Computer Systems Servicing NC II" />
                        </Field>
                        <Field label="Industry Sector">
                          <Sel value={ex.industry_sector} onChange={v => setEx(r.id, 'industry_sector', v)} options={INDUSTRY_SECTORS} />
                        </Field>
                        {ex.industry_sector === 'Others' && (
                          <Field label="Please Specify">
                            <Inp value={ex.industry_sector_other} onChange={v => setEx(r.id, 'industry_sector_other', v)} placeholder="Specify sector" />
                          </Field>
                        )}
                        <Field label="Qualification (NTR)">
                          <Inp value={ex.qualification_ntr} onChange={v => setEx(r.id, 'qualification_ntr', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="CoPR Number">
                          <Inp value={ex.copr_number} onChange={v => setEx(r.id, 'copr_number', v)} placeholder="(optional)" />
                        </Field>
                      </div>
                    </div>

                    {/* ── Training ── */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Training</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="PGS Training Component">
                          <Inp value={ex.pgs_training_component} onChange={v => setEx(r.id, 'pgs_training_component', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Voucher Number">
                          <Inp value={ex.voucher_number} onChange={v => setEx(r.id, 'voucher_number', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Client Type" required>
                          <Sel value={ex.client_type} onChange={v => setEx(r.id, 'client_type', v)} options={CLIENT_TYPES} />
                        </Field>
                        <Field label="Date Started" required>
                          <input
                            type="date"
                            className="input-base text-sm"
                            value={ex.date_started
                              ? `20${ex.date_started.slice(6,8)}-${ex.date_started.slice(0,2)}-${ex.date_started.slice(3,5)}`
                              : ''}
                            onChange={e => {
                              const d = e.target.value; // yyyy-mm-dd
                              if (!d) { setEx(r.id, 'date_started', ''); return; }
                              const [y, m, day] = d.split('-');
                              setEx(r.id, 'date_started', `${m}-${day}-${y.slice(2)}`);
                            }}
                          />
                        </Field>
                        <Field label="Date Finished" required>
                          <input
                            type="date"
                            className="input-base text-sm"
                            value={ex.date_finished
                              ? `20${ex.date_finished.slice(6,8)}-${ex.date_finished.slice(0,2)}-${ex.date_finished.slice(3,5)}`
                              : ''}
                            onChange={e => {
                              const d = e.target.value;
                              if (!d) { setEx(r.id, 'date_finished', ''); return; }
                              const [y, m, day] = d.split('-');
                              setEx(r.id, 'date_finished', `${m}-${day}-${y.slice(2)}`);
                            }}
                          />
                        </Field>
                        <Field label="Reason for Not Finishing">
                          <Inp value={ex.reason_not_finishing} onChange={v => setEx(r.id, 'reason_not_finishing', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Assessment Results">
                          <Inp value={ex.assessment_results} onChange={v => setEx(r.id, 'assessment_results', v)} placeholder="(optional)" />
                        </Field>
                      </div>
                    </div>

                    {/* ── Employment ── */}
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Employment</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Employment Date (mm-dd-yy)">
                          <Inp value={ex.employment_date} onChange={v => setEx(r.id, 'employment_date', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Name of Employer">
                          <Inp value={ex.employer_name} onChange={v => setEx(r.id, 'employer_name', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Address of Employer">
                          <Inp value={ex.employer_address} onChange={v => setEx(r.id, 'employer_address', v)} placeholder="(optional)" />
                        </Field>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Signatories only (shared for the whole report)
// ─────────────────────────────────────────────────────────────────────────────
function StepSignatories({
  provider, setProvider,
}: {
  provider: ProviderInfo;
  setProvider: (v: ProviderInfo) => void;
}) {
  function setP(k: keyof ProviderInfo, v: string) { setProvider({ ...provider, [k]: v }); }

  return (
    <div className="space-y-6">
      {/* Report title / program title */}
      <div>
        <div className="form-section-title"><FileText size={15} /> Report Info</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Report Title">
            <Inp value={provider.title} onChange={v => setP('title', v)} />
          </Field>
          <Field label="Program Title">
            <Inp value={provider.program_title} onChange={v => setP('program_title', v)} placeholder="e.g. Reflexology Therapy" />
          </Field>
        </div>
      </div>

      {/* Signatories */}
      <div>
        <div className="form-section-title"><User size={15} /> Signatories</div>
        <p className="text-xs text-text-muted -mt-2 mb-4">
          These appear at the bottom of the printed report and are shared across all trainees.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Prepared By (1st Trainer)">
            <Inp value={provider.prepared_by_left} onChange={v => setP('prepared_by_left', v)} placeholder="Name, Title" />
          </Field>
          <Field label="Prepared By (2nd Trainer)" >
            <Inp value={provider.prepared_by_right} onChange={v => setP('prepared_by_right', v)} placeholder="Name, Title (optional)" />
          </Field>
          <Field label="NCLC Administrator" required>
            <Inp value={provider.nclc_admin} onChange={v => setP('nclc_admin', v)} placeholder="Name" />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Review & Print
// ─────────────────────────────────────────────────────────────────────────────
function StepReviewPrint({
  provider, applicants, extras, sectorCode, savedReportId, selectedCourse,
}: {
  provider: ProviderInfo;
  applicants: any[];
  extras: Record<number, TraineeExtra>;
  sectorCode: string;
  savedReportId: number | null;
  selectedCourse: any;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  function dob(r: any) {
    if (!r.birth_month || !r.birth_day || !r.birth_year) return '';
    const m = String(new Date(`${r.birth_month} 1`).getMonth() + 1).padStart(2, '0');
    const d = String(r.birth_day).padStart(2, '0');
    const y = String(r.birth_year).slice(-2);
    return `${m}-${d}-${y}`;
  }

  function suggestId(idx: number) { return `NTC-${sectorCode || 'S'}-${String(idx + 1).padStart(4, '0')}`; }

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=1500,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${provider.title || 'Enrollment Terminal Report'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 7px; color: #000; background: #fff; }
        .page { padding: 6mm; }
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; font-size: 6.5px; word-wrap: break-word; overflow-wrap: break-word; background: #fff; color: #000; }
        th { text-align: center; }
        .title-block { margin-bottom: 4px; }
        .sig-block { margin-top: 14px; display: flex; gap: 12px; width: 500px; }
        .sig-item { flex: 1; }
        .sig-label { font-size: 6.5px; color: #555; margin-bottom: 18px; }
        .sig-name { border-top: 1px solid #000; padding-top: 2px; font-size: 8px; font-weight: bold; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: landscape; margin: 5mm; }
        }
      </style>
    </head><body><div class="page">${content}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  // Shared cell style for data rows
  const cellStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px',
    fontSize: 7,
    verticalAlign: 'middle',
    height: '28px',
    background: '#fff',
    color: '#000',
  };

  // Shared style for column-name header row
  const colHeaderStyle: React.CSSProperties = {
    background: '#555',
    color: '#fff',
    fontSize: 5.5,
    padding: '2px 1px',
    border: '1px solid #000',
    whiteSpace: 'normal' as const,
    lineHeight: 1.2,
  };

  // Shared style for column-letter row
  const colLetterStyle: React.CSSProperties = {
    background: '#ffe066',
    color: '#000',
    fontSize: 6,
    padding: '2px 1px',
    border: '1px solid #000',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="form-section-title"><FileText size={15} /> Review & Print</div>
        <div className="flex items-center gap-3">
          {savedReportId && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 size={12} /> Saved to DB (ID: {savedReportId})
            </span>
          )}
          <button onClick={handlePrint} className="btn-primary text-sm gap-2">
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'auto', borderRadius: '12px', border: '1px solid var(--border)', maxHeight: '600px' }}>
        <div
          ref={printRef}
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '7px', padding: '6mm', background: '#fff', color: '#000', minWidth: '3300px', width: 'max-content' }}
        >
          {/* Title block */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', color: '#000' }}>
              {provider.title || 'ENROLLMENT/TERMINAL REPORT'}
            </div>
            <div style={{ fontSize: 9, fontWeight: 'bold', marginTop: 1, color: '#000' }}>
              Noveleta Training Center
            </div>
            {(provider.program_title || selectedCourse?.name) && (
              <div style={{ fontSize: 9, marginTop: 1, color: '#000' }}>
                {provider.program_title || selectedCourse?.name}
              </div>
            )}
          </div>

          {/* ── Unified table: 42 columns, 3200px wide ── */}
          <table style={{ width: '3200px', tableLayout: 'fixed', borderCollapse: 'collapse', background: '#fff' }}>
            <colgroup>
              {/* TVET: 9 cols */}
              <col style={{ width: '55px' }} /><col style={{ width: '55px' }} />
              <col style={{ width: '50px' }} /><col style={{ width: '65px' }} />
              <col style={{ width: '90px' }} /><col style={{ width: '60px' }} />
              <col style={{ width: '90px' }} /><col style={{ width: '65px' }} />
              <col style={{ width: '65px' }} />
              {/* Program: 7 cols */}
              <col style={{ width: '70px' }} /><col style={{ width: '60px' }} />
              <col style={{ width: '80px' }} /><col style={{ width: '70px' }} />
              <col style={{ width: '55px' }} /><col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              {/* Student: 23 cols */}
              <col style={{ width: '70px' }} /><col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} /><col style={{ width: '60px' }} />
              <col style={{ width: '65px' }} /><col style={{ width: '75px' }} />
              <col style={{ width: '80px' }} /><col style={{ width: '65px' }} />
              <col style={{ width: '65px' }} /><col style={{ width: '50px' }} />
              <col style={{ width: '65px' }} /><col style={{ width: '40px' }} />
              <col style={{ width: '60px' }} /><col style={{ width: '35px' }} />
              <col style={{ width: '55px' }} /><col style={{ width: '65px' }} />
              {/* Training: 7 cols */}
              <col style={{ width: '65px' }} /><col style={{ width: '60px' }} />
              <col style={{ width: '55px' }} /><col style={{ width: '60px' }} />
              <col style={{ width: '60px' }} /><col style={{ width: '65px' }} />
              <col style={{ width: '65px' }} />
              {/* Employment: 3 cols */}
              <col style={{ width: '60px' }} /><col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
            </colgroup>

            <thead>
              {/* Section group headers */}
              <tr>
                <td colSpan={9} style={{ background: '#f4a7b9', textAlign: 'center', fontWeight: 'bold', fontSize: 7, padding: '3px', border: '1px solid #000', color: '#000' }}>TVET Providers Profile</td>
                <td colSpan={7}  style={{ background: '#ffd966', textAlign: 'center', fontWeight: 'bold', fontSize: 7, padding: '3px', border: '1px solid #000', color: '#000' }}>Program Profile</td>
                <td colSpan={23} style={{ background: '#90ee90', textAlign: 'center', fontWeight: 'bold', fontSize: 7, padding: '3px', border: '1px solid #000', color: '#000' }}>Students Profile</td>
                <td colSpan={3}  style={{ background: '#c9daf8', textAlign: 'center', fontWeight: 'bold', fontSize: 7, padding: '3px', border: '1px solid #000', color: '#000' }}>Employment</td>
              </tr>

              {/* Column names */}
              <tr>
                {[
                  'Region','Province','District','Municipality/City','Name of Provider',
                  'TBP ID Number','Address','Type of Institution','Classification of Provider',
                  'Full Qualification (WTR)','Qualification (Clustered)',
                  'Qualification (NTR)','CoPR Number','Delivery Mode',
                  'Industry Sector of Qualification','Others, Please Specify',
                  'Student ID Number','Family/Last Name','First Name','Middle Name',
                  'Contact Number','Email','Street No. and Street Address','Barangay',
                  'Municipality/City','District','Province','Sex',
                  'Date of Birth (mm-dd-yy)','Age','Civil Status','Highest Educational Attainment',
                  'PGS Training Component','Voucher Number','Client Type',
                  'Date Started (mm-dd-yy)','Date Finished (mm-dd-yy)',
                  'Reason for not Finishing','Assessment Results',
                  'Employment Date (mm-dd-yy)','Name of Employer','Address of Employer',
                ].map((h, i) => (
                  <th key={i} style={colHeaderStyle}>{h}</th>
                ))}
              </tr>

              {/* Column letters */}
              <tr>
                {[
                  '(a)','(b)','(c)','(d)','(e)','(f)','(g)','(h)','(i)',
                  '(j)','(k)','(l)','(m)','(n)','(o)','(p)',
                  '(q)','(r)','(s)','(t)','(u)','(v)','(w)','(x)','(y)','(z)','(aa)','(ac)',
                  '(ad)','(ae)','(af)','(ag)',
                  '(ai)','(aj)','(ak)','(al)','(am)','(an)','(ao)',
                  '(ap)','(aq)','(ar)',
                ].map((l, i) => (
                  <th key={i} style={colLetterStyle}>{l}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {applicants.map((r: any, idx) => {
                const ex  = extras[r.id] ?? emptyExtra(r.id);
                const sid = ex.student_id_number || suggestId(idx);

                const allCells = [
                  // ── TVET per trainee ──
                  ex.region, ex.province, ex.district, ex.municipality,
                  ex.provider_name, ex.tbp_id, ex.address,
                  ex.institution_type, ex.classification,
                  // ── Program per trainee ──
                  ex.full_qualification, ex.qualification_clustered,
                  ex.qualification_ntr, ex.copr_number,
                  ex.delivery_mode || selectedCourse?.name || '',
                  ex.industry_sector !== 'Others' ? ex.industry_sector : '',
                  ex.industry_sector === 'Others' ? ex.industry_sector_other : '',
                  // ── Student (from registration) ──
                  sid,
                  r.last_name        || '',
                  r.first_name       || '',
                  r.middle_name      || '',
                  r.contact_no       || '',
                  r.email            || '',
                  [r.address_street, r.address_subdivision].filter(Boolean).join(', '),
                  r.address_barangay || '',
                  r.address_city     || '',
                  '',                          // district (not in registration schema)
                  r.address_province || '',
                  r.sex              || '',
                  dob(r),
                  r.age              || '',
                  r.civil_status     || '',
                  r.educational_attainment || '',
                  // ── Training ──
                  ex.pgs_training_component || '',
                  ex.voucher_number         || '',
                  ex.client_type            || '',
                  ex.date_started           || '',
                  ex.date_finished          || '',
                  ex.reason_not_finishing   || '',
                  ex.assessment_results     || '',
                  // ── Employment ──
                  ex.employment_date  || '',
                  ex.employer_name    || '',
                  ex.employer_address || '',
                ];

                return (
                  <tr key={r.id}>
                    {allCells.map((v, i) => (
                      <td key={i} style={cellStyle}>{v}</td>
                    ))}
                  </tr>
                );
              })}

              {/* Blank padding rows */}
              {[...Array(Math.max(0, 3 - applicants.length))].map((_, i) => (
                <tr key={`blank-${i}`}>
                  {[...Array(42)].map((_, j) => (
                    <td key={j} style={cellStyle}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatories */}
          <div style={{ marginTop: 14, display: 'flex', gap: 24, width: '600px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '6.5px', color: '#555', marginBottom: 8 }}>Prepared by:</div>
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#000', marginBottom: 2 }}>
                {provider.prepared_by_left || ''}
              </div>
              <div style={{ fontSize: '6.5px', color: '#555' }}>Trainer</div>
            </div>
            {provider.prepared_by_right && (
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '6.5px', color: '#555', marginBottom: 8 }}>Prepared by:</div>
                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#000', marginBottom: 2 }}>
                  {provider.prepared_by_right}
                </div>
                <div style={{ fontSize: '6.5px', color: '#555' }}>Trainer</div>
              </div>
            )}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '6.5px', marginBottom: 8, visibility: 'hidden' }}>Prepared by:</div>
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#000', marginBottom: 2 }}>
                {provider.nclc_admin || ''}
              </div>
              <div style={{ fontSize: '6.5px', color: '#555' }}>NCLC Administrator</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports List
// ─────────────────────────────────────────────────────────────────────────────
function ReportsList({ onNew, onView, onEdit }: { onNew: () => void; onView: (id: number) => void; onEdit: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [tab, setTab]         = useState<'active' | 'archived'>('active');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [minTrainees, setMinTrainees] = useState('');
  const [maxTrainees, setMaxTrainees] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; title: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: number; title: string } | null>(null);

  const hasActiveFilters = !!(dateFrom || dateTo || minTrainees || maxTrainees);

  function clearFilters() {
    setDateFrom(''); setDateTo('');
    setMinTrainees(''); setMaxTrainees('');
    setPage(1);
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', page, search, tab, dateFrom, dateTo, minTrainees, maxTrainees],
    queryFn: () => api.get('/reports', {
      params: {
        page, limit: 15, search,
        archived: tab === 'archived' ? true : undefined,
        date_from:    dateFrom    || undefined,
        date_to:      dateTo      || undefined,
        min_trainees: minTrainees || undefined,
        max_trainees: maxTrainees || undefined,
      }
    }).then(r => r.data),
    staleTime: 10000,
  });

  const reports: any[] = data?.data  || [];
  const pages           = data?.pages || 1;
  const total           = data?.total || 0;

  async function archive(id: number) {
    try {
      await api.patch(`/reports/${id}/archive`);
      toast.success('Archived.');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch { toast.error('Failed to archive.'); }
  }

  async function restore(id: number) {
    try {
      await api.patch(`/reports/${id}/restore`);
      toast.success('Restored.');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch { toast.error('Failed to restore.'); }
  }

  return (
    <div>
      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (archiveTarget) {
            await archive(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
        title="Archive Report?"
        description={`"${archiveTarget?.title}" will be hidden from the list. You can restore it from the Archived tab.`}
        confirmLabel="Archive"
      />
      <ConfirmModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={async () => {
          if (restoreTarget) {
            await restore(restoreTarget.id);
            setRestoreTarget(null);
          }
        }}
        title="Restore Report?"
        description={`"${restoreTarget?.title}" will be moved back to the active list.`}
        confirmLabel="Restore"
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Reports</h1>
          <p className="text-sm text-text-muted mt-1">{total} {tab} report{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw size={14} /></button>
          {tab === 'active' && (
            <button onClick={onNew} className="btn-primary text-sm"><Plus size={14} /> New Report</button>
          )}
        </div>
      </div>

      {/* Active / Archived tabs */}
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

      {/* Search + filter bar */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm w-full"
              placeholder="Search by title or program…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={clsx('btn-ghost text-sm gap-2 shrink-0', hasActiveFilters && 'text-accent border-accent')}
          >
            <ChevronDown size={14} className={clsx('transition-transform', showFilters && 'rotate-180')} />
            Filters
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold">
                {[dateFrom, dateTo, minTrainees, maxTrainees].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="label text-xs mb-1 block">Date From</label>
                    <input
                      type="date" className="input-base text-sm"
                      value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    />
                  </div>
                  <div>
                    <label className="label text-xs mb-1 block">Date To</label>
                    <input
                      type="date" className="input-base text-sm"
                      value={dateTo}
                      onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    />
                  </div>
                  <div>
                    <label className="label text-xs mb-1 block">Min Trainees</label>
                    <input
                      type="number" min="0" className="input-base text-sm"
                      placeholder="e.g. 5"
                      value={minTrainees}
                      onChange={e => { setMinTrainees(e.target.value); setPage(1); }}
                    />
                  </div>
                  <div>
                    <label className="label text-xs mb-1 block">Max Trainees</label>
                    <input
                      type="number" min="0" className="input-base text-sm"
                      placeholder="e.g. 30"
                      value={maxTrainees}
                      onChange={e => { setMaxTrainees(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn-ghost text-xs mt-3 text-red-400 hover:text-red-500">
                    ✕ Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title / Program</th><th>Trainees</th><th>Created By</th><th>Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton" /></td>)}</tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <div className="text-4xl mb-3">{tab === 'archived' ? '🗄️' : '📋'}</div>
                  <div className="text-sm text-text-muted mb-3">
                    {tab === 'archived' ? 'No archived reports.' : 'No reports yet.'}
                  </div>
                  {tab === 'active' && (
                    <button onClick={onNew} className="btn-primary text-sm mx-auto">
                      <Plus size={14} /> Create First Report
                    </button>
                  )}
                </td>
              </tr>
            ) : reports.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <div className="font-semibold text-sm text-text-primary">{r.title}</div>
                  {r.program_title && <div className="text-xs text-text-muted">{r.program_title}</div>}
                </td>
                <td>
                  <span className="badge badge-blue">
                    {r.trainee_count} trainee{r.trainee_count !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="text-xs text-text-muted">{r.creator_name || '—'}</td>
                <td className="text-xs text-text-muted">
                  {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    {tab === 'active' ? (
                      <>
                       <button
                          title="View / Print" onClick={() => onView(r.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          title="Edit" onClick={() => onEdit(r.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-amber-400 transition-colors"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          title="Archive"
                          onClick={() => setArchiveTarget({ id: r.id, title: r.title })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Archive size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        title="Restore"
                        onClick={() => setRestoreTarget({ id: r.id, title: r.title })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-green-500 transition-colors"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs py-1.5 px-3" disabled={page <= 1}    onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn-ghost text-xs py-1.5 px-3" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Wizard
// ─────────────────────────────────────────────────────────────────────────────
function ReportWizard({ onDone, initialReportId, startAtStep }: { onDone: () => void; initialReportId?: number; startAtStep?: number }) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  function goToStep(n: number) {
    setStep(n);
    setMaxStep(prev => Math.max(prev, n));
  }

  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [savedReportId, setSavedReportId] = useState<number | null>(initialReportId ?? null);
  const [loaded, setLoaded] = useState(false);

  // Step 0 — sector for Student ID code only
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [programInfo, setProgramInfo]       = useState<ProgramInfo>({
    qualification_ntr: '', copr_number: '', industry_sector: '', industry_sector_other: '',
  });

  // Step 1
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Step 2
  const [extras, setExtras] = useState<Record<number, TraineeExtra>>({});

  // Step 3 — only signatories + report title
  const [provider, setProvider] = useState<ProviderInfo>({
    title: 'ENROLLMENT/TERMINAL REPORT',
    program_title: '',
    prepared_by_left: '',
    prepared_by_right: '',
    nclc_admin: '',
  });

  // Load existing report when viewing
  const { data: existingReport } = useQuery({
    queryKey: ['report', initialReportId],
    queryFn: () => api.get(`/reports/${initialReportId}`).then(r => r.data.data),
    enabled: !!initialReportId,
  });

  useEffect(() => {
    if (!existingReport || loaded) return;
    setLoaded(true);
    setProvider({
      title:             existingReport.title             || '',
      program_title:     existingReport.program_title     || '',
      prepared_by_left:  existingReport.prepared_by_left  || '',
      prepared_by_right: existingReport.prepared_by_right || '',
      nclc_admin:        existingReport.nclc_admin        || '',
    });
    setProgramInfo({
      qualification_ntr:     existingReport.qualification_ntr     || '',
      copr_number:           existingReport.copr_number           || '',
      industry_sector:       existingReport.industry_sector       || '',
      industry_sector_other: existingReport.industry_sector_other || '',
    });
    setSelectedCourse({ id: existingReport.course_id ?? null, name: existingReport.delivery_mode, sector: existingReport.industry_sector });
    if (existingReport.trainees?.length) {
      setSelectedIds(existingReport.trainees.map((t: any) => t.registration_id));
      const newExtras: Record<number, TraineeExtra> = {};
      for (const t of existingReport.trainees) {
        newExtras[t.registration_id] = {
          registration_id:         t.registration_id,
          student_id_number:       t.student_id_number      || '',
          pgs_training_component:  t.pgs_training_component || '',
          voucher_number:          t.voucher_number         || '',
          client_type:             t.client_type            || '',
          date_started:            t.date_started           || '',
          date_finished:           t.date_finished          || '',
          reason_not_finishing:    t.reason_not_finishing   || '',
          assessment_results:      t.assessment_results     || '',
          employment_date:         t.employment_date        || '',
          employer_name:           t.employer_name          || '',
          employer_address:        t.employer_address       || '',
          // per-trainee provider (load from trainee record if available)
          region:                  t.region                 || 'REGION 4A',
          province:                t.province               || 'CAVITE',
          district:                t.district               || 'District I',
          municipality:            t.municipality           || 'Noveleta',
          provider_name:           t.provider_name          || 'Noveleta Training Center',
          tbp_id:                  t.tbp_id                 || '',
          address:                 t.address                || 'Poblacion, Noveleta Cavite',
          institution_type:        t.institution_type       || 'Public',
          classification:          t.classification         || 'LGU',
          full_qualification:      t.full_qualification     || '',
          qualification_clustered: t.qualification_clustered|| '',
          qualification_ntr:       t.qualification_ntr      || '',
          copr_number:             t.copr_number            || '',
          industry_sector:         t.industry_sector        || '',
          industry_sector_other:   t.industry_sector_other  || '',
          delivery_mode:           t.delivery_mode          || '',
        };
      }
      setExtras(newExtras);
    }
    goToStep(startAtStep !== undefined ? startAtStep : 4);
  }, [existingReport, loaded]);

  // Fetch full registration data for selected applicants
  const { data: allRegs } = useQuery({
    queryKey: ['all-regs-for-report'],
    queryFn: () => api.get('/registrations', { params: { limit: 500, status: 'active' } }).then(r => r.data.data),
    enabled: selectedIds.length > 0,
    staleTime: 30000,
  });

  const selectedApplicants = useMemo(() =>
    (allRegs || []).filter((r: any) => selectedIds.includes(r.id)),
    [allRegs, selectedIds]
  );

  const sectorCode = useMemo(() => SECTOR_CODES[programInfo.industry_sector] || 'S', [programInfo.industry_sector]);

  function canProceed(): boolean {
    if (step === 0) return !!(selectedCourse && programInfo.industry_sector);
    if (step === 1) return selectedIds.length > 0;
    if (step === 2) return selectedIds.every(id => {
      const ex = extras[id] ?? emptyExtra(id);
      return !!(ex.client_type && ex.date_started && ex.date_finished);
    });
    if (step === 3) return !!(provider.nclc_admin && provider.prepared_by_left);
    return true;
  }

  async function handleSaveAndPreview() {
    if (saving) return;
    const trainees = selectedIds.map((id, idx) => {
      const ex = extras[id] ?? emptyExtra(id);
      return {
        registration_id:         id,
        student_id_number:       ex.student_id_number || `NTC-${sectorCode}-${String(idx + 1).padStart(4, '0')}`,
        pgs_training_component:  ex.pgs_training_component,
        voucher_number:          ex.voucher_number,
        client_type:             ex.client_type,
        date_started:            ex.date_started   || null,
        date_finished:           ex.date_finished  || null,
        reason_not_finishing:    ex.reason_not_finishing,
        assessment_results:      ex.assessment_results,
        employment_date:         ex.employment_date || null,
        employer_name:           ex.employer_name,
        employer_address:        ex.employer_address,
        // per-trainee provider & program
        region:                  ex.region,
        province:                ex.province,
        district:                ex.district,
        municipality:            ex.municipality,
        provider_name:           ex.provider_name,
        tbp_id:                  ex.tbp_id,
        address:                 ex.address,
        institution_type:        ex.institution_type,
        classification:          ex.classification,
        full_qualification:      ex.full_qualification,
        qualification_clustered: ex.qualification_clustered,
        qualification_ntr:       ex.qualification_ntr,
        copr_number:             ex.copr_number,
        industry_sector:         ex.industry_sector,
        industry_sector_other:   ex.industry_sector_other,
        delivery_mode:           ex.delivery_mode,
      };
    });

    const payload = {
      title:             provider.title,
      program_title:     provider.program_title,
      prepared_by_left:  provider.prepared_by_left,
      prepared_by_right: provider.prepared_by_right,
      nclc_admin:        provider.nclc_admin,
      // keep these for backward compat with backend
      region: '', province: '', district: '', municipality: '',
      provider_name: '', tbp_id: '', address: '',
      institution_type: '', classification: '',
      full_qualification: '', qualification_clustered: '',
      delivery_mode: selectedCourse?.name || '',
      qualification_ntr: programInfo.qualification_ntr,
      copr_number: programInfo.copr_number,
      industry_sector: programInfo.industry_sector,
      industry_sector_other: programInfo.industry_sector_other,
      trainees,
    };

    setSaving(true);
    try {
      if (savedReportId) {
        await api.put(`/reports/${savedReportId}`, payload);
        toast.success('Report updated.');
      } else {
        const { data } = await api.post('/reports', payload);
        setSavedReportId(data.id);
        toast.success('Report saved!');
      }
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      goToStep(4);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  const slide = { enter: { opacity: 0, x: 20 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  return (
    <div className="max-w-6xl mx-auto">
    <ConfirmModal
      open={showSaveConfirm}
      onClose={() => setShowSaveConfirm(false)}
      onConfirm={() => { setShowSaveConfirm(false); handleSaveAndPreview(); }}
      title="Save & Preview Report?"
      description={`This will ${savedReportId ? 'update the existing' : 'create a new'} report with ${selectedIds.length} trainee${selectedIds.length !== 1 ? 's' : ''}. Continue?`}
      confirmLabel="Save & Preview"
    />
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onDone} className="btn-ghost text-sm"><ChevronLeft size={14} /> All Reports</button>
        <div className="flex-1">
          <h1 className="section-title">{initialReportId ? 'View / Edit Report' : 'New Report'}</h1>
          <p className="text-sm text-text-muted mt-1">TESDA Enrollment / Terminal Report</p>
        </div>
        {savedReportId && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 size={12} /> Saved (ID: {savedReportId})
            </span>
            {step === 4 && (
              <button
                className="btn-ghost text-sm gap-2"
                onClick={() => setStep(0)}
              >
                <Pencil size={13} /> Edit Report
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => i <= maxStep && i !== step && goToStep(i)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  i === step ? 'btn-primary' : i <= maxStep ? 'btn-ghost text-accent border-accent' : 'opacity-40 cursor-default btn-ghost'
                )}
              >
                {i < step && i <= maxStep ? <Check size={12} /> : <s.icon size={12} />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-text-muted shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card p-6 mb-5 min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>
              <StepSelectCourse
                selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse}
                programInfo={programInfo} setProgramInfo={setProgramInfo}
              />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="s1" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>
              <StepSelectApplicants selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>
              {selectedApplicants.length === 0
                ? <div className="flex items-center justify-center h-48 text-text-muted text-sm">Loading applicant data…</div>
                : <StepTrainingDetails applicants={selectedApplicants} extras={extras} setExtras={setExtras} sectorCode={sectorCode} />
              }
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="s3" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>
              <StepSignatories provider={provider} setProvider={setProvider} />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="s4" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>
              <StepReviewPrint
                provider={provider}
                applicants={selectedApplicants}
                extras={extras}
                sectorCode={sectorCode}
                savedReportId={savedReportId}
                selectedCourse={selectedCourse}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" disabled={step === 0} onClick={() => goToStep(step - 1)}>
          <ChevronLeft size={14} /> Previous
        </button>

        <div className="flex items-center gap-2">
          {!canProceed() && step < 4 && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {step === 0
                ? 'Select a course and industry sector'
                : step === 1
                ? 'Select at least one applicant'
                : step === 2
                ? 'All trainees must have Client Type, Date Started, and Date Finished'
                : 'NCLC Administrator and at least one Prepared By trainer are required'}
            </span>
          )}

          {step === 3 && (
            <button className="btn-primary text-sm" onClick={() => setShowSaveConfirm(true)} disabled={saving || !canProceed()}>
              {saving ? 'Saving…' : <><Save size={14} /> Save & Preview</>}
            </button>
          )}

          {step < 3 && (
            <button className="btn-primary text-sm" disabled={!canProceed()} onClick={() => goToStep(step + 1)}>
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [mode, setMode]                 = useState<'list' | 'new' | 'view' | 'edit'>('list');
  const [viewReportId, setViewReportId] = useState<number | null>(null);

  if (mode === 'new')
    return <ReportWizard onDone={() => setMode('list')} />;

  if ((mode === 'view' || mode === 'edit') && viewReportId)
    return (
      <ReportWizard
        onDone={() => { setMode('list'); setViewReportId(null); }}
        initialReportId={viewReportId}
        startAtStep={mode === 'edit' ? 0 : undefined}
      />
    );

  return (
    <ReportsList
      onNew={() => setMode('new')}
      onView={id => { setViewReportId(id); setMode('view'); }}
      onEdit={id => { setViewReportId(id); setMode('edit'); }}
    />
  );
}