// frontend/src/pages/encoder/Registration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle, User, MapPin, Briefcase, GraduationCap, Tag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CIVIL_STATUS = ['Single', 'Married', 'Separated/Divorced/Annulled', 'Widow/er', 'Common Law/Live-in'];
const EMP_STATUS = ['Wage-Employed', 'Underemployed', 'Self-Employed', 'Unemployed'];
const EMP_TYPE = ['None', 'Regular', 'Casual', 'Job Order', 'Probationary', 'Permanent', 'Contractual', 'Temporary'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EDU = ['No Grade Completed','Elementary Undergraduate','Elementary Graduate','High School Undergraduate','High School Graduate','Junior High (K-12)','Senior High (K-12)','Post-Secondary Non-Tertiary/ Technical Vocational Course Undergraduate','Post-Secondary Non-Tertiary/ Technical Vocational Course Graduate','College Undergraduate','College Graduate','Masteral','Doctorate'];
const REGIONS = ['Region I – Ilocos Region','Region II – Cagayan Valley','Region III – Central Luzon','Region IV-A – CALABARZON','Region IV-B – MIMAROPA','Region V – Bicol Region','Region VI – Western Visayas','Region VII – Central Visayas','Region VIII – Eastern Visayas','Region IX – Zamboanga Peninsula','Region X – Northern Mindanao','Region XI – Davao Region','Region XII – SOCCSKSARGEN','Region XIII – CARAGA','NCR','CAR','BARMM'];
const CLASSIFICATIONS = ['4Ps Beneficiary','Agrarian Reform Beneficiary','Balik Probinsya','Displaced Workers','Drug Dependents Surrenderees/Surrenderers','Family Members of AFP and PPN Killed-in-Action','Family Members of AFP and PPN Wounded-in-Action','Farmers and Fishermen','Indigenous People & Cultural Communities','Inmates and Detainees','Industry Workers','MILF Beneficiary','Out-of-School-Youth','Overseas Filipino Workers (OFW) Dependent','RCEF-RESP','Rebel Returnees/Decommissioned Combatants','Returning/Repatriated Overseas Filipino Workers (OFW)','Student','TESDA Alumni','TVET Trainers','Uniformed Personnel','Victim of Natural Disasters and Calamities','Wounded-in-Action AFP & PPN Personnel','Others'];
const SCHOLARSHIP = ['TWSP', 'PESFA', 'STEP', 'Regular', 'None/Not Applicable'];

const steps = [
  { label: 'Personal Info', icon: User },
  { label: 'Address',       icon: MapPin },
  { label: 'Employment',    icon: Briefcase },
  { label: 'Education',     icon: GraduationCap },
  { label: 'Classification',icon: Tag },
];

const empty = {
  last_name: '', first_name: '', middle_name: '', extension_name: '',
  address_street: '', address_barangay: '', address_district: '', address_city: '', address_province: '', address_region: '',
  email: '', contact_no: '', nationality: 'Filipino',
  sex: '', civil_status: '', birth_month: '', birth_day: '', birth_year: '', birthplace_city: '', birthplace_province: '', birthplace_region: '',
  employment_status: '', employment_type: 'None',
  educational_attainment: '', parent_guardian_name: '', parent_guardian_address: '',
  client_classification: '', disability_type: '', disability_cause: '',
  course_qualification: '', scholarship_type: 'None/Not Applicable',
  privacy_consent: false,
};

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

function Sel({ value, onChange, options, placeholder }: any) {
  return (
    <select className="input-base" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder || '— Select —'}</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function EncoderRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...empty });
  const [loading, setLoading] = useState(false);

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })); }
  function inp(key: string) { return { value: (form as any)[key], onChange: (e: any) => set(key, e.target.value), className: 'input-base' }; }

  async function handleSubmit() {
    if (!form.last_name || !form.first_name) return toast.error('First and Last name are required.');
    if (!form.privacy_consent) return toast.error('Privacy consent is required.');
    setLoading(true);
    try {
      const { data } = await api.post('/registrants', form);
      toast.success(`Registered! ULI: ${data.uli_number}`);
      navigate('/encoder/reports');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to register.');
    } finally { setLoading(false); }
  }

  const slideVariants = { enter: { opacity: 0, x: 30 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -30 } };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">New Learner Registration</h1>
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
                i === step
                  ? 'btn-primary'
                  : i < step
                  ? 'btn-ghost text-accent border-accent'
                  : 'opacity-40 cursor-default btn-ghost'
              )}
            >
              {i < step ? <CheckCircle size={14} /> : <s.icon size={14} />}
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <div className="w-6 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      <div className="card p-6 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* STEP 0: Personal Info */}
          {step === 0 && (
            <motion.div key="s0" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="form-section-title"><User size={16} />Personal Information</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2"><Field label="Last Name" required><input {...inp('last_name')} placeholder="Dela Cruz" /></Field></div>
                <div className="md:col-span-2"><Field label="First Name" required><input {...inp('first_name')} placeholder="Juan" /></Field></div>
                <div className="md:col-span-2"><Field label="Middle Name"><input {...inp('middle_name')} placeholder="Santos" /></Field></div>
                <div><Field label="Extension"><input {...inp('extension_name')} placeholder="Jr., Sr." /></Field></div>
                <div><Field label="Nationality"><input {...inp('nationality')} placeholder="Filipino" /></Field></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <Field label="Sex" required>
                  <div className="flex gap-3 mt-2">
                    {['Male', 'Female'].map(s => (
                      <label key={s} className="checkbox-label">
                        <input type="radio" name="sex" value={s} checked={form.sex === s} onChange={() => set('sex', s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Civil Status">
                  <Sel value={form.civil_status} onChange={(v: string) => set('civil_status', v)} options={CIVIL_STATUS} />
                </Field>
                <Field label="Contact Number"><input {...inp('contact_no')} placeholder="09xxxxxxxxx" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Email Address"><input {...inp('email')} type="email" placeholder="juan@email.com" /></Field>
              </div>
              <div className="form-section-title mt-6"><MapPin size={16} />Birthdate</div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                <Field label="Month"><Sel value={form.birth_month} onChange={(v: string) => set('birth_month', v)} options={MONTHS} /></Field>
                <Field label="Day"><input {...inp('birth_day')} type="number" min={1} max={31} placeholder="15" /></Field>
                <Field label="Year"><input {...inp('birth_year')} type="number" min={1900} max={new Date().getFullYear()} placeholder="1995" /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Field label="Birthplace City/Municipality"><input {...inp('birthplace_city')} placeholder="Noveleta" /></Field>
                <Field label="Province"><input {...inp('birthplace_province')} placeholder="Cavite" /></Field>
                <Field label="Region"><Sel value={form.birthplace_region} onChange={(v: string) => set('birthplace_region', v)} options={REGIONS} /></Field>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Address */}
          {step === 1 && (
            <motion.div key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="form-section-title"><MapPin size={16} />Complete Permanent Mailing Address</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2"><Field label="House/Building No. & Street"><input {...inp('address_street')} placeholder="123 Rizal Street" /></Field></div>
                <Field label="Barangay"><input {...inp('address_barangay')} placeholder="Barangay 1" /></Field>
                <Field label="District"><input {...inp('address_district')} placeholder="1st District" /></Field>
                <Field label="City/Municipality"><input {...inp('address_city')} placeholder="Noveleta" /></Field>
                <Field label="Province"><input {...inp('address_province')} placeholder="Cavite" /></Field>
                <div className="md:col-span-2">
                  <Field label="Region"><Sel value={form.address_region} onChange={(v: string) => set('address_region', v)} options={REGIONS} /></Field>
                </div>
              </div>
              <div className="form-section-title mt-6"><User size={16} />Parent / Guardian</div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name"><input {...inp('parent_guardian_name')} placeholder="Parent/Guardian Name" /></Field>
                <Field label="Address"><input {...inp('parent_guardian_address')} placeholder="Complete Address" /></Field>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Employment */}
          {step === 2 && (
            <motion.div key="s2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="form-section-title"><Briefcase size={16} />Employment Before Training</div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label">Employment Status</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {EMP_STATUS.map(s => (
                      <label key={s} className="checkbox-label">
                        <input type="radio" name="emp_status" value={s} checked={form.employment_status === s} onChange={() => set('employment_status', s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">
                    Employment Type{' '}
                    <span className="text-xs font-normal normal-case text-text-muted">(if Wage-Employed or Underemployed)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {EMP_TYPE.map(t => (
                      <label key={t} className="checkbox-label">
                        <input type="radio" name="emp_type" value={t} checked={form.employment_type === t} onChange={() => set('employment_type', t)} />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Education & Course */}
          {step === 3 && (
            <motion.div key="s3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="form-section-title"><GraduationCap size={16} />Educational Attainment Before Training</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
                {EDU.map(e => (
                  <label key={e} className="checkbox-label">
                    <input type="radio" name="edu" value={e} checked={form.educational_attainment === e} onChange={() => set('educational_attainment', e)} />
                    <span className="text-xs">{e}</span>
                  </label>
                ))}
              </div>
              <div className="form-section-title mt-4"><Tag size={16} />Course / Qualification</div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name of Course/Qualification" required>
                  <input {...inp('course_qualification')} placeholder="e.g. Computer Systems Servicing NC II" />
                </Field>
                <Field label="Scholarship Package">
                  <Sel value={form.scholarship_type} onChange={(v: string) => set('scholarship_type', v)} options={SCHOLARSHIP} />
                </Field>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Classification & Consent */}
          {step === 4 && (
            <motion.div key="s4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="form-section-title"><Tag size={16} />Learner Classification</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mb-6">
                {CLASSIFICATIONS.map(c => (
                  <label key={c} className="checkbox-label">
                    <input type="radio" name="class" value={c} checked={form.client_classification === c} onChange={() => set('client_classification', c)} />
                    <span className="text-xs">{c}</span>
                  </label>
                ))}
              </div>

              <div className="form-section-title mt-4 border-b border-border pb-3 mb-4">
                Privacy Consent and Disclaimer
              </div>
              <div className="p-4 rounded-xl mb-4 text-xs leading-relaxed bg-bg-input text-text-secondary">
                I hereby attest that I have read and understood the Privacy Notice of TESDA through its website (https://www.tesda.gov.ph) and thereby giving my consent in the processing of my personal information indicated in this Learners Profile. The processing includes scholarships, employment, survey, and all other related TESDA programs that may be beneficial to my qualifications.
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.privacy_consent} onChange={e => set('privacy_consent', e.target.checked)} />
                <span className="font-medium text-text-primary">I Agree to the Privacy Consent</span>
              </label>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between border-t border-border mt-8 pt-4">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={15} /> Previous
          </button>
          {step < steps.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : <><CheckCircle size={15} /> Submit Registration</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}