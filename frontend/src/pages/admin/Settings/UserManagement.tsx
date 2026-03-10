// frontend/src/pages/admin/UserManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Key, Plus, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Tab = 'users' | 'tickets';

export default function UserManagement() {
  const [tab, setTab] = useState<Tab>('users');
  const qc = useQueryClient();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">User Management</h1>
        <p className="text-sm mt-1 text-text-muted">Manage encoder and admin accounts, and issue password reset tickets.</p>
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

function UserList({ qc }: { qc: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'encoder',
    full_name: '', security_question: '', security_answer: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User status updated.'); },
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
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-text-muted">{data?.length || 0} users</span>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add User
        </button>
      </div>

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
                <div>
                  <label className="label">Security Question</label>
                  <input className="input-base" value={form.security_question}
                    onChange={e => setForm({ ...form, security_question: e.target.value })} />
                </div>
                <div>
                  <label className="label">Security Answer</label>
                  <input className="input-base" value={form.security_answer}
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

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th><th>Name</th><th>Username</th>
                <th>Role</th><th>Last Login</th><th>Status</th><th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-text-muted">Loading...</td></tr>
              ) : data?.map((u: any) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs text-text-secondary">{u.id}</td>
                  <td className="font-medium text-sm text-text-primary">{u.full_name}</td>
                  <td className="text-sm text-text-secondary">{u.username}</td>
                  <td><span className={clsx('badge', u.role === 'admin' ? 'badge-green' : 'badge-blue')}>{u.role}</span></td>
                  <td className="text-xs text-text-muted">{u.last_login ? new Date(u.last_login).toLocaleString('en-PH') : 'Never'}</td>
                  <td><span className={clsx('badge', u.is_active ? 'badge-green' : 'badge-red')}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button
                      onClick={() => toggle.mutate(u.id)}
                      className={clsx(
                        'transition-colors',
                        u.is_active ? 'text-accent hover:text-accent-hover' : 'text-text-muted hover:text-text-primary'
                      )}
                    >
                      {u.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResetTickets() {
  const [encoderId, setEncoderId] = useState('');
  const [ticket, setTicket]       = useState('');
  const [loading, setLoading]     = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data),
  });
  const encoders = users?.filter((u: any) => u.role === 'encoder' && u.is_active) || [];

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
          Create an 8-character ticket for an encoder. Valid for 24 hours. Send it manually via chat or message.
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