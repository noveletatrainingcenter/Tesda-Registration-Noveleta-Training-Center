// frontend/src/pages/shared/Reports.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, ChevronDown, ChevronUp, Plus, Printer,
  Check, AlertCircle, User, Building2, BookOpen, Briefcase,
  CheckCircle2, ChevronRight, ChevronLeft, Save, Eye,
  Archive, RefreshCw,
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
  registration_id:        number;
  student_id_number:      string;
  pgs_training_component: string;
  voucher_number:         string;
  client_type:            string;
  date_started:           string;
  date_finished:          string;
  reason_not_finishing:   string;
  assessment_results:     string;
  employment_date:        string;
  employer_name:          string;
  employer_address:       string;
}

function emptyExtra(id: number): TraineeExtra {
  return {
    registration_id: id, student_id_number: '',
    pgs_training_component: '', voucher_number: '', client_type: '',
    date_started: '', date_finished: '', reason_not_finishing: '',
    assessment_results: '', employment_date: '', employer_name: '', employer_address: '',
  };
}

interface ProviderInfo {
  title: string;             program_title: string;
  region: string;            province: string;
  district: string;          municipality: string;
  provider_name: string;     tbp_id: string;
  address: string;           institution_type: string;
  classification: string;    full_qualification: string;
  qualification_clustered: string;
  prepared_by_left: string;  prepared_by_right: string;
  nclc_admin: string;
}

interface ProgramInfo {
  qualification_ntr:     string;
  copr_number:           string;
  industry_sector:       string;
  industry_sector_other: string;
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
  { label: 'Select Course',      icon: BookOpen   },
  { label: 'Select Applicants',  icon: User       },
  { label: 'Training Details',   icon: Briefcase  },
  { label: 'Provider & Program', icon: Building2  },
  { label: 'Review & Print',     icon: FileText   },
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 — Select Course
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

  function setPI(k: keyof ProgramInfo, v: string) { setProgramInfo({ ...programInfo, [k]: v }); }

  return (
    <div className="space-y-6">
      <div className="form-section-title"><BookOpen size={15} /> Select the Course / Training Program</div>
      <p className="text-xs text-text-muted -mt-2">
        Choose the course this batch of trainees attended. This becomes the Delivery Mode on the report.
      </p>

      {/* Course cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">No active courses found.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {courses.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c)}
              className={clsx(
                'text-left p-4 rounded-xl border transition-all',
                selectedCourse?.id === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:border-accent/50 bg-bg-input hover:bg-accent/5'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium text-text-primary leading-snug">{c.name}</div>
                {selectedCourse?.id === c.id && <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />}
              </div>
              {c.sector && <div className="text-xs text-text-muted mt-1">{c.sector}</div>}
            </button>
          ))}
        </div>
      )}

      {/* Extra program fields once a course is picked */}
      {selectedCourse && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
          <div className="form-section-title"><FileText size={15} /> Program Details</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Industry Sector of Qualification" required>
              <Sel
                value={programInfo.industry_sector}
                onChange={v => { setPI('industry_sector', v); if (v !== 'Others') setPI('industry_sector_other', ''); }}
                options={INDUSTRY_SECTORS}
              />
            </Field>
            {programInfo.industry_sector === 'Others' && (
              <Field label="Please Specify">
                <Inp value={programInfo.industry_sector_other} onChange={v => setPI('industry_sector_other', v)} placeholder="Specify sector" />
              </Field>
            )}
            <Field label="Qualification (NTR)">
              <Inp value={programInfo.qualification_ntr} onChange={v => setPI('qualification_ntr', v)} placeholder="(optional)" />
            </Field>
            <Field label="CoPR Number">
              <Inp value={programInfo.copr_number} onChange={v => setPI('copr_number', v)} placeholder="(optional)" />
            </Field>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Select Applicants (ALL active applicants, no course filter)
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
    queryFn: () =>
      api.get('/registrations', {
        params: { page, limit: 10, search, status: 'active' },
      }).then(r => r.data),
    staleTime: 10000,
  });

  const applicants: any[] = data?.data  || [];
  const pages              = data?.pages || 1;
  const total              = data?.total || 0;

  function toggle(id: number) {
    setSelectedIds(selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]);
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
        {selectedIds.length > 0 && (
          <span className="badge badge-blue">{selectedIds.length} selected</span>
        )}
      </div>
      <p className="text-xs text-text-muted -mt-2">
        Select all applicants who attended this training batch. Their personal information is already saved from registration.
      </p>

      {/* Search */}
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
              <th>Name</th>
              <th>ULI</th>
              <th>Contact</th>
              <th>Sex</th>
              <th>Civil Status</th>
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
// STEP 2 — Training Details per applicant
// (personal info is read-only, pulled from registration)
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
        Personal info is pre-filled from registration. Fill in the training-specific fields below for each trainee.
      </p>

      {applicants.map((r: any, idx) => {
        const ex         = getEx(r.id);
        const isOpen     = openId === r.id;
        const suggested  = suggestId(idx);
        const isComplete = !!(ex.client_type && ex.date_started && ex.date_finished);

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

                    {/* Read-only personal info from registration */}
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

                    {/* Student ID */}
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

                    {/* Training fields */}
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
                        <Field label="Date Started (mm-dd-yy)" required>
                          <Inp value={ex.date_started} onChange={v => setEx(r.id, 'date_started', v)} placeholder="07-21-25" />
                        </Field>
                        <Field label="Date Finished (mm-dd-yy)" required>
                          <Inp value={ex.date_finished} onChange={v => setEx(r.id, 'date_finished', v)} placeholder="09-12-25" />
                        </Field>
                        <Field label="Reason for Not Finishing">
                          <Inp value={ex.reason_not_finishing} onChange={v => setEx(r.id, 'reason_not_finishing', v)} placeholder="(optional)" />
                        </Field>
                        <Field label="Assessment Results">
                          <Inp value={ex.assessment_results} onChange={v => setEx(r.id, 'assessment_results', v)} placeholder="(optional)" />
                        </Field>
                      </div>
                    </div>

                    {/* Employment */}
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
// STEP 3 — Provider & Program info (pre-filled, editable)
// ─────────────────────────────────────────────────────────────────────────────
function StepProviderProgram({
  provider, setProvider,
  programInfo, setProgramInfo,
  courseName,
}: {
  provider: ProviderInfo;
  setProvider: (v: ProviderInfo) => void;
  programInfo: ProgramInfo;
  setProgramInfo: (v: ProgramInfo) => void;
  courseName: string;
}) {
  function setP(k: keyof ProviderInfo, v: string) { setProvider({ ...provider, [k]: v }); }
  function setPI(k: keyof ProgramInfo, v: string) { setProgramInfo({ ...programInfo, [k]: v }); }

  return (
    <div className="space-y-6">

      {/* TVET Provider */}
      <div>
        <div className="form-section-title"><Building2 size={15} /> TVET Providers Profile</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Report Title">
            <Inp value={provider.title} onChange={v => setP('title', v)} />
          </Field>
          <Field label="Program Title">
            <Inp value={provider.program_title} onChange={v => setP('program_title', v)} placeholder="e.g. Reflexology Therapy" />
          </Field>
          <Field label="Region"><Inp value={provider.region} onChange={v => setP('region', v)} /></Field>
          <Field label="Province"><Inp value={provider.province} onChange={v => setP('province', v)} /></Field>
          <Field label="District"><Inp value={provider.district} onChange={v => setP('district', v)} /></Field>
          <Field label="Municipality / City"><Inp value={provider.municipality} onChange={v => setP('municipality', v)} /></Field>
          <Field label="Name of Provider" required><Inp value={provider.provider_name} onChange={v => setP('provider_name', v)} /></Field>
          <Field label="TBP ID Number"><Inp value={provider.tbp_id} onChange={v => setP('tbp_id', v)} placeholder="(optional)" /></Field>
          <div className="md:col-span-2">
            <Field label="Address"><Inp value={provider.address} onChange={v => setP('address', v)} /></Field>
          </div>
          <Field label="Type of Institution" required>
            <Sel value={provider.institution_type} onChange={v => setP('institution_type', v)} options={INSTITUTION_TYPES} />
          </Field>
          <Field label="Classification of Provider"><Inp value={provider.classification} onChange={v => setP('classification', v)} /></Field>
          <Field label="Full Qualification (WTR)"><Inp value={provider.full_qualification} onChange={v => setP('full_qualification', v)} placeholder="(optional)" /></Field>
          <Field label="Qualification (Clustered)"><Inp value={provider.qualification_clustered} onChange={v => setP('qualification_clustered', v)} placeholder="(optional)" /></Field>
        </div>
      </div>

      {/* Program info — course is locked from step 0, other fields editable */}
      <div>
        <div className="form-section-title"><BookOpen size={15} /> Program Profile</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Delivery Mode (Course)">
            <input className="input-base text-sm bg-bg-input opacity-70 cursor-not-allowed" value={courseName} readOnly />
          </Field>
          <Field label="Industry Sector">
            <Sel
              value={programInfo.industry_sector}
              onChange={v => { setPI('industry_sector', v); if (v !== 'Others') setPI('industry_sector_other', ''); }}
              options={INDUSTRY_SECTORS}
            />
          </Field>
          {programInfo.industry_sector === 'Others' && (
            <Field label="Please Specify">
              <Inp value={programInfo.industry_sector_other} onChange={v => setPI('industry_sector_other', v)} placeholder="Specify sector" />
            </Field>
          )}
          <Field label="Qualification (NTR)"><Inp value={programInfo.qualification_ntr} onChange={v => setPI('qualification_ntr', v)} placeholder="(optional)" /></Field>
          <Field label="CoPR Number"><Inp value={programInfo.copr_number} onChange={v => setPI('copr_number', v)} placeholder="(optional)" /></Field>
        </div>
      </div>

      {/* Signatories */}
      <div>
        <div className="form-section-title"><User size={15} /> Signatories</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Prepared By (Left)"><Inp value={provider.prepared_by_left} onChange={v => setP('prepared_by_left', v)} placeholder="Name, Title" /></Field>
          <Field label="Prepared By (Right)"><Inp value={provider.prepared_by_right} onChange={v => setP('prepared_by_right', v)} placeholder="Name, Title" /></Field>
          <Field label="NCLC Administrator"><Inp value={provider.nclc_admin} onChange={v => setP('nclc_admin', v)} placeholder="Name" /></Field>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Review & Print
// ─────────────────────────────────────────────────────────────────────────────
function StepReviewPrint({
  provider, programInfo, courseName,
  applicants, extras, sectorCode, savedReportId,
}: {
  provider: ProviderInfo;
  programInfo: ProgramInfo;
  courseName: string;
  applicants: any[];
  extras: Record<number, TraineeExtra>;
  sectorCode: string;
  savedReportId: number | null;
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
        body { font-family: Arial, sans-serif; font-size: 7.5px; color: #000; background: #fff; }
        .page { padding: 8mm; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; font-size: 7px; }
        th { text-align: center; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: landscape; margin: 6mm; }
        }
      </style>
    </head><body><div class="page">${content}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  const sectorDisplay = programInfo.industry_sector === 'Others'
    ? (programInfo.industry_sector_other || 'Others')
    : programInfo.industry_sector;

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

      {/* Scrollable preview */}
      <div className="overflow-auto rounded-xl border border-border">
        <div
          ref={printRef}
          style={{
            fontFamily: 'Arial, sans-serif', fontSize: '8px',
            padding: '10mm', background: '#fff', color: '#000', minWidth: '1200px',
          }}
        >
          {/* Title block */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', textDecoration: 'underline' }}>
              {provider.title || 'ENROLLMENT/TERMINAL REPORT'}
            </div>
            {provider.provider_name && (
              <div style={{ fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>{provider.provider_name}</div>
            )}
            {provider.program_title && (
              <div style={{ fontSize: 9, marginTop: 1 }}>{provider.program_title}</div>
            )}
          </div>

          {/* ── TVET Providers Profile table ── */}
          <table>
            <thead>
              <tr>
                <td colSpan={11} style={{ background: '#f4a7b9', textAlign: 'center', fontWeight: 'bold', fontSize: 9, padding: '4px', border: '1px solid #000' }}>
                  TVET Providers Profile
                </td>
              </tr>
              <tr>
                {['Region','Province','District','Municipality/City','Name of Provider','TBP ID Number','Address','Type of Institution','Classification of Provider','Full Qualification (WTR)','Qualification (Clustered)'].map(h => (
                  <th key={h} style={{ background: '#888', color: '#fff', fontSize: 7, padding: '2px 3px', border: '1px solid #000' }}>{h}</th>
                ))}
              </tr>
              <tr>
                {['(a)','(b)','(c)','(d)','(e)','(f)','(g)','(h)','(i)','(j)','(k)'].map(l => (
                  <th key={l} style={{ background: '#ffe066', fontSize: 7, padding: '2px 3px', border: '1px solid #000' }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[provider.region, provider.province, provider.district, provider.municipality,
                  provider.provider_name, provider.tbp_id, provider.address,
                  provider.institution_type, provider.classification,
                  provider.full_qualification, provider.qualification_clustered,
                ].map((v, i) => (
                  <td key={i} style={{ border: '1px solid #000', padding: '3px 4px', fontSize: 8 }}>{v || ''}</td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* ── Main data table ── */}
          <table>
            <thead>
              {/* Section color headers */}
              <tr>
                <td colSpan={5}  style={{ background: '#f4a7b9', textAlign: 'center', fontWeight: 'bold', padding: '3px', border: '1px solid #000', fontSize: 8 }}>Program Profile</td>
                <td colSpan={13} style={{ background: '#90ee90', textAlign: 'center', fontWeight: 'bold', padding: '3px', border: '1px solid #000', fontSize: 8 }}>Students Profile</td>
                <td colSpan={7}  style={{ background: '#90ee90', textAlign: 'center', fontWeight: 'bold', padding: '3px', border: '1px solid #000', fontSize: 8 }}>&nbsp;</td>
                <td colSpan={3}  style={{ background: '#add8e6', textAlign: 'center', fontWeight: 'bold', padding: '3px', border: '1px solid #000', fontSize: 8 }}>Employment</td>
              </tr>
              {/* Column names */}
              <tr>
                {[
                  'Qualification (NTR)','CoPR Number','Delivery Mode','Industry Sector of Qualification','Others, Please Specify',
                  'Student ID Number','Family/Last Name','First Name','Middle Name','Contact Number','Email',
                  'Street No. and Street Address','Barangay','Municipality/City','District','Province',
                  'Sex','Date of Birth (mm-dd-yy)','Age','Civil Status','Highest Educational Attainment',
                  'PGS Training Component','Voucher Number','Client Type',
                  'Date Started (mm-dd-yy)','Date Finished (mm-dd-yy)','Reason for not Finishing','Assessment Results',
                  'Employment Date (mm-dd-yy)','Name of Employer','Address of Employer',
                ].map((h, i) => (
                  <th key={i} style={{ background: '#888', color: '#fff', fontSize: 6, padding: '2px 2px', border: '1px solid #000', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
              {/* Column letters */}
              <tr>
                {['(l)','(m)','(n)','(o)','(p)',
                  '(q)','','','','(u)','(v)','(w)','(x)','(y)','(z)','(aa)',
                  '(ac)','(ad)','(ae)','(af)','(ag)',
                  '(ai)','(aj)','(ak)','(al)','(am)','(an)','(ao)',
                  '(ap)','(aq)','(ar)',
                ].map((l, i) => (
                  <th key={i} style={{ background: '#ffe066', fontSize: 6.5, padding: '2px 2px', border: '1px solid #000' }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applicants.map((r: any, idx) => {
                const ex  = extras[r.id] ?? emptyExtra(r.id);
                const sid = ex.student_id_number || suggestId(idx);
                const cells = [
                  // Program (same for all rows)
                  programInfo.qualification_ntr,
                  programInfo.copr_number,
                  courseName,
                  programInfo.industry_sector !== 'Others' ? programInfo.industry_sector : '',
                  programInfo.industry_sector === 'Others' ? programInfo.industry_sector_other : '',
                  // Student profile — from registration
                  sid,
                  r.last_name,
                  r.first_name,
                  r.middle_name || '',
                  r.contact_no  || '',
                  r.email       || '',
                  [r.address_street, r.address_subdivision].filter(Boolean).join(', '),
                  r.address_barangay  || '',
                  r.address_city      || '',
                  '',                        // district (not in registration schema)
                  r.address_province  || '',
                  r.sex               || '',
                  dob(r),
                  r.age               || '',
                  r.civil_status      || '',
                  r.educational_attainment || '',
                  // Training — from extras
                  ex.pgs_training_component,
                  ex.voucher_number,
                  ex.client_type,
                  ex.date_started,
                  ex.date_finished,
                  ex.reason_not_finishing,
                  ex.assessment_results,
                  // Employment
                  ex.employment_date,
                  ex.employer_name,
                  ex.employer_address,
                ];
                return (
                  <tr key={r.id}>
                    {cells.map((v, i) => (
                      <td key={i} style={{ border: '1px solid #000', padding: '2px 3px', fontSize: 7.5 }}>{v || ''}</td>
                    ))}
                  </tr>
                );
              })}
              {/* Blank padding rows (min 3 rows visible) */}
              {[...Array(Math.max(0, 3 - applicants.length))].map((_, i) => (
                <tr key={`blank-${i}`}>
                  {[...Array(31)].map((_, j) => (
                    <td key={j} style={{ border: '1px solid #000', padding: '10px 3px' }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatories */}
          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                {[
                  { pre: 'Prepared by:',       name: provider.prepared_by_left,  bottom: false },
                  { pre: 'Prepared by:',       name: provider.prepared_by_right, bottom: false },
                  { pre: 'NCLC Administrator', name: provider.nclc_admin,        bottom: true  },
                ].map((s, i) => (
                  <td key={i} style={{ width: '33%', padding: '0 8px', verticalAlign: 'bottom', border: 'none', textAlign: s.bottom ? 'right' : 'left' }}>
                    {!s.bottom && <div style={{ fontSize: 7, color: '#555', marginBottom: 24 }}>{s.pre}</div>}
                    <div style={{ borderTop: '1px solid #000', paddingTop: 2, fontSize: 9, fontWeight: 'bold' }}>{s.name || ''}</div>
                    {s.bottom && <div style={{ fontSize: 7, color: '#555', marginTop: 2 }}>{s.pre}</div>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports List
// ─────────────────────────────────────────────────────────────────────────────
function ReportsList({ onNew, onView }: { onNew: () => void; onView: (id: number) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', page, search],
    queryFn: () => api.get('/reports', { params: { page, limit: 15, search } }).then(r => r.data),
    staleTime: 10000,
  });

  const reports: any[] = data?.data  || [];
  const pages           = data?.pages || 1;
  const total           = data?.total || 0;

  async function archive(id: number) {
    try { await api.patch(`/reports/${id}/archive`); toast.success('Archived.'); refetch(); }
    catch { toast.error('Failed to archive.'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Reports</h1>
          <p className="text-sm text-text-muted mt-1">{total} saved report{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw size={14} /></button>
          <button onClick={onNew} className="btn-primary text-sm"><Plus size={14} /> New Report</button>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="input-base pl-9 text-sm" placeholder="Search reports…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Title / Program</th><th>Course</th><th>Trainees</th><th>Created By</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" /></td>)}</tr>)
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="text-sm text-text-muted mb-3">No reports yet.</div>
                  <button onClick={onNew} className="btn-primary text-sm mx-auto"><Plus size={14} /> Create First Report</button>
                </td>
              </tr>
            ) : reports.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <div className="font-semibold text-sm text-text-primary">{r.title}</div>
                  {r.program_title && <div className="text-xs text-text-muted">{r.program_title}</div>}
                </td>
                <td className="text-xs text-text-secondary max-w-[160px] truncate">{r.delivery_mode || '—'}</td>
                <td><span className="badge badge-blue">{r.trainee_count} trainee{r.trainee_count !== 1 ? 's' : ''}</span></td>
                <td className="text-xs text-text-muted">{r.creator_name || '—'}</td>
                <td className="text-xs text-text-muted">
                  {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button title="View / Print" onClick={() => onView(r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors">
                      <Eye size={14} />
                    </button>
                    <button title="Archive" onClick={() => archive(r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors">
                      <Archive size={14} />
                    </button>
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
function ReportWizard({ onDone, initialReportId }: { onDone: () => void; initialReportId?: number }) {
  const queryClient = useQueryClient();
  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState<number | null>(initialReportId ?? null);
  const [loaded, setLoaded] = useState(false);

  // Step 0
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [programInfo, setProgramInfo]       = useState<ProgramInfo>({
    qualification_ntr: '', copr_number: '', industry_sector: '', industry_sector_other: '',
  });

  // Step 1
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Step 2
  const [extras, setExtras] = useState<Record<number, TraineeExtra>>({});

  // Step 3
  const [provider, setProvider] = useState<ProviderInfo>({
    title: 'ENROLLMENT/TERMINAL REPORT', program_title: '',
    region: 'REGION 4A', province: 'CAVITE', district: 'District I', municipality: 'Noveleta',
    provider_name: 'Noveleta Training Center', tbp_id: '',
    address: 'Poblacion, Noveleta Cavite', institution_type: 'Public', classification: 'LGU',
    full_qualification: '', qualification_clustered: '',
    prepared_by_left: '', prepared_by_right: '', nclc_admin: '',
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
      title:                  existingReport.title                  || '',
      program_title:          existingReport.program_title          || '',
      region:                 existingReport.region                 || '',
      province:               existingReport.province               || '',
      district:               existingReport.district               || '',
      municipality:           existingReport.municipality           || '',
      provider_name:          existingReport.provider_name          || '',
      tbp_id:                 existingReport.tbp_id                 || '',
      address:                existingReport.address                || '',
      institution_type:       existingReport.institution_type       || '',
      classification:         existingReport.classification         || '',
      full_qualification:     existingReport.full_qualification     || '',
      qualification_clustered:existingReport.qualification_clustered|| '',
      prepared_by_left:       existingReport.prepared_by_left       || '',
      prepared_by_right:      existingReport.prepared_by_right      || '',
      nclc_admin:             existingReport.nclc_admin             || '',
    });
    setProgramInfo({
      qualification_ntr:     existingReport.qualification_ntr     || '',
      copr_number:           existingReport.copr_number           || '',
      industry_sector:       existingReport.industry_sector       || '',
      industry_sector_other: existingReport.industry_sector_other || '',
    });
    setSelectedCourse({ id: null, name: existingReport.delivery_mode, sector: existingReport.industry_sector });
    if (existingReport.trainees?.length) {
      setSelectedIds(existingReport.trainees.map((t: any) => t.registration_id));
      const newExtras: Record<number, TraineeExtra> = {};
      for (const t of existingReport.trainees) {
        newExtras[t.registration_id] = {
          registration_id:        t.registration_id,
          student_id_number:      t.student_id_number      || '',
          pgs_training_component: t.pgs_training_component || '',
          voucher_number:         t.voucher_number         || '',
          client_type:            t.client_type            || '',
          date_started:           t.date_started           || '',
          date_finished:          t.date_finished          || '',
          reason_not_finishing:   t.reason_not_finishing   || '',
          assessment_results:     t.assessment_results     || '',
          employment_date:        t.employment_date        || '',
          employer_name:          t.employer_name          || '',
          employer_address:       t.employer_address       || '',
        };
      }
      setExtras(newExtras);
    }
    setStep(4);
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
  const courseName = selectedCourse?.name || '';

  function canProceed(): boolean {
    if (step === 0) return !!(selectedCourse && programInfo.industry_sector);
    if (step === 1) return selectedIds.length > 0;
    if (step === 3) return !!(provider.provider_name && provider.institution_type);
    return true;
  }

  async function handleSaveAndPreview() {
    const trainees = selectedIds.map((id, idx) => {
      const ex = extras[id] ?? emptyExtra(id);
      return {
        registration_id:        id,
        student_id_number:      ex.student_id_number || `NTC-${sectorCode}-${String(idx + 1).padStart(4, '0')}`,
        pgs_training_component: ex.pgs_training_component,
        voucher_number:         ex.voucher_number,
        client_type:            ex.client_type,
        date_started:           ex.date_started   || null,
        date_finished:          ex.date_finished  || null,
        reason_not_finishing:   ex.reason_not_finishing,
        assessment_results:     ex.assessment_results,
        employment_date:        ex.employment_date || null,
        employer_name:          ex.employer_name,
        employer_address:       ex.employer_address,
      };
    });

    const payload = {
      ...provider,
      ...programInfo,
      delivery_mode: courseName,
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
      setStep(4);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  const slide = { enter: { opacity: 0, x: 20 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onDone} className="btn-ghost text-sm"><ChevronLeft size={14} /> All Reports</button>
        <div className="flex-1">
          <h1 className="section-title">{initialReportId ? 'View / Edit Report' : 'New Report'}</h1>
          <p className="text-sm text-text-muted mt-1">TESDA Enrollment / Terminal Report</p>
        </div>
        {savedReportId && (
          <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12} /> Saved (ID: {savedReportId})</span>
        )}
      </div>

      {/* Step indicator */}
      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => i < step && setStep(i)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  i === step
                    ? 'btn-primary'
                    : i < step
                    ? 'btn-ghost text-accent border-accent'
                    : 'opacity-40 cursor-default btn-ghost'
                )}
              >
                {i < step ? <Check size={12} /> : <s.icon size={12} />}
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
              <StepProviderProgram
                provider={provider} setProvider={setProvider}
                programInfo={programInfo} setProgramInfo={setProgramInfo}
                courseName={courseName}
              />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="s4" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18 }}>
              <StepReviewPrint
                provider={provider} programInfo={programInfo} courseName={courseName}
                applicants={selectedApplicants} extras={extras}
                sectorCode={sectorCode} savedReportId={savedReportId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
          <ChevronLeft size={14} /> Previous
        </button>

        <div className="flex items-center gap-2">
          {!canProceed() && step < 4 && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {step === 0 ? 'Select a course and industry sector'
               : step === 1 ? 'Select at least one applicant'
               : step === 3 ? 'Fill required provider fields'
               : 'Fill required fields'}
            </span>
          )}

          {/* Step 3 → Save then go to preview */}
          {step === 3 && (
            <button className="btn-primary text-sm" onClick={handleSaveAndPreview} disabled={saving || !canProceed()}>
              {saving ? 'Saving…' : <><Save size={14} /> Save & Preview</>}
            </button>
          )}

          {/* Steps 0–2: just Next */}
          {step < 3 && (
            <button className="btn-primary text-sm" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
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
  const [mode, setMode]                 = useState<'list' | 'new' | 'view'>('list');
  const [viewReportId, setViewReportId] = useState<number | null>(null);

  if (mode === 'new')
    return <ReportWizard onDone={() => setMode('list')} />;

  if (mode === 'view' && viewReportId)
    return (
      <ReportWizard
        onDone={() => { setMode('list'); setViewReportId(null); }}
        initialReportId={viewReportId}
      />
    );

  return (
    <ReportsList
      onNew={() => setMode('new')}
      onView={id => { setViewReportId(id); setMode('view'); }}
    />
  );
}