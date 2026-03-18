// frontend/src/pages/admin/Settings/UserManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Key, Plus, ToggleLeft, ToggleRight, Copy,
  ChevronLeft, ChevronRight, Search, Pencil, X, Save, Lock, ShieldQuestion,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type Tab = 'users' | 'tickets';

const SECURITY_QUESTIONS = [
  'What was the name of your first computer or device?',
  'What is the name of the first programming language you learned?',
  'What was the name of your first IT mentor or instructor?',
  'What was the name of the first software company you worked for?',
  'What is the name of the first open-source project you contributed to?',
  'What was the first operating system you ever used?',
  'What was the username of your first online account?',
  'What is the name of the first database system you learned?',
  'What was the first tech certification you ever earned?',
  'What was the name of your first computer science or IT professor?',
  'Others',
];

export default function UserManagement() {
  const [tab, setTab] = useState<Tab>('users');
  const qc = useQueryClient();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">User Management</h1>
        <p className="text-sm mt-1 text-text-muted">
          Manage encoder and admin accounts, and issue password reset tickets.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'users',   icon: Users, label: 'Users' },
          { key: 'tickets', icon: Key,   label: 'Reset Tickets' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === t.key ? 'btn-primary' : 'btn-ghost'
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users'   && <UserList qc={qc} />}
      {tab === 'tickets' && <ResetTickets />}
    </div>
  );
}

// ─── Change Password Dialog ───────────────────────────────────────────────────

function ChangePasswordDialog({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: any;
  onClose: () => void;
  onConfirm: (newPassword: string) => void;
  isPending: boolean;
}) {
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState('');

  function handleConfirm() {
    setError('');
    if (!newPassword)            { setError('Password cannot be empty.'); return; }
    if (newPassword.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    onConfirm(newPassword);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 card p-6 w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 10  }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-base text-text-primary">Change Password</h3>
          <button className="btn-ghost p-1.5" onClick={onClose} disabled={isPending}><X size={15} /></button>
        </div>
        <p className="text-xs text-text-muted mb-5">
          Setting a new password for{' '}
          <span className="font-medium text-text-secondary">{user.full_name}</span>.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">New Password</label>
            <input className="input-base" type="password" placeholder="Enter new password"
              value={newPassword} autoFocus
              onChange={e => { setNewPassword(e.target.value); setError(''); }} />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input className="input-base" type="password" placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn-primary text-sm flex items-center gap-2" onClick={handleConfirm} disabled={isPending}>
            <Lock size={13} /> {isPending ? 'Updating...' : 'Confirm'}
          </button>
          <button className="btn-ghost text-sm" onClick={onClose} disabled={isPending}>Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Security Question Dialog ─────────────────────────────────────────────────

function SecurityQuestionDialog({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: any;
  onClose: () => void;
  onConfirm: (question: string, answer: string) => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState('');
  const [custom,   setCustom]   = useState('');
  const [answer,   setAnswer]   = useState('');
  const [error,    setError]    = useState('');

  const isOthers   = selected === 'Others';
  const finalQuestion = isOthers ? custom.trim() : selected;

  function handleConfirm() {
    setError('');
    if (!selected)                        { setError('Please select a security question.'); return; }
    if (isOthers && !custom.trim())       { setError('Please enter your custom question.'); return; }
    if (!answer.trim())                   { setError('Answer cannot be empty.'); return; }
    onConfirm(finalQuestion, answer.trim());
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 card p-6 w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 10  }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-base text-text-primary">Update Security Question</h3>
          <button className="btn-ghost p-1.5" onClick={onClose} disabled={isPending}><X size={15} /></button>
        </div>
        <p className="text-xs text-text-muted mb-5">
          Updating security question for{' '}
          <span className="font-medium text-text-secondary">{user.full_name}</span>.
          Used for admin password recovery.
        </p>

        <div className="space-y-3">
          {/* Question dropdown */}
          <div>
            <label className="label">Security Question</label>
            <select
              className="input-base"
              value={selected}
              onChange={e => { setSelected(e.target.value); setCustom(''); setError(''); }}
            >
              <option value="">— Choose a question —</option>
              {SECURITY_QUESTIONS.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Custom question input — only shown when "Others" is selected */}
          <AnimatePresence>
            {isOthers && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{   opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <label className="label">Custom Question</label>
                <input
                  className="input-base"
                  type="text"
                  placeholder="Type your custom security question"
                  value={custom}
                  autoFocus
                  onChange={e => { setCustom(e.target.value); setError(''); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer */}
          <div>
            <label className="label">Answer</label>
            <input
              className="input-base"
              type="password"
              placeholder="Enter your answer"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button className="btn-primary text-sm flex items-center gap-2" onClick={handleConfirm} disabled={isPending}>
            <ShieldQuestion size={13} /> {isPending ? 'Saving...' : 'Confirm'}
          </button>
          <button className="btn-ghost text-sm" onClick={onClose} disabled={isPending}>Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

type EditForm = {
  full_name: string;
  username:  string;
  email:     string;
  role:      string;
};

function EditUserModal({
  user,
  onClose,
  qc,
}: {
  user: any;
  onClose: () => void;
  qc: any;
}) {
  const [form, setForm] = useState<EditForm>({
    full_name: user.full_name || '',
    username:  user.username  || '',
    email:     user.email     || '',
    role:      user.role      || 'encoder',
  });

  const [showPasswordDialog, setShowPasswordDialog]   = useState(false);
  const [showSecurityDialog, setShowSecurityDialog]   = useState(false);

  const updateFields = useMutation({
    mutationFn: (d: Partial<EditForm>) => api.patch(`/admin/users/${user.id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully.');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update user.'),
  });

  const updatePassword = useMutation({
    mutationFn: (password: string) => api.patch(`/admin/users/${user.id}`, { password }),
    onSuccess: () => {
      toast.success('Password updated successfully.');
      setShowPasswordDialog(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update password.'),
  });

  const updateSecurity = useMutation({
    mutationFn: ({ question, answer }: { question: string; answer: string }) =>
      api.patch(`/admin/users/${user.id}`, { security_question: question, security_answer: answer }),
    onSuccess: () => {
      toast.success('Security question updated.');
      setShowSecurityDialog(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update security question.'),
  });

  function handleSave() {
    const payload: Partial<EditForm> = {};
    if (form.full_name !== user.full_name)      payload.full_name = form.full_name;
    if (form.username  !== user.username)       payload.username  = form.username;
    if (form.email     !== (user.email || ''))  payload.email     = form.email;
    if (form.role      !== user.role)           payload.role      = form.role;

    if (Object.keys(payload).length === 0) {
      toast('No changes detected.', { icon: 'ℹ️' });
      return;
    }
    updateFields.mutate(payload);
  }

  const field = (key: keyof EditForm, label: string, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="label">{label}</label>
      <input className="input-base" type={type} placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative z-10 card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.95, y: 10  }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg text-text-primary">Edit User</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Employee ID: <span className="font-mono">{user.id}</span> — cannot be changed
              </p>
            </div>
            <button className="btn-ghost p-1.5" onClick={onClose}><X size={16} /></button>
          </div>

          {/* Profile fields */}
          <div className="grid grid-cols-2 gap-4">
            {field('full_name', 'Full Name')}
            {field('username',  'Username')}
            {field('email',     'Email', 'email', 'optional')}
            <div>
              <label className="label">Role</label>
              <select className="input-base" value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="encoder">Encoder</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Password row */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium text-text-primary">Password</p>
              <p className="text-xs text-text-muted mt-0.5">Update this user's login password.</p>
            </div>
            <button className="btn-ghost text-sm flex items-center gap-2"
              onClick={() => setShowPasswordDialog(true)}>
              <Lock size={13} /> Change Password
            </button>
          </div>

          {/* Security question row — only relevant for admins */}
          {form.role === 'admin' && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm font-medium text-text-primary">Security Question</p>
                <p className="text-xs text-text-muted mt-0.5">Used for admin password recovery.</p>
              </div>
              <button className="btn-ghost text-sm flex items-center gap-2"
                onClick={() => setShowSecurityDialog(true)}>
                <ShieldQuestion size={13} /> Update Question
              </button>
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button className="btn-primary text-sm flex items-center gap-2"
              onClick={handleSave} disabled={updateFields.isPending}>
              <Save size={14} />
              {updateFields.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          </div>
        </motion.div>
      </div>

      {/* Change Password sub-dialog */}
      <AnimatePresence>
        {showPasswordDialog && (
          <ChangePasswordDialog
            user={user}
            onClose={() => setShowPasswordDialog(false)}
            onConfirm={pwd => updatePassword.mutate(pwd)}
            isPending={updatePassword.isPending}
          />
        )}
      </AnimatePresence>

      {/* Security Question sub-dialog */}
      <AnimatePresence>
        {showSecurityDialog && (
          <SecurityQuestionDialog
            user={user}
            onClose={() => setShowSecurityDialog(false)}
            onConfirm={(question, answer) => updateSecurity.mutate({ question, answer })}
            isPending={updateSecurity.isPending}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── User List ────────────────────────────────────────────────────────────────

function UserList({ qc }: { qc: any }) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [limit,    setLimit]    = useState(10);
  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'encoder',
    full_name: '', security_question: '', security_answer: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: () =>
      api.get('/admin/users', {
        params: { page, limit, search: search || undefined },
      }).then(r => r.data),
    staleTime: 10000,
  });

  const users: any[] = data?.data  || [];
  const total         = data?.total || 0;
  const pages         = data?.pages || 1;

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated.');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update user status.'),
  });

  const create = useMutation({
    mutationFn: (d: any) => api.post('/admin/users', d),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User created! Employee ID: ${res.data.id}`);
      setShowForm(false);
      setForm({ username: '', email: '', password: '', role: 'encoder', full_name: '', security_question: '', security_answer: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <div>
      <AnimatePresence>
        {editUser && (
          <EditUserModal user={editUser} onClose={() => setEditUser(null)} qc={qc} />
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">{total} user{total !== 1 ? 's' : ''}</span>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm w-56"
              placeholder="Search by name or username…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* New user form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 mb-5">
          <h3 className="font-bold text-base text-text-primary mb-4">New User</h3>
          <div className="grid grid-cols-2 gap-4">
            {([
              ['full_name', 'Full Name',       'text'],
              ['username',  'Username',         'text'],
              ['email',     'Email (optional)', 'email'],
              ['password',  'Password',         'password'],
            ] as [string, string, string][]).map(([k, l, t]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input className="input-base" type={t} value={(form as any)[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="label">Role</label>
              <select className="input-base" value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="encoder">Encoder</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'admin' && (
              <>
                <div className="col-span-2">
                  <label className="label">Security Question</label>
                  <select className="input-base mb-3" value={form.security_question}
                    onChange={e => setForm({ ...form, security_question: e.target.value })}>
                    <option value="">— Choose a question —</option>
                    {SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  {form.security_question === 'Others' && (
                    <input className="input-base" placeholder="Type your custom question"
                      onChange={e => setForm({ ...form, security_question: e.target.value === '' ? 'Others' : e.target.value })} />
                  )}
                </div>
                <div className="col-span-2">
                  <label className="label">Security Answer</label>
                  <input className="input-base" type="password" value={form.security_answer}
                    onChange={e => setForm({ ...form, security_answer: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary text-sm" onClick={() => create.mutate(form)} disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create User'}
            </button>
            <button className="btn-ghost text-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th><th>Name</th><th>Username</th>
                <th>Role</th><th>Last Login</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(limit)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="skeleton" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-muted text-sm">No users found.</td>
                </tr>
              ) : users.map((u: any) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs text-text-secondary">{u.id}</td>
                  <td className="font-medium text-sm text-text-primary">{u.full_name}</td>
                  <td className="text-sm text-text-secondary">{u.username}</td>
                  <td>
                    <span className={clsx('badge', u.role === 'admin' ? 'badge-green' : 'badge-blue')}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-xs text-text-muted">
                    {u.last_login ? new Date(u.last_login).toLocaleString('en-PH') : 'Never'}
                  </td>
                  <td>
                    <span className={clsx('badge', u.is_active ? 'badge-green' : 'badge-red')}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditUser(u)}
                        className="text-text-muted hover:text-text-primary transition-colors" title="Edit user">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => toggle.mutate(u.id)}
                        className={clsx('transition-colors',
                          u.is_active ? 'text-accent hover:text-accent-hover' : 'text-text-muted hover:text-text-primary'
                        )}
                        title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
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
    </div>
  );
}

// ─── Reset Tickets ────────────────────────────────────────────────────────────

function ResetTickets() {
  const [encoderId, setEncoderId] = useState('');
  const [ticket, setTicket]       = useState('');
  const [loading, setLoading]     = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ['users-all-encoders'],
    queryFn: () => api.get('/admin/users', { params: { limit: 100 } }).then(r => r.data),
  });

  const encoders = (usersData?.data || []).filter((u: any) => u.role === 'encoder' && u.is_active);

  async function handleGenerate() {
    if (!encoderId) return toast.error('Select an encoder.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-ticket/generate', { encoder_id: encoderId });
      setTicket(data.ticket);
      toast.success(`Ticket generated for ${data.encoder_name}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed.');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md">
      <div className="card p-6">
        <h3 className="font-bold text-lg text-text-primary mb-1">Generate Reset Ticket</h3>
        <p className="text-sm text-text-muted mb-5">
          Create an 8-character ticket for an encoder. Valid for 24 hours.
          Send it manually via chat or message.
        </p>
        <label className="label">Select Encoder</label>
        <select className="input-base mb-4" value={encoderId}
          onChange={e => { setEncoderId(e.target.value); setTicket(''); }}>
          <option value="">— Choose encoder —</option>
          {encoders.map((u: any) => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
          ))}
        </select>
        <button className="btn-primary w-full justify-center" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating...' : <><Key size={15} /> Generate Ticket</>}
        </button>

        {ticket && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <div className="p-4 rounded-xl bg-bg-input border border-border text-center">
              <div className="text-xs text-text-muted mb-2">Reset Ticket (valid 24h)</div>
              <div className="font-mono text-2xl font-bold tracking-widest text-text-primary mb-4">{ticket}</div>
              <button className="btn-primary text-sm"
                onClick={() => { navigator.clipboard.writeText(ticket); toast.success('Copied!'); }}>
                <Copy size={14} /> Copy Ticket
              </button>
            </div>
            <p className="text-xs mt-3 text-center text-text-muted">
              Send this ticket to the encoder via Messenger, Viber, or SMS.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}