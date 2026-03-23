// frontend/src/pages/shared/Applicants.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, Archive, Filter, RefreshCw, FilePlus, ArrowLeft,
  Pencil, ChevronRight, ChevronLeft, CheckCircle, User, MapPin,
  Briefcase, GraduationCap, Tag, AlertCircle, X, ChevronDown,
  RefreshCcw,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';
import AddressSelect, { REGION_OPTIONS, getProvinces, getMunicipalities } from '@/components/AddressSelect';
import type { AddressValue } from '@/components/AddressSelect';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Registration Form Constants ──────────────────────────────────────────────
const CIVIL_STATUS     = ['Single', 'Married', 'Separated/Divorced/Annulled', 'Widow/er', 'Common Law/Live-in'];
const EMP_STATUS       = ['Wage-Employed', 'Underemployed', 'Self-Employed', 'Unemployed'];
const EMP_TYPE         = ['None', 'Regular', 'Casual', 'Job Order', 'Probationary', 'Permanent', 'Contractual', 'Temporary'];
const MONTHS           = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EDU              = ['No Grade Completed','Elementary Undergraduate','Elementary Graduate','High School Undergraduate','High School Graduate','Junior High (K-12)','Senior High (K-12)','Post-Secondary Non-Tertiary/ Technical Vocational Course Undergraduate','Post-Secondary Non-Tertiary/ Technical Vocational Course Graduate','College Undergraduate','College Graduate','Masteral','Doctorate'];
const CLASSIFICATIONS  = ['4Ps Beneficiary','Agrarian Reform Beneficiary','Balik Probinsya','Displaced Workers','Drug Dependents Surrenderees/Surrenderers','Family Members of AFP and PPN Killed-in-Action','Family Members of AFP and PPN Wounded-in-Action','Farmers and Fishermen','Indigenous People & Cultural Communities','Inmates and Detainees','Industry Workers','MILF Beneficiary','Out-of-School-Youth','Overseas Filipino Workers (OFW) Dependent','RCEF-RESP','Rebel Returnees/Decommissioned Combatants','Returning/Repatriated Overseas Filipino Workers (OFW)','Student','TESDA Alumni','TVET Trainers','Uniformed Personnel','Victim of Natural Disasters and Calamities','Wounded-in-Action AFP & PPN Personnel','Others'];
const DISABILITY_TYPE  = ['Mental/Intellectual','Hearing Disability','Psychosocial Disability','Visual Disability','Speech Impairment','Disability Due to Chronic Illness','Orthopedic (Musculoskeletal) Disability','Multiple Disabilities','Learning Disability'];
const DISABILITY_CAUSE = ['Congenital/Inborn', 'Illness', 'Injury'];
const SCHOLARSHIP_OPTIONS = ['TWSP', 'PESFA', 'STEP', 'Regular', 'None/Not Applicable', 'Others'];

const FORM_STEPS = [
  { label: 'Profile & Address', icon: User },
  { label: 'Personal Info',     icon: MapPin },
  { label: 'Education',         icon: GraduationCap },
  { label: 'Classification',    icon: Tag },
  { label: 'Course & Consent',  icon: Briefcase },
  { label: 'Summary',           icon: CheckCircle },
];

const emptyForm = {
  last_name: '', first_name: '', middle_name: '', extension_name: '',
  address_subdivision: '', address_street: '', address_barangay: '',
  address_city: '', address_province: '', address_region: '',
  email: '', contact_no: '', nationality: 'Filipino',
  sex: '', civil_status: '',
  employment_status: '', employment_type: 'None',
  birth_month: '', birth_day: '', birth_year: '',
  birthplace_city: '', birthplace_province: '', birthplace_region: '',
  educational_attainment: '',
  parent_guardian_name: '', parent_guardian_address: '',
  client_classification: '',
  has_disability: false,
  disability_type: '', disability_cause: '',
  course_qualification: '', scholarship_type: '', scholarship_other: '',
  privacy_consent: false,
};

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-accent"> *</span>}</label>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options, placeholder, disabled }: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <select className="input-base disabled:opacity-50 disabled:cursor-not-allowed"
      value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder ?? '— Select —'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return <div className="form-section-title"><Icon size={16} />{children}</div>;
}

// ─── Registration Modal ───────────────────────────────────────────────────────
function RegistrationModal({ editId, onClose, onSuccess }: {
  editId?: number | null; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!editId;
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: existing } = useQuery({
    queryKey: ['registration', editId],
    queryFn: () => api.get(`/registrations/${editId}`).then(r => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        ...emptyForm, ...existing,
        has_disability:  !!existing.has_disability,
        privacy_consent: !!existing.privacy_consent,
        birth_day:       existing.birth_day?.toString()  ?? '',
        birth_year:      existing.birth_year?.toString() ?? '',
        scholarship_other: '',
      });
    }
  }, [existing]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })); }
  function inp(key: string) {
    return { value: (form as any)[key], onChange: (e: any) => set(key, e.target.value), className: 'input-base' };
  }

  const birthProvinces      = useMemo(() => getProvinces(form.birthplace_region), [form.birthplace_region]);
  const birthMunicipalities = useMemo(() => getMunicipalities(form.birthplace_region, form.birthplace_province), [form.birthplace_region, form.birthplace_province]);

  function setBirthRegion(v: string)   { setForm(f => ({ ...f, birthplace_region: v, birthplace_province: '', birthplace_city: '' })); }
  function setBirthProvince(v: string) { setForm(f => ({ ...f, birthplace_province: v, birthplace_city: '' })); }

  const addressValue: AddressValue = {
    address_subdivision: form.address_subdivision,
    address_street: form.address_street,
    address_barangay: form.address_barangay,
    address_city: form.address_city,
    address_province: form.address_province,
    address_region: form.address_region,
  };

  function handleSubmitClick() {
    if (!form.last_name || !form.first_name) return toast.error('First and Last name are required.');
    if (!form.privacy_consent) return toast.error('Privacy consent is required.');
    setShowConfirm(true);
  }

  async function doSubmit() {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/registrations/${editId}`, form);
        await queryClient.invalidateQueries({ queryKey: ['registration', editId] });
        toast.success('Registration updated successfully.');
      } else {
        await api.post('/registrations', form);
        toast.success('Registration submitted successfully.');
      }
      await queryClient.invalidateQueries({ queryKey: ['registrations'] });
      setShowConfirm(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save.');
      setShowConfirm(false);
    } finally { setLoading(false); }
  }

  const slide = { enter: { opacity: 0, x: 24 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ duration: 0.2 }}
        className="card w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEdit ? 'Edit Registration' : 'New Learner Registration'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">TESDA MIS Form 03-01 — Learners Profile Form</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {FORM_STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    i === step ? 'btn-primary' : i < step ? 'btn-ghost text-accent border-accent' : 'opacity-40 cursor-default btn-ghost'
                  )}
                >
                  {i < step ? <CheckCircle size={12} /> : <s.icon size={12} />}
                  {s.label}
                </button>
                {i < FORM_STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <SectionTitle icon={User}>Learner / Manpower Profile</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-2"><Field label="Last Name" required><input {...inp('last_name')} placeholder="Dela Cruz" /></Field></div>
                  <div><Field label="Extension Name"><input {...inp('extension_name')} placeholder="Jr., Sr." /></Field></div>
                  <div className="md:col-span-2"><Field label="First Name" required><input {...inp('first_name')} placeholder="Juan" /></Field></div>
                  <div className="md:col-span-2"><Field label="Middle Name"><input {...inp('middle_name')} placeholder="Santos" /></Field></div>
                </div>
                <SectionTitle icon={MapPin}>Complete Permanent Mailing Address</SectionTitle>
                <AddressSelect value={addressValue} onChange={updated => setForm(f => ({ ...f, ...updated }))} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <Field label="Email Address / Facebook Account">
                      <input {...inp('email')} type="email" placeholder="juan@email.com" />
                    </Field>
                  </div>
                  <Field label="Contact No."><input {...inp('contact_no')} placeholder="09xxxxxxxxx" /></Field>
                </div>
                <div className="mt-4 max-w-xs"><Field label="Nationality"><input {...inp('nationality')} /></Field></div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <SectionTitle icon={User}>Personal Information</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="label">Sex</label>
                    <div className="flex flex-col gap-2 mt-1">
                      {['Male', 'Female'].map(s => (
                        <label key={s} className="checkbox-label">
                          <input type="radio" name="sex" value={s} checked={form.sex === s} onChange={() => set('sex', s)} />{s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Civil Status</label>
                    <div className="flex flex-col gap-2 mt-1">
                      {CIVIL_STATUS.map(s => (
                        <label key={s} className="checkbox-label">
                          <input type="radio" name="civil" value={s} checked={form.civil_status === s} onChange={() => set('civil_status', s)} />
                          <span className="text-xs">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Employment Status</label>
                    <div className="flex flex-col gap-2 mt-1 mb-4">
                      {EMP_STATUS.map(s => (
                        <label key={s} className="checkbox-label">
                          <input type="radio" name="emp_status" value={s} checked={form.employment_status === s} onChange={() => set('employment_status', s)} />
                          <span className="text-xs">{s}</span>
                        </label>
                      ))}
                    </div>
                    <label className="label">Employment Type <span className="text-xs font-normal text-text-muted ml-1">(if employed)</span></label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {EMP_TYPE.map(t => (
                        <label key={t} className="checkbox-label">
                          <input type="radio" name="emp_type" value={t} checked={form.employment_type === t} onChange={() => set('employment_type', t)} />
                          <span className="text-xs">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <SectionTitle icon={MapPin}>Birthdate</SectionTitle>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                  <Field label="Month"><Sel value={form.birth_month} onChange={v => set('birth_month', v)} options={MONTHS} /></Field>
                  <Field label="Day"><input {...inp('birth_day')} type="number" min={1} max={31} placeholder="15" /></Field>
                  <Field label="Year"><input {...inp('birth_year')} type="number" min={1900} max={new Date().getFullYear()} placeholder="1995" /></Field>
                  <Field label="Age">
                    <input className="input-base bg-bg-input opacity-60" readOnly placeholder="Auto"
                      value={form.birth_year && form.birth_month && form.birth_day
                        ? Math.floor((Date.now() - new Date(`${form.birth_month} ${form.birth_day}, ${form.birth_year}`).getTime()) / 31557600000)
                        : ''} />
                  </Field>
                </div>
                <SectionTitle icon={MapPin}>Birthplace</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Region"><Sel value={form.birthplace_region} onChange={setBirthRegion} options={REGION_OPTIONS} placeholder="— Select Region —" /></Field>
                  <Field label="Province"><Sel value={form.birthplace_province} onChange={setBirthProvince} options={birthProvinces} placeholder="— Select Province —" disabled={!form.birthplace_region} /></Field>
                  <Field label="City / Municipality"><Sel value={form.birthplace_city} onChange={v => set('birthplace_city', v)} options={birthMunicipalities} placeholder="— Select City —" disabled={!form.birthplace_province} /></Field>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <SectionTitle icon={GraduationCap}>Educational Attainment Before Training</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8">
                  {EDU.map(e => (
                    <label key={e} className="checkbox-label">
                      <input type="radio" name="edu" value={e} checked={form.educational_attainment === e} onChange={() => set('educational_attainment', e)} />
                      <span className="text-xs">{e}</span>
                    </label>
                  ))}
                </div>
                <SectionTitle icon={User}>Parent / Guardian</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name"><input {...inp('parent_guardian_name')} placeholder="Parent/Guardian Full Name" /></Field>
                  <Field label="Complete Permanent Mailing Address"><input {...inp('parent_guardian_address')} placeholder="Complete Address" /></Field>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <SectionTitle icon={Tag}>Client Classification</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mb-8">
                  {CLASSIFICATIONS.map(c => (
                    <label key={c} className="checkbox-label">
                      <input type="radio" name="class" value={c} checked={form.client_classification === c} onChange={() => set('client_classification', c)} />
                      <span className="text-xs">{c}</span>
                    </label>
                  ))}
                </div>
                <div className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <SectionTitle icon={AlertCircle}>Type of Disability</SectionTitle>
                    <span className="text-xs text-text-muted italic">For Persons with Disability Only</span>
                  </div>
                  <label className="checkbox-label mb-4">
                    <input type="checkbox" checked={form.has_disability}
                      onChange={e => { set('has_disability', e.target.checked); if (!e.target.checked) { set('disability_type', ''); set('disability_cause', ''); } }} />
                    <span className="text-sm">This learner has a disability</span>
                  </label>
                  {form.has_disability && (
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="label mb-2">Type of Disability</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                          {DISABILITY_TYPE.map(d => (
                            <label key={d} className="checkbox-label">
                              <input type="radio" name="dis_type" value={d} checked={form.disability_type === d} onChange={() => set('disability_type', d)} />
                              <span className="text-xs">{d}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label mb-2">Cause of Disability</label>
                        <div className="flex gap-4">
                          {DISABILITY_CAUSE.map(c => (
                            <label key={c} className="checkbox-label">
                              <input type="radio" name="dis_cause" value={c} checked={form.disability_cause === c} onChange={() => set('disability_cause', c)} />
                              <span className="text-xs">{c}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <SectionTitle icon={Briefcase}>Name of Course / Qualification</SectionTitle>
                <div className="mb-6"><input {...inp('course_qualification')} placeholder="e.g. Computer Systems Servicing NC II" /></div>
                <SectionTitle icon={Tag}>Scholarship Package</SectionTitle>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SCHOLARSHIP_OPTIONS.map(s => (
                    <button key={s} type="button"
                      onClick={() => { set('scholarship_type', s); if (s !== 'Others') set('scholarship_other', ''); }}
                      className={clsx(
                        'px-4 py-1.5 rounded-lg text-sm font-medium border transition-all',
                        form.scholarship_type === s
                          ? 'bg-accent text-white border-accent'
                          : 'bg-transparent text-text-secondary border-border hover:border-accent hover:text-accent'
                      )}
                    >{s}</button>
                  ))}
                </div>
                {form.scholarship_type === 'Others' && (
                  <input className="input-base max-w-sm mb-3" value={form.scholarship_other}
                    onChange={e => set('scholarship_other', e.target.value)} placeholder="Please specify scholarship" autoFocus />
                )}
                <div className="mb-6" />
                <div className="form-section-title border-b border-border pb-3 mb-4">
                  <AlertCircle size={16} />Privacy Consent and Disclaimer
                </div>
                <div className="p-4 rounded-xl mb-4 text-xs leading-relaxed bg-bg-input text-text-secondary">
                  I hereby attest that I have read and understood the Privacy Notice of TESDA through its website (
                  <a href="https://www.tesda.gov.ph" target="_blank" rel="noreferrer" className="text-accent underline hover:opacity-80">
                    https://www.tesda.gov.ph
                  </a>) and thereby giving my consent in the processing of my personal information indicated in this Learners Profile.
                </div>
                <div className="flex gap-6">
                  <label className="checkbox-label">
                    <input type="radio" name="consent" checked={form.privacy_consent === true} onChange={() => set('privacy_consent', true)} />
                    <span className="font-medium text-text-primary">Agree</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="radio" name="consent" checked={form.privacy_consent === false} onChange={() => set('privacy_consent', false)} />
                    <span className="font-medium text-text-primary">Disagree</span>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                <SectionTitle icon={CheckCircle}>Review & Confirm</SectionTitle>
                <p className="text-xs text-text-muted mb-5">Please review all information before submitting.</p>

                {[
                  {
                    title: 'Profile & Address', icon: User, rows: [
                      ['Last Name',    form.last_name],
                      ['First Name',   form.first_name],
                      ['Middle Name',  form.middle_name],
                      ['Extension',    form.extension_name],
                      ['Email',        form.email],
                      ['Contact No.',  form.contact_no],
                      ['Nationality',  form.nationality],
                      ['Region',       form.address_region],
                      ['Province',     form.address_province],
                      ['City',         form.address_city],
                      ['Barangay',     form.address_barangay],
                      ['Street',       form.address_street],
                      ['Subdivision',  form.address_subdivision],
                    ]
                  },
                  {
                    title: 'Personal Info', icon: MapPin, rows: [
                      ['Sex',               form.sex],
                      ['Civil Status',      form.civil_status],
                      ['Employment Status', form.employment_status],
                      ['Employment Type',   form.employment_type],
                      ['Birthdate',         form.birth_month && form.birth_day && form.birth_year ? `${form.birth_month} ${form.birth_day}, ${form.birth_year}` : ''],
                      ['Birthplace',        [form.birthplace_city, form.birthplace_province, form.birthplace_region].filter(Boolean).join(', ')],
                    ]
                  },
                  {
                    title: 'Education', icon: GraduationCap, rows: [
                      ['Educational Attainment', form.educational_attainment],
                      ['Parent / Guardian',      form.parent_guardian_name],
                      ['Guardian Address',       form.parent_guardian_address],
                    ]
                  },
                  {
                    title: 'Classification', icon: Tag, rows: [
                      ['Client Classification', form.client_classification],
                      ['Has Disability',        form.has_disability ? 'Yes' : 'No'],
                      ...(form.has_disability ? [
                        ['Disability Type',  form.disability_type] as [string, string],
                        ['Disability Cause', form.disability_cause] as [string, string],
                      ] : []),
                    ]
                  },
                  {
                    title: 'Course & Consent', icon: Briefcase, rows: [
                      ['Course / Qualification', form.course_qualification],
                      ['Scholarship',            form.scholarship_type === 'Others' ? form.scholarship_other : form.scholarship_type],
                      ['Privacy Consent',        form.privacy_consent ? '✓ Agreed' : '✗ Disagreed'],
                    ]
                  },
                ].map(({ title, icon: Icon, rows }) => (
                  <div key={title} className="mb-5 border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-input border-b border-border">
                      <Icon size={13} className="text-accent" />
                      <span className="text-xs font-semibold text-text-primary">{title}</span>
                      <button
                        type="button"
                        onClick={() => setStep(FORM_STEPS.findIndex(s => s.label === title))}
                        className="ml-auto text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3">
                      {rows.map(([label, value]) => (
                        <div key={label}>
                          <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">{label}</div>
                          <div className="text-xs text-text-primary font-medium">
                            {value || <span className="text-text-muted font-normal">—</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-border shrink-0">
          <button className="btn-ghost text-sm" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={14} /> Previous
          </button>
          {step < FORM_STEPS.length - 1 ? (
            <button className="btn-primary text-sm" onClick={() => {
              // Step 0: Name required
              if (step === 0) {
                if (!form.last_name.trim()) return toast.error('Last name is required.');
                if (!form.first_name.trim()) return toast.error('First name is required.');
              }
              // Step 1: Sex, civil status, employment, birthdate required
              if (step === 1) {
                if (!form.sex) return toast.error('Sex is required.');
                if (!form.civil_status) return toast.error('Civil status is required.');
                if (!form.employment_status) return toast.error('Employment status is required.');
                if (!form.birth_month || !form.birth_day || !form.birth_year) return toast.error('Complete birthdate is required.');
              }
              // Step 2: Educational attainment required
              if (step === 2) {
                if (!form.educational_attainment) return toast.error('Educational attainment is required.');
              }
              // Step 3: Client classification required
              if (step === 3) {
                if (!form.client_classification) return toast.error('Client classification is required.');
                if (form.has_disability && !form.disability_type) return toast.error('Disability type is required.');
                if (form.has_disability && !form.disability_cause) return toast.error('Disability cause is required.');
              }
              setStep(s => s + 1);
            }}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button className="btn-primary text-sm" onClick={handleSubmitClick} disabled={loading}>
              {loading ? 'Saving…' : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Submit Registration'}</>}
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
              className="card p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <CheckCircle size={18} className="text-accent" />
                  </div>
                  <h2 className="text-base font-semibold text-text-primary">
                    {isEdit ? 'Save Changes?' : 'Submit Registration?'}
                  </h2>
                </div>
                <button onClick={() => setShowConfirm(false)} className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-input transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-text-muted mb-6 pl-11">
                {isEdit ? 'Are you sure you want to update this registration?' : 'Please confirm all information is correct before submitting.'}
              </p>
              <div className="flex justify-end gap-3">
                <button className="btn-ghost text-sm" onClick={() => setShowConfirm(false)} disabled={loading}>Cancel</button>
                <button className="btn-primary text-sm" onClick={doSubmit} disabled={loading}>
                  {loading ? 'Saving…' : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Submit'}</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function ApplicantDetail({ id, onBack, isAdmin }: { id: string; onBack: () => void; isAdmin: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: single, isLoading } = useQuery({
    queryKey: ['registration', id],
    queryFn: () => api.get(`/registrations/${id}`).then(r => r.data.data),
  });

  if (isLoading || !single) {
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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost text-sm"><ArrowLeft size={14} /> Back</button>
        <div className="flex-1">
          <h1 className="section-title">
            {r.last_name}, {r.first_name} {r.middle_name ? r.middle_name[0] + '.' : ''}
            {r.extension_name ? ` ${r.extension_name}` : ''}
          </h1>
        </div>
        {isAdmin && (
          <button onClick={() => setEditOpen(true)} className="btn-primary text-sm">
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card p-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
        {fields.map(([label, value]) => (
          <div key={label}>
            <div className="label text-xs mb-0.5">{label}</div>
            <div className="text-sm text-text-primary font-medium">
              {value || <span className="text-text-muted font-normal">—</span>}
            </div>
          </div>
        ))}
      </motion.div>
      <AnimatePresence>
        {editOpen && (
          <RegistrationModal editId={Number(id)} onClose={() => setEditOpen(false)}
            onSuccess={() => { setEditOpen(false); queryClient.invalidateQueries({ queryKey: ['registration', id] }); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Applicants Page ─────────────────────────────────────────────────────
export default function Applicants() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const user     = useAuthStore(state => state.user);
  const isAdmin  = user?.role === 'admin';

  // ── core state ──────────────────────────────────────────────────────────────
  const [tab,              setTab]              = useState<'active' | 'archived'>('active');
  const [search,           setSearch]           = useState('');
  const [page,             setPage]             = useState(1);
  const [limit,            setLimit]            = useState(10);
  const [course,           setCourse]           = useState('');
  const [modalOpen,        setModalOpen]        = useState(false);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [restoreTarget,    setRestoreTarget]    = useState<{ id: number; name: string } | null>(null);

  // ── advanced filter state ────────────────────────────────────────────────────
  const [showFilters,       setShowFilters]       = useState(false);
  const [filterEmpStatus,   setFilterEmpStatus]   = useState('');
  const [filterScholarship, setFilterScholarship] = useState('');
  const [filterDateFrom,    setFilterDateFrom]    = useState('');
  const [filterDateTo,      setFilterDateTo]      = useState('');

  const queryClient = useQueryClient();

  const activeFilterCount = [filterEmpStatus, filterScholarship, filterDateFrom, filterDateTo].filter(Boolean).length;

  function clearFilters() {
    setFilterEmpStatus(''); setFilterScholarship('');
    setFilterDateFrom(''); setFilterDateTo('');
    setPage(1);
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registrations', tab, page, limit, search, course, filterEmpStatus, filterScholarship, filterDateFrom, filterDateTo],
    queryFn: () =>
      api.get('/registrations', {
        params: {
          page, limit, search, course,
          status: tab,
          employment_status: filterEmpStatus  || undefined,
          scholarship_type:  filterScholarship || undefined,
          date_from:         filterDateFrom   || undefined,
          date_to:           filterDateTo     || undefined,
        },
      }).then(r => r.data),
    staleTime: 10000,
    enabled: !id,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-filter'],
    queryFn: () => api.get('/courses', { params: { status: 'active', limit: 100 } }).then(r => r.data.data),
    staleTime: 60000,
    enabled: !id,
  });

  function handleLimitChange(newLimit: number) { setLimit(newLimit); setPage(1); }

  async function handleArchive(rid: number) {
    try {
      await api.patch(`/registrations/${rid}/archive`);
      toast.success('Registration archived.');
      setConfirmArchiveId(null);
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    } catch { toast.error('Failed to archive.'); }
  }

  async function handleRestore(rid: number) {
    try {
      await api.patch(`/registrations/${rid}/restore`);
      toast.success('Registration restored.');
      setRestoreTarget(null);
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    } catch { toast.error('Failed to restore.'); }
  }

  const registrations = data?.data  || [];
  const total         = data?.total || 0;
  const pages         = data?.pages || 1;

  if (id) {
    return (
      <ApplicantDetail id={id} isAdmin={isAdmin}
        onBack={() => navigate(isAdmin ? '/admin/applicants' : '/encoder/applicants')} />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Restore confirm modal ── */}
      <AnimatePresence>
        {restoreTarget && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setRestoreTarget(null)} />
            <motion.div key="dlg" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
              <div className="pointer-events-auto w-full max-w-sm card p-6 shadow-2xl">
                <h3 className="font-bold text-base text-text-primary mb-1">Restore Registration?</h3>
                <p className="text-sm text-text-muted mb-5">
                  <span className="font-medium text-text-primary">{restoreTarget.name}</span> will be moved back to Active.
                </p>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost text-sm" onClick={() => setRestoreTarget(null)}>Cancel</button>
                  <button className="btn-primary text-sm" onClick={() => handleRestore(restoreTarget.id)}>Restore</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Applicants</h1>
          <p className="text-sm mt-1 text-text-muted">{total} {tab} learner{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw size={14} /></button>
          {tab === 'active' && (
            <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
              <FilePlus size={14} /> New Registration
            </button>
          )}
        </div>
      </div>

      {/* ── Active / Archived tabs ── */}
      <div className="flex gap-2 mb-4">
        {(['active', 'archived'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); setConfirmArchiveId(null); }}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize', tab === t ? 'btn-primary' : 'btn-ghost')}>
            {t === 'archived' && <Archive size={13} />}
            {t === 'active' ? 'Active' : 'Archived'}
          </button>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              placeholder="Search by name or contact number…"
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
            />
          </div>

          {/* Course dropdown - FIXED with custom-select class */}
          <div className="relative min-w-[180px]">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
            <select 
              className="w-full h-10 pl-10 pr-8 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all cursor-pointer appearance-none custom-select"
              value={course}
              onChange={e => { setCourse(e.target.value); setPage(1); }}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '16px'
              }}
            >
              <option value="">All Courses</option>
              {coursesData?.map((c: any) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter toggle button - FIXED */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={clsx(
              'h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shrink-0',
              activeFilterCount > 0 
                ? 'bg-accent/10 text-accent border border-accent' 
                : 'border border-border bg-transparent text-text-secondary hover:bg-bg-input hover:text-text-primary'
            )}
          >
            <Filter size={14} />
            <span>Filters</span>
            <ChevronDown 
              size={14} 
              className={clsx('transition-transform', showFilters && 'rotate-180')} 
            />
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: advanced filters (collapsible) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Employment Status - FIXED */}
                  <div>
                    <label className="label text-xs mb-1 block">Employment Status</label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      value={filterEmpStatus}
                      onChange={e => { setFilterEmpStatus(e.target.value); setPage(1); }}
                    >
                      <option value="">All</option>
                      {EMP_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Scholarship - FIXED */}
                  <div>
                    <label className="label text-xs mb-1 block">Scholarship</label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      value={filterScholarship}
                      onChange={e => { setFilterScholarship(e.target.value); setPage(1); }}
                    >
                      <option value="">All</option>
                      {SCHOLARSHIP_OPTIONS.filter(s => s !== 'Others').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Date From - FIXED */}
                  <div>
                    <label className="label text-xs mb-1 block">Registered From</label>
                    <input 
                      type="date" 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      value={filterDateFrom}
                      onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} 
                    />
                  </div>
                  {/* Date To - FIXED */}
                  <div>
                    <label className="label text-xs mb-1 block">Registered To</label>
                    <input 
                      type="date" 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      value={filterDateTo}
                      onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} 
                    />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="btn-ghost text-xs mt-3 text-red-400 hover:text-red-500">
                    ✕ Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Table ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Course</th>
                <th>Sex</th>
                {isAdmin && <th>Civil Status</th>}
                <th>Contact</th>
                {isAdmin && <th>Encoded By</th>}
                <th className="min-w-[120px]">Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(limit)].map((_, i) => (
                  <tr key={i}>{[...Array(isAdmin ? 8 : 6)].map((_, j) => <td key={j}><div className="skeleton" /></td>)}</tr>
                ))
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="text-center py-16">
                    <div className="text-4xl mb-3">{tab === 'archived' ? '🗄️' : '📋'}</div>
                    <div className="text-sm text-text-muted mb-3">
                      {tab === 'archived' ? 'No archived applicants.' : 'No applicants found.'}
                    </div>
                    {tab === 'active' && (
                      <button onClick={() => setModalOpen(true)} className="btn-primary text-sm mx-auto">
                        <FilePlus size={14} /> Register First Learner
                      </button>
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
                  <td><div className="text-xs text-text-secondary max-w-[140px] truncate">{r.course_qualification || '—'}</div></td>
                  <td><span className="badge badge-blue">{r.sex || '—'}</span></td>
                  {isAdmin && <td className="text-xs text-text-secondary">{r.civil_status || '—'}</td>}
                  <td className="text-xs text-text-secondary">{r.contact_no || '—'}</td>
                  {isAdmin && <td className="text-xs text-text-muted">{r.encoder_name || '—'}</td>}
                  <td className="text-xs text-text-muted whitespace-nowrap min-w-[120px]"> {/* Added classes */}
                    {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {/* View — always available */}
                      <button title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                        onClick={() => navigate(isAdmin ? `/admin/applicants/${r.id}` : `/encoder/applicants/${r.id}`)}>
                        <Eye size={14} />
                      </button>

                      {isAdmin && tab === 'active' && (
                        confirmArchiveId === r.id ? (
                          <>
                            <button className="px-2 h-7 rounded-lg text-xs font-medium btn-ghost" onClick={() => setConfirmArchiveId(null)}>Cancel</button>
                            <button className="px-2 h-7 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors" onClick={() => handleArchive(r.id)}>Confirm</button>
                          </>
                        ) : (
                          <button title="Archive"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                            onClick={() => setConfirmArchiveId(r.id)}>
                            <Archive size={14} />
                          </button>
                        )
                      )}

                      {isAdmin && tab === 'archived' && (
                        <button title="Restore"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-green-500 transition-colors"
                          onClick={() => setRestoreTarget({ id: r.id, name: `${r.last_name}, ${r.first_name}` })}>
                          <RefreshCcw size={14} />
                        </button>
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
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <RegistrationModal onClose={() => setModalOpen(false)}
            onSuccess={() => { setModalOpen(false); queryClient.invalidateQueries({ queryKey: ['registrations'] }); }} />
        )}
      </AnimatePresence>
    </div>
  );
}