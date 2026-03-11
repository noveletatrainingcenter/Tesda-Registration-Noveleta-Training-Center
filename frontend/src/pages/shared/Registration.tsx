// frontend/src/pages/shared/Registration.tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle, User, MapPin, Briefcase, GraduationCap, Tag, AlertCircle, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AddressSelect, { REGION_OPTIONS, getProvinces, getMunicipalities } from '@/components/AddressSelect';
import type { AddressValue } from '@/components/AddressSelect';

// ─── Constants ────────────────────────────────────────────────────────────────
const CIVIL_STATUS    = ['Single', 'Married', 'Separated/Divorced/Annulled', 'Widow/er', 'Common Law/Live-in'];
const EMP_STATUS      = ['Wage-Employed', 'Underemployed', 'Self-Employed', 'Unemployed'];
const EMP_TYPE        = ['None', 'Regular', 'Casual', 'Job Order', 'Probationary', 'Permanent', 'Contractual', 'Temporary'];
const MONTHS          = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EDU             = ['No Grade Completed','Elementary Undergraduate','Elementary Graduate','High School Undergraduate','High School Graduate','Junior High (K-12)','Senior High (K-12)','Post-Secondary Non-Tertiary/ Technical Vocational Course Undergraduate','Post-Secondary Non-Tertiary/ Technical Vocational Course Graduate','College Undergraduate','College Graduate','Masteral','Doctorate'];
const CLASSIFICATIONS = ['4Ps Beneficiary','Agrarian Reform Beneficiary','Balik Probinsya','Displaced Workers','Drug Dependents Surrenderees/Surrenderers','Family Members of AFP and PPN Killed-in-Action','Family Members of AFP and PPN Wounded-in-Action','Farmers and Fishermen','Indigenous People & Cultural Communities','Inmates and Detainees','Industry Workers','MILF Beneficiary','Out-of-School-Youth','Overseas Filipino Workers (OFW) Dependent','RCEF-RESP','Rebel Returnees/Decommissioned Combatants','Returning/Repatriated Overseas Filipino Workers (OFW)','Student','TESDA Alumni','TVET Trainers','Uniformed Personnel','Victim of Natural Disasters and Calamities','Wounded-in-Action AFP & PPN Personnel','Others'];
const DISABILITY_TYPE = ['Mental/Intellectual','Hearing Disability','Psychosocial Disability','Visual Disability','Speech Impairment','Disability Due to Chronic Illness','Orthopedic (Musculoskeletal) Disability','Multiple Disabilities','Learning Disability'];
const DISABILITY_CAUSE= ['Congenital/Inborn', 'Illness', 'Injury'];
const SCHOLARSHIP_OPTIONS = ['TWSP', 'PESFA', 'STEP', 'Regular', 'None/Not Applicable', 'Others'];

const steps = [
  { label: 'Profile & Address', icon: User },
  { label: 'Personal Info',     icon: MapPin },
  { label: 'Education',         icon: GraduationCap },
  { label: 'Classification',    icon: Tag },
  { label: 'Course & Consent',  icon: Briefcase },
];

const empty = {
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
    <select
      className="input-base disabled:opacity-50 disabled:cursor-not-allowed"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder ?? '— Select —'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="form-section-title">
      <Icon size={16} />{children}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  isEdit,
  loading,
  onConfirm,
  onCancel,
}: {
  isEdit: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
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
          <button
            onClick={onCancel}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-input"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6 pl-11">
          {isEdit
            ? 'Are you sure you want to update this registration? Please review all fields before confirming.'
            : 'Please confirm that all information entered is correct. A ULI number will be generated upon submission.'}
        </p>

        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onConfirm} disabled={loading}>
            {loading
              ? 'Saving...'
              : <><CheckCircle size={14} /> {isEdit ? 'Save Changes' : 'Submit'}</>
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Registration() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...empty });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Fetch existing data when editing ─────────────────────────────────────
  const { data: existing } = useQuery({
    queryKey: ['registration', id],
    queryFn: () => api.get(`/registrations/${id}`).then(r => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        ...empty,
        ...existing,
        has_disability:  !!existing.has_disability,
        privacy_consent: !!existing.privacy_consent,
        birth_day:       existing.birth_day?.toString()  ?? '',
        birth_year:      existing.birth_year?.toString() ?? '',
        scholarship_other: '',
      });
    }
  }, [existing]);

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })); }
  function inp(key: string) { return { value: (form as any)[key], onChange: (e: any) => set(key, e.target.value), className: 'input-base' }; }

  const birthProvinces      = useMemo(() => getProvinces(form.birthplace_region), [form.birthplace_region]);
  const birthMunicipalities = useMemo(() => getMunicipalities(form.birthplace_region, form.birthplace_province), [form.birthplace_region, form.birthplace_province]);
  function setBirthRegion(v: string)   { setForm(f => ({ ...f, birthplace_region: v, birthplace_province: '', birthplace_city: '' })); }
  function setBirthProvince(v: string) { setForm(f => ({ ...f, birthplace_province: v, birthplace_city: '' })); }

  const addressValue: AddressValue = {
    address_subdivision: form.address_subdivision,
    address_street:      form.address_street,
    address_barangay:    form.address_barangay,
    address_city:        form.address_city,
    address_province:    form.address_province,
    address_region:      form.address_region,
  };

  // ── Validate then open confirm dialog ─────────────────────────────────────
  function handleSubmitClick() {
    if (!form.last_name || !form.first_name) return toast.error('First and Last name are required.');
    if (!form.privacy_consent) return toast.error('Privacy consent is required.');
    setShowConfirm(true);
  }

  // ── Actual submit after confirmation ──────────────────────────────────────
  async function doSubmit() {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/registrations/${id}`, form);
        await queryClient.invalidateQueries({ queryKey: ['registration', id] });
        await queryClient.invalidateQueries({ queryKey: ['registrations'] });
        toast.success('Registration updated successfully.');
      } else {
        const { data } = await api.post('/registrations', form);
        await queryClient.invalidateQueries({ queryKey: ['registrations'] });
        toast.success(`Registered! ULI: ${data.uli_number}`);
      }
      setShowConfirm(false);
      navigate(-1);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save.');
      setShowConfirm(false);
    } finally { setLoading(false); }
  }

  const slide = { enter: { opacity: 0, x: 30 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -30 } };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">
          {isEdit ? 'Edit Registration' : 'New Learner Registration'}
        </h1>
        <p className="text-sm mt-1 text-text-muted">TESDA MIS Form 03-01 — Learners Profile Form</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                i === step ? 'btn-primary' : i < step ? 'btn-ghost text-accent border-accent' : 'opacity-40 cursor-default btn-ghost'
              )}
            >
              {i < step ? <CheckCircle size={14} /> : <s.icon size={14} />}
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="card p-6 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── STEP 0 ── */}
          {step === 0 && (
            <motion.div key="s0" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <SectionTitle icon={User}>Learner / Manpower Profile</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2">
                  <Field label="Last Name" required><input {...inp('last_name')} placeholder="Dela Cruz" /></Field>
                </div>
                <div>
                  <Field label="Extension Name"><input {...inp('extension_name')} placeholder="Jr., Sr." /></Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="First Name" required><input {...inp('first_name')} placeholder="Juan" /></Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Middle Name"><input {...inp('middle_name')} placeholder="Santos" /></Field>
                </div>
              </div>

              <SectionTitle icon={MapPin}>Complete Permanent Mailing Address</SectionTitle>
              <AddressSelect
                value={addressValue}
                onChange={updated => setForm(f => ({ ...f, ...updated }))}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="md:col-span-2">
                  <Field label="Email Address / Facebook Account">
                    <input {...inp('email')} type="email" placeholder="juan@email.com or facebook.com/juan" />
                  </Field>
                </div>
                <Field label="Contact No.">
                  <input {...inp('contact_no')} placeholder="09xxxxxxxxx" />
                </Field>
              </div>
              <div className="mt-4 max-w-xs">
                <Field label="Nationality"><input {...inp('nationality')} /></Field>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <motion.div key="s1" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <SectionTitle icon={User}>Personal Information</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="label">Sex</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {['Male', 'Female'].map(s => (
                      <label key={s} className="checkbox-label">
                        <input type="radio" name="sex" value={s} checked={form.sex === s} onChange={() => set('sex', s)} />
                        {s}
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
                <div className="md:col-span-1">
                  <label className="label">Employment Status</label>
                  <div className="flex flex-col gap-2 mt-1 mb-4">
                    {EMP_STATUS.map(s => (
                      <label key={s} className="checkbox-label">
                        <input type="radio" name="emp_status" value={s} checked={form.employment_status === s} onChange={() => set('employment_status', s)} />
                        <span className="text-xs">{s}</span>
                      </label>
                    ))}
                  </div>
                  <label className="label">
                    Employment Type
                    <span className="text-xs font-normal text-text-muted ml-1">(if Wage-Employed or Underemployed)</span>
                  </label>
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
                <Field label="Month">
                  <Sel value={form.birth_month} onChange={v => set('birth_month', v)} options={MONTHS} />
                </Field>
                <Field label="Day">
                  <input {...inp('birth_day')} type="number" min={1} max={31} placeholder="15" />
                </Field>
                <Field label="Year">
                  <input {...inp('birth_year')} type="number" min={1900} max={new Date().getFullYear()} placeholder="1995" />
                </Field>
                <Field label="Age">
                  <input
                    className="input-base bg-bg-input opacity-60"
                    readOnly
                    value={
                      form.birth_year && form.birth_month && form.birth_day
                        ? Math.floor((Date.now() - new Date(`${form.birth_month} ${form.birth_day}, ${form.birth_year}`).getTime()) / 31557600000)
                        : ''
                    }
                    placeholder="Auto"
                  />
                </Field>
              </div>

              <SectionTitle icon={MapPin}>Birthplace</SectionTitle>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Region">
                  <Sel value={form.birthplace_region} onChange={setBirthRegion} options={REGION_OPTIONS} placeholder="— Select Region —" />
                </Field>
                <Field label="Province">
                  <Sel value={form.birthplace_province} onChange={setBirthProvince} options={birthProvinces} placeholder="— Select Province —" disabled={!form.birthplace_region} />
                </Field>
                <Field label="City / Municipality">
                  <Sel value={form.birthplace_city} onChange={v => set('birthplace_city', v)} options={birthMunicipalities} placeholder="— Select City —" disabled={!form.birthplace_province} />
                </Field>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div key="s2" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
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
                <Field label="Name">
                  <input {...inp('parent_guardian_name')} placeholder="Parent/Guardian Full Name" />
                </Field>
                <Field label="Complete Permanent Mailing Address">
                  <input {...inp('parent_guardian_address')} placeholder="Complete Address" />
                </Field>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <motion.div key="s3" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <SectionTitle icon={Tag}>Learner / Trainee / Student (Clients) Classification</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mb-8">
                {CLASSIFICATIONS.map(c => (
                  <label key={c} className="checkbox-label">
                    <input type="radio" name="class" value={c} checked={form.client_classification === c} onChange={() => set('client_classification', c)} />
                    <span className="text-xs">{c}</span>
                  </label>
                ))}
              </div>
              <div className="border border-border rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <SectionTitle icon={AlertCircle}>Type of Disability</SectionTitle>
                  <span className="text-xs text-text-muted italic ml-auto">For Persons with Disability Only</span>
                </div>
                <label className="checkbox-label mb-4">
                  <input
                    type="checkbox"
                    checked={form.has_disability}
                    onChange={e => {
                      set('has_disability', e.target.checked);
                      if (!e.target.checked) { set('disability_type', ''); set('disability_cause', ''); }
                    }}
                  />
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

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <motion.div key="s4" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <SectionTitle icon={Briefcase}>Name of Course / Qualification</SectionTitle>
              <div className="mb-6">
                <input {...inp('course_qualification')} placeholder="e.g. Computer Systems Servicing NC II" />
              </div>
              <SectionTitle icon={Tag}>If Scholar, What Type of Scholarship Package (TWSP, PESFA, STEP, others)?</SectionTitle>
              <div className="flex flex-wrap gap-2 mb-3">
                {SCHOLARSHIP_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { set('scholarship_type', s); if (s !== 'Others') set('scholarship_other', ''); }}
                    className={clsx(
                      'px-4 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      form.scholarship_type === s
                        ? 'bg-accent text-white border-accent'
                        : 'bg-transparent text-text-secondary border-border hover:border-accent hover:text-accent'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {form.scholarship_type === 'Others' && (
                <input
                  className="input-base max-w-sm mb-3"
                  value={form.scholarship_other}
                  onChange={e => set('scholarship_other', e.target.value)}
                  placeholder="Please specify scholarship"
                  autoFocus
                />
              )}
              <div className="mb-6" />
              <div className="form-section-title border-b border-border pb-3 mb-4">
                <AlertCircle size={16} />Privacy Consent and Disclaimer
              </div>
              <div className="p-4 rounded-xl mb-4 text-xs leading-relaxed bg-bg-input text-text-secondary">
                I hereby attest that I have read and understood the Privacy Notice of TESDA through its website (
                <a href="https://www.tesda.gov.ph" target="_blank" rel="noreferrer" className="text-accent underline hover:opacity-80">
                  https://www.tesda.gov.ph
                </a>) and thereby giving my consent in the processing of my personal information indicated in this Learners Profile. The processing includes scholarships, employment, survey, and all other related TESDA programs that may be beneficial to my qualifications.
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

        </AnimatePresence>

        {/* ── Navigation ── */}
        <div className="flex justify-between border-t border-border mt-8 pt-4">
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost"
              disabled={step === 0}
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              className="btn-ghost text-red-400 hover:text-red-500 hover:border-red-400"
              onClick={() => navigate(-1)}
            >
              <X size={15} /> Cancel
            </button>
          </div>

          {step < steps.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmitClick} disabled={loading}>
              {loading ? 'Saving...' : <><CheckCircle size={15} /> {isEdit ? 'Save Changes' : 'Submit Registration'}</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Confirm Dialog ── */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmDialog
            isEdit={isEdit}
            loading={loading}
            onConfirm={doSubmit}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}