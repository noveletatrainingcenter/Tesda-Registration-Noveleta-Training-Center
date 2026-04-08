// frontend/src/pages/admin/Settings/BackupRestore.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DatabaseBackup, UploadCloud, Clock, Calendar,
  ShieldCheck, Trash2, Download, RefreshCw, AlertTriangle,
  Plus, Minus, Edit3, FolderOpen, ChevronRight, X,
  CheckCircle2, Eye, Merge, FolderClosed,
  FileWarning, UserCheck, BookOpen, FileText, LayoutGrid,
  Ban, GitMerge, Siren,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

type Schedule = 'daily' | 'weekly';
type DiffRow = Record<string, any>;

// Resolution types for modified records
type Resolution = 'import_newer' | 'live_newer' | 'conflict';

type ModifiedEntry = {
  id: string;
  changes: { field: string; from: string | null; to: string | null }[];
  preview: string;
  row?: DiffRow;
  liveRow?: DiffRow;
  resolution: Resolution;
};

type ModifiedBuckets = {
  allowed:    ModifiedEntry[]; // import_newer — safe to update (opt-in)
  skipped:    ModifiedEntry[]; // live_newer   — blocked, live is more recent
  conflicted: ModifiedEntry[]; // same ts or no ts — blocked, needs admin awareness
};

type DiffEntry = {
  label:    string;
  critical: boolean;
  added:    { id?: string; preview: string; row?: DiffRow }[];
  modified: ModifiedBuckets;
  deleted:  { id: string; preview: string; row?: DiffRow }[];
};
type DiffMap = Record<string, DiffEntry>;

// ── Table icon map ────────────────────────────────────────────────────────────
const TABLE_ICONS: Record<string, React.FC<any>> = {
  registration: UserCheck,
  users:        ShieldCheck,
  courses:      BookOpen,
  reports:      FileText,
  sectors:      LayoutGrid,
};

// ── Row info card ─────────────────────────────────────────────────────────────
const SKIP_FIELDS = new Set(['id', 'created_at', 'updated_at', 'password_hash', 'security_answer_hash', 'otp_code']);

function RowCard({ row, color }: { row?: Record<string, any>; color: 'green' | 'red' | 'blue' | 'amber' }) {
  if (!row) return null;
  const entries = Object.entries(row).filter(([k, v]) => !SKIP_FIELDS.has(k) && v != null && v !== '');
  if (!entries.length) return null;

  const borderColor =
    color === 'green' ? 'border-emerald-500/20' :
    color === 'red'   ? 'border-red-500/20' :
    color === 'amber' ? 'border-amber-500/20' :
    'border-blue-500/20';
  const labelColor =
    color === 'green' ? 'text-emerald-400' :
    color === 'red'   ? 'text-red-400' :
    color === 'amber' ? 'text-amber-400' :
    'text-blue-400';

  return (
    <div className={`mt-2 rounded-lg border ${borderColor} overflow-hidden`}>
      <div className="grid grid-cols-2 gap-0 divide-y divide-border/30">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start gap-2 px-3 py-1.5 even:bg-bg-input/20">
            <span className={`text-[10px] font-mono font-semibold uppercase tracking-wide ${labelColor} w-28 flex-shrink-0 pt-0.5`}>
              {key.replace(/_/g, ' ')}
            </span>
            <span className="text-[11px] text-text-secondary break-all">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modified record card — shows field-level changes ──────────────────────────
function ModifiedCard({ r, accent }: { r: ModifiedEntry; accent: 'blue' | 'amber' | 'red' }) {
  const bgMap  = { blue: 'bg-blue-500/15 border-blue-500/40',   amber: 'bg-amber-500/15 border-amber-500/40',   red: 'bg-red-500/15 border-red-500/40'   };
  const hdrMap = { blue: 'border-blue-500/25',                   amber: 'border-amber-500/25',                   red: 'border-red-500/25'                 };
  const txtMap = { blue: 'text-blue-300',                        amber: 'text-amber-300',                        red: 'text-red-300'                      };

  return (
    <div className={`rounded-lg border overflow-hidden ${bgMap[accent]}`}>
      <div className={`px-3 py-2 border-b ${hdrMap[accent]} flex items-center gap-2`}>
        <span className={`text-xs font-semibold ${txtMap[accent]}`}>{r.preview}</span>
        <span className="ml-auto text-[10px] text-text-secondary font-mono opacity-70">ID: {r.id}</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {r.changes.map((ch, j) => (
          <div key={j} className="flex items-center gap-2 text-[11px]">
            <span className="text-text-secondary font-mono w-28 flex-shrink-0 truncate font-medium">{ch.field}</span>
            <span className="text-red-400 line-through truncate max-w-[130px] font-medium">{ch.from ?? '∅'}</span>
            <ChevronRight size={10} className="text-text-secondary flex-shrink-0 opacity-60" />
            <span className="text-emerald-400 truncate max-w-[130px] font-medium">{ch.to ?? '∅'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  DIFF PREVIEW MODAL
// ═════════════════════════════════════════════════════════════════════════════
function DiffModal({
  diff,
  filename,
  onClose,
  onConfirm,
}: {
  diff: DiffMap;
  filename: string;
  onClose: () => void;
  onConfirm: (applyDeletes: boolean, applyUpdates: boolean) => void;
}) {
  const [applyDeletes, setApplyDeletes] = useState(false);
  const [applyUpdates, setApplyUpdates] = useState(false);
  const [activeTable,  setActiveTable]  = useState(() => Object.keys(diff)[0] || '');
  const [confirming,   setConfirming]   = useState(false);

  const totalAdded      = Object.values(diff).reduce((s, t) => s + t.added.length, 0);
  const totalAllowed    = Object.values(diff).reduce((s, t) => s + t.modified.allowed.length, 0);
  const totalSkipped    = Object.values(diff).reduce((s, t) => s + t.modified.skipped.length, 0);
  const totalConflicted = Object.values(diff).reduce((s, t) => s + t.modified.conflicted.length, 0);
  const totalModified   = totalAllowed + totalSkipped + totalConflicted;
  const totalDeleted    = Object.values(diff).reduce((s, t) => s + t.deleted.length, 0);

  const hasCriticalDeletes  = Object.values(diff).some(t => t.critical && t.deleted.length > 0);
  const hasConflicts        = totalConflicted > 0;
  const hasSkipped          = totalSkipped > 0;

  // Merge is allowed if there's anything actionable
  const hasAnyChange = totalAdded + totalModified + totalDeleted > 0;

  // True only when the merge would actually write something to the DB given current toggle states.
  // New records always count. Updates only count if opted-in. Deletes only count if opted-in.
  // Skipped + conflicted NEVER count — they are permanently blocked.
  const willDoSomething = totalAdded > 0
    || (applyUpdates && totalAllowed > 0)
    || (applyDeletes && totalDeleted > 0);

  // Everything visible is blocked — nothing actionable at all
  const everythingBlocked = hasAnyChange && !willDoSomething && totalAllowed === 0 && totalAdded === 0 && totalDeleted === 0;

  const active = diff[activeTable];

  // Per-table sidebar badge
  function tableBadgeCount(info: DiffEntry) {
    return info.added.length
      + info.modified.allowed.length
      + info.modified.skipped.length
      + info.modified.conflicted.length
      + info.deleted.length;
  }
  function tableBadgeCritical(info: DiffEntry) {
    return (info.critical && info.deleted.length > 0) || info.modified.conflicted.length > 0;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{   opacity: 0, scale: 0.96, y: 16 }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-bg-card/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye size={16} className="text-accent" />
              <h2 className="font-bold text-text-primary text-base">Import Preview</h2>
            </div>
            <p className="text-xs text-text-secondary font-mono truncate max-w-xs opacity-80">{filename}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Summary bar — 4 columns */}
        <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
          <div className="flex flex-col items-center py-3 gap-0.5">
            <span className="text-xl font-bold text-emerald-400">{totalAdded}</span>
            <span className="text-[11px] text-text-muted flex items-center gap-1"><Plus size={10} />New</span>
          </div>
          <div className="flex flex-col items-center py-3 gap-0.5">
            <span className={`text-xl font-bold ${totalAllowed > 0 ? 'text-blue-400' : 'text-text-muted'}`}>{totalAllowed}</span>
            <span className="text-[11px] text-text-muted flex items-center gap-1"><Edit3 size={10} />Updates</span>
          </div>
          <div className="flex flex-col items-center py-3 gap-0.5">
            <span className={`text-xl font-bold ${totalConflicted + totalSkipped > 0 ? 'text-amber-400' : 'text-text-muted'}`}>
              {totalConflicted + totalSkipped}
            </span>
            <span className="text-[11px] text-text-muted flex items-center gap-1"><Ban size={10} />Blocked</span>
          </div>
          <div className="flex flex-col items-center py-3 gap-0.5">
            <span className={`text-xl font-bold ${totalDeleted > 0 ? 'text-red-400' : 'text-text-muted'}`}>{totalDeleted}</span>
            <span className="text-[11px] text-text-muted flex items-center gap-1"><Minus size={10} />Deleted</span>
          </div>
        </div>

        {/* No changes */}
        {!hasAnyChange && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <CheckCircle2 size={40} className="text-emerald-400" />
            <p className="text-text-primary font-semibold">Database is already up to date</p>
            <p className="text-xs text-text-secondary">The incoming file contains no new, modified, or deleted records.</p>
          </div>
        )}

        {hasAnyChange && (
          <div className="flex flex-1 min-h-0">
            {/* Table sidebar */}
            <div className="w-44 flex-shrink-0 border-r border-border overflow-y-auto bg-bg-input/30">
              {Object.entries(diff).map(([tbl, info]) => {
                const TIcon  = TABLE_ICONS[tbl] || FolderOpen;
                const count  = tableBadgeCount(info);
                const isCrit = tableBadgeCritical(info);
                return (
                  <button
                    key={tbl}
                    onClick={() => setActiveTable(tbl)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors border-l-2 ${
                      activeTable === tbl
                        ? 'bg-accent/10 border-accent text-text-primary'
                        : 'border-transparent text-text-muted hover:bg-bg-input hover:text-text-secondary'
                    }`}
                  >
                    <TIcon size={13} />
                    <span className="text-xs font-medium truncate flex-1">{info.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] font-bold rounded px-1 ${
                        isCrit ? 'bg-red-500/20 text-red-400' : 'bg-accent/20 text-accent'
                      }`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detail panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {active && (
                <>
                  {/* ── New records ─────────────────────────────────────────── */}
                  {active.added.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                        <Plus size={12} /> {active.added.length} New Record{active.added.length !== 1 ? 's' : ''} — will be inserted
                      </h3>
                      <div className="space-y-1">
                        {active.added.map((r, i) => (
                          <div key={i} className="rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-xs px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Plus size={10} className="text-emerald-400 flex-shrink-0" />
                              <span className="text-emerald-400 font-semibold">{r.preview}</span>
                            </div>
                            <RowCard row={r.row} color="green" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Allowed updates (import_newer) ──────────────────────── */}
                  {active.modified.allowed.length > 0 && (
                    <div>
                      <div className="rounded-xl p-3 mb-3 border bg-blue-500/15 border-blue-500/40">
                        <div className="flex items-center gap-2 mb-1">
                          <GitMerge size={14} className="text-blue-300" />
                          <span className="text-xs font-bold text-blue-300">Import is newer — safe to update</span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          These records were updated in the encoder's file after the last server sync.
                          Enable <strong className="text-blue-300">"Apply safe updates"</strong> below to overwrite them.
                        </p>
                      </div>
                      <h3 className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 mb-2">
                        <Edit3 size={12} /> {active.modified.allowed.length} Updatable Record{active.modified.allowed.length !== 1 ? 's' : ''} — opt-in required
                      </h3>
                      <div className="space-y-2">
                        {active.modified.allowed.map((r, i) => <ModifiedCard key={i} r={r} accent="blue" />)}
                      </div>
                    </div>
                  )}

                  {/* ── Skipped (live_newer) ─────────────────────────────────── */}
                  {active.modified.skipped.length > 0 && (
                    <div>
                      <div className="rounded-xl p-3 mb-3 border bg-amber-500/15 border-amber-500/40">
                        <div className="flex items-center gap-2 mb-1">
                          <Ban size={14} className="text-amber-300" />
                          <span className="text-xs font-bold text-amber-300">Server data is newer — blocked</span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          The server already has a more recent version of these records. The import's copy is stale.
                          These will <strong className="text-amber-300">never be overwritten</strong> regardless of settings.
                        </p>
                      </div>
                      <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                        <Ban size={12} /> {active.modified.skipped.length} Stale Record{active.modified.skipped.length !== 1 ? 's' : ''} — will be skipped
                      </h3>
                      <div className="space-y-2">
                        {active.modified.skipped.map((r, i) => <ModifiedCard key={i} r={r} accent="amber" />)}
                      </div>
                    </div>
                  )}

                  {/* ── Conflicted (same ts / no ts) ─────────────────────────── */}
                  {active.modified.conflicted.length > 0 && (
                    <div>
                      <div className="rounded-xl p-3 mb-3 border bg-red-500/15 border-red-500/40">
                        <div className="flex items-center gap-2 mb-1">
                          <Siren size={14} className="text-red-300" />
                          <span className="text-xs font-bold text-red-300">⚠ Cannot determine winner — conflict</span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          These records differ but have the same or missing timestamp — it's impossible to safely decide
                          which version is correct. They will <strong className="text-red-300">not be touched</strong>.
                          Resolve them manually after the merge.
                        </p>
                      </div>
                      <h3 className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-2">
                        <Siren size={12} /> {active.modified.conflicted.length} Conflict{active.modified.conflicted.length !== 1 ? 's' : ''} — manual resolution needed
                      </h3>
                      <div className="space-y-2">
                        {active.modified.conflicted.map((r, i) => <ModifiedCard key={i} r={r} accent="red" />)}
                      </div>
                    </div>
                  )}

                  {/* ── Deleted ──────────────────────────────────────────────── */}
                  {active.deleted.length > 0 && (
                    <div>
                      <div className={`rounded-xl p-3 mb-3 border ${
                        active.critical
                          ? 'bg-red-500/15 border-red-500/40'
                          : 'bg-amber-500/15 border-amber-500/40'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <FileWarning size={14} className={active.critical ? 'text-red-300' : 'text-amber-300'} />
                          <span className={`text-xs font-bold ${active.critical ? 'text-red-300' : 'text-amber-300'}`}>
                            {active.critical
                              ? '⚠ CRITICAL — Records exist in server but NOT in import file'
                              : 'Records exist in server but NOT in import file'}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {active.critical
                            ? <>These are important records. They will only be removed if you enable <strong className="text-red-300">"Apply Deletions"</strong> below.</>
                            : <>These records exist on the server only. Enable <strong className="text-amber-300">"Apply Deletions"</strong> to remove them.</>}
                        </p>
                      </div>
                      <h3 className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-2">
                        <Minus size={12} /> {active.deleted.length} Record{active.deleted.length !== 1 ? 's' : ''} only on server (NOT in import)
                      </h3>
                      <div className="space-y-1">
                        {active.deleted.map((r, i) => (
                          <div key={i} className="rounded-lg bg-red-500/8 border border-red-500/15 text-xs px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Minus size={10} className="text-red-400 flex-shrink-0" />
                              <span className="text-red-400 font-semibold">{r.preview}</span>
                              <span className="ml-auto text-[10px] text-text-muted font-mono">ID: {r.id}</span>
                            </div>
                            <RowCard row={r.row} color="red" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {active.added.length === 0
                    && active.modified.allowed.length === 0
                    && active.modified.skipped.length === 0
                    && active.modified.conflicted.length === 0
                    && active.deleted.length === 0 && (
                    <div className="flex items-center gap-2 py-6 text-center justify-center text-text-secondary text-xs">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      No changes in {active.label}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-card/80 space-y-3">

          {/* Nothing mergeable — all records are blocked */}
          {everythingBlocked && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-bg-input border border-border">
              <Ban size={15} className="text-text-secondary flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-text-primary text-xs">Nothing to merge</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  All differing records are either <strong className="text-amber-300">stale</strong> (server is newer) or <strong className="text-red-300">conflicted</strong> (no timestamp winner).
                  There is no data that can be safely merged from this file.
                  Review the records above or ask the encoder to re-export after resolving conflicts.
                </p>
              </div>
            </div>
          )}

          {/* Conflict/skip advisory — only when there IS still something else actionable */}
          {!everythingBlocked && (hasConflicts || hasSkipped) && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40">
              <AlertTriangle size={15} className="text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-text-secondary space-y-0.5 leading-relaxed">
                {hasSkipped && (
                  <p><strong className="text-amber-300">{totalSkipped} stale record{totalSkipped !== 1 ? 's' : ''}</strong> — server data is newer, permanently blocked from overwrite.</p>
                )}
                {hasConflicts && (
                  <p><strong className="text-red-300">{totalConflicted} conflict{totalConflicted !== 1 ? 's' : ''}</strong> — cannot determine winner, requires manual resolution after merge.</p>
                )}
              </div>
            </div>
          )}

          {/* Critical delete warning */}
          {hasCriticalDeletes && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/15 border border-red-500/40">
              <AlertTriangle size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-300 mb-0.5">Critical Data Deletion Warning</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Important records (registrations, users, or reports) exist on the server that are absent from this import.
                  Smart merge <strong className="text-red-300">will NOT delete them</strong> unless you explicitly enable it below.
                </p>
              </div>
            </div>
          )}

          {/* Apply updates toggle — only show when there are allowed updates */}
          {totalAllowed > 0 && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setApplyUpdates(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${applyUpdates ? 'bg-blue-500' : 'bg-bg-input border border-border'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${applyUpdates ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-xs text-text-secondary">
                Apply safe updates —{' '}
                <span className={applyUpdates ? 'text-blue-400 font-semibold' : 'text-text-muted'}>
                  {applyUpdates
                    ? `WILL update ${totalAllowed} record${totalAllowed !== 1 ? 's' : ''} (import is newer)`
                    : 'disabled (safe default)'}
                </span>
              </span>
            </label>
          )}

          {/* Apply deletes toggle */}
          {totalDeleted > 0 && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setApplyDeletes(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${applyDeletes ? 'bg-red-500' : 'bg-bg-input border border-border'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${applyDeletes ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-xs text-text-secondary">
                Apply deletions —{' '}
                <span className={applyDeletes ? 'text-red-400 font-semibold' : 'text-text-muted'}>
                  {applyDeletes
                    ? `WILL delete ${totalDeleted} record${totalDeleted !== 1 ? 's' : ''} from server`
                    : 'disabled (safe default)'}
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">
              Cancel
            </button>
            {!confirming ? (
              <button
                onClick={() => willDoSomething && setConfirming(true)}
                className={`flex-1 justify-center text-sm flex items-center gap-2 py-2 rounded-lg font-medium transition-colors ${
                  willDoSomething
                    ? 'btn-primary'
                    : 'bg-bg-input border border-border text-text-muted cursor-not-allowed opacity-60'
                }`}
                disabled={!willDoSomething}
                title={!willDoSomething ? 'Nothing can be merged from this file' : undefined}
              >
                <Merge size={14} />
                {!hasAnyChange
                  ? 'Already up to date'
                  : everythingBlocked
                  ? 'Cannot merge — all records blocked'
                  : 'Apply Smart Merge'}
              </button>
            ) : (
              <button
                onClick={() => { setConfirming(false); onConfirm(applyDeletes, applyUpdates); }}
                className="flex-1 justify-center text-sm py-2 rounded-lg font-medium flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                <CheckCircle2 size={14} /> Confirm & Merge
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  FOLDER GROUP
// ═════════════════════════════════════════════════════════════════════════════
function FolderGroup({ monthLabel, items, onDownload, onDelete, confirmDeleteFile, setConfirmDeleteFile, deleteMutation }: any) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-2.5 bg-bg-input/50 hover:bg-bg-input transition-colors text-xs font-semibold text-text-muted uppercase tracking-wide"
      >
        {open ? <FolderOpen size={13} className="text-accent" /> : <FolderClosed size={13} className="text-accent" />}
        {monthLabel}
        <span className="ml-1 text-text-muted font-normal normal-case">{items.length} file{items.length !== 1 ? 's' : ''}</span>
        <ChevronRight size={12} className={`ml-auto transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {items.map((b: any) => (
              <div key={b.relative} className="flex items-center gap-3 px-5 py-3 border-b border-border/50 hover:bg-bg-input/30 transition-colors group">
                <span className={`badge text-[10px] w-16 text-center shrink-0 ${
                  b.type === 'auto'     ? 'badge-blue' :
                  b.type === 'imports' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full px-2' :
                  'badge-green'
                }`}>{b.type}</span>
                <span className="font-mono text-xs text-text-secondary truncate flex-1 min-w-0">{b.name}</span>
                <span className="text-xs text-text-muted w-16 text-right shrink-0">{b.size}</span>
                <span className="text-xs text-text-muted w-36 text-right shrink-0 hidden lg:block">
                  {new Date(b.created_at).toLocaleString('en-PH')}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button title="Download" className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors" onClick={() => onDownload(b.relative, b.name)}>
                    <Download size={13} />
                  </button>
                  {confirmDeleteFile === b.relative ? (
                    <>
                      <button className="px-2 h-7 rounded-lg text-xs font-medium btn-ghost" onClick={() => setConfirmDeleteFile(null)}>Cancel</button>
                      <button className="px-2 h-7 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors" onClick={() => { deleteMutation.mutate(b.relative); setConfirmDeleteFile(null); }}>Confirm</button>
                    </>
                  ) : (
                    <button title="Delete" className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors" onClick={() => setConfirmDeleteFile(b.relative)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function BackupRestore() {
  const qc   = useQueryClient();
  const user = useAuthStore(state => state.user);
  const apiBase = user?.role === 'admin' ? '/admin/backups' : '/encoder/backups';

  const [schedule,    setSchedule]    = useState<Schedule>('daily');
  const [retention,   setRetention]   = useState(14);
  const [backupTime,  setBackupTime]  = useState('02:00');
  const [confirmSchedule, setConfirmSchedule] = useState(false);
  const savedScheduleRef = useRef({ schedule: 'daily' as Schedule, retention: 14, backupTime: '02:00' });

  const [isBackingUp,   setIsBackingUp]   = useState(false);
  const [confirmBackup, setConfirmBackup] = useState(false);

  const [importFile,     setImportFile]     = useState<File | null>(null);
  const [isPreviewing,   setIsPreviewing]   = useState(false);
  const [isConfirming,   setIsConfirming]   = useState(false);
  const [diffData,       setDiffData]       = useState<DiffMap | null>(null);
  const [importToken,    setImportToken]    = useState('');
  const [importFilename, setImportFilename] = useState('');

  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);

  const { data: scheduleData } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn:  () => api.get(`${apiBase}/schedule`).then(r => r.data.data),
  });
  useEffect(() => {
    if (!scheduleData) return;
    const s = scheduleData.schedule  || 'daily';
    const r = scheduleData.retention || 14;
    const t = scheduleData.time      || '02:00';
    setSchedule(s); setRetention(r); setBackupTime(t);
    savedScheduleRef.current = { schedule: s, retention: r, backupTime: t };
  }, [scheduleData]);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn:  () => api.get(`${apiBase}`).then(r => r.data.data),
  });

  const grouped = (backups as any[]).reduce((acc: Record<string, Record<string, any[]>>, b) => {
    if (!acc[b.type]) acc[b.type] = {};
    if (!acc[b.type][b.month_folder]) acc[b.type][b.month_folder] = [];
    acc[b.type][b.month_folder].push(b);
    return acc;
  }, {});

  const saveSchedule = useMutation({
    mutationFn: () => api.post(`${apiBase}/schedule`, { schedule, retention, time: backupTime }),
    onSuccess:  () => { toast.success('Schedule saved.'); setConfirmSchedule(false); savedScheduleRef.current = { schedule, retention, backupTime }; },
    onError:    (e: any) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  async function handleManualBackup() {
    if (!confirmBackup) return setConfirmBackup(true);
    setIsBackingUp(true);
    try {
      await api.post(`${apiBase}`, { type: 'manual' });
      toast.success('Backup created successfully.');
      qc.invalidateQueries({ queryKey: ['backups'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Backup failed.');
    } finally {
      setIsBackingUp(false);
      setConfirmBackup(false);
    }
  }

  async function handlePreviewImport() {
    if (!importFile) return;
    setIsPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.post(`${apiBase}/preview-import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDiffData(res.data.diff);
      setImportToken(res.data.token);
      setImportFilename(res.data.filename);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Preview failed.');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleConfirmImport(applyDeletes: boolean, applyUpdates: boolean) {
    setDiffData(null);
    setIsConfirming(true);
    try {
      const res = await api.post(`${apiBase}/confirm-import`, {
        token:         importToken,
        filename:      importFilename,
        apply_deletes: applyDeletes,
        apply_updates: applyUpdates,
      });
      toast.success('Smart merge applied successfully!');
      setImportFile(null);
      qc.invalidateQueries({ queryKey: ['backups'] });
      const r = res.data.results as Record<string, { inserted: number; updated: number; deleted: number; skipped: number }>;
      const summary = Object.entries(r)
        .filter(([, v]) => v.inserted + v.updated + v.deleted + v.skipped > 0)
        .map(([k, v]) => `${k}: +${v.inserted} ~${v.updated} -${v.deleted} ⊘${v.skipped}`)
        .join(' | ');
      if (summary) toast(summary, { icon: '📊', duration: 6000 });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Merge failed.');
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleDownload(relative: string, filename: string) {
    try {
      const encoded  = encodeURIComponent(relative);
      const response = await api.get(`${apiBase}/download/${encoded}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed.');
    }
  }

  const deleteBackup = useMutation({
    mutationFn: (relative: string) => api.delete(`${apiBase}/delete/${encodeURIComponent(relative)}`),
    onSuccess:  () => { toast.success('Backup deleted.'); qc.invalidateQueries({ queryKey: ['backups'] }); },
    onError:    (e: any) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  const typeOrder = ['auto', 'manual', 'imports'] as const;
  const typeLabels: Record<string, string> = { auto: 'Automatic Backups', manual: 'Manual Backups', imports: 'Imported Files' };

  return (
    <>
      <AnimatePresence>
        {diffData && (
          <DiffModal
            diff={diffData}
            filename={importFilename}
            onClose={() => setDiffData(null)}
            onConfirm={handleConfirmImport}
          />
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="section-title">Backup & Restore</h1>
          <p className="text-sm mt-1 text-text-muted">Manage database backups and encoder import merges.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

          {/* Schedule */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-accent" />
              <h2 className="font-semibold text-sm text-text-primary">Backup Schedule</h2>
            </div>
            <label className="label">Frequency</label>
            <div className="flex gap-2 mb-4">
              {(['daily', 'weekly'] as Schedule[]).map(s => (
                <button key={s} onClick={() => setSchedule(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${
                    schedule === s ? 'bg-accent text-white border-accent' : 'bg-bg-input border-border text-text-secondary hover:border-accent/50'
                  }`}>
                  <Calendar size={13} className="inline mr-1.5" />{s}
                </button>
              ))}
            </div>
            <label className="label">Backup Time <span className="ml-2 text-xs text-text-muted">(24-hour, Asia/Manila)</span></label>
            <input type="time" className="input-base mb-4" value={backupTime} onChange={e => setBackupTime(e.target.value)} />
            <label className="label">Retention Period <span className="ml-2 text-xs text-text-muted">(min. 7 days)</span></label>
            <div className="flex items-center gap-3">
              <input type="range" min={7} max={90} value={retention} onChange={e => setRetention(Number(e.target.value))} className="flex-1 accent-accent" />
              <div className="w-16 text-center">
                <span className="font-mono font-bold text-text-primary text-sm">{retention}</span>
                <span className="text-xs text-text-muted ml-1">days</span>
              </div>
            </div>
            {retention === 7 && <div className="flex items-center gap-2 mt-3 text-xs text-amber-500"><AlertTriangle size={12} /> Minimum retention — consider increasing.</div>}
            {retention >= 14 && <div className="flex items-center gap-2 mt-3 text-xs text-accent"><ShieldCheck size={12} /> Recommended retention period.</div>}
            {confirmSchedule && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                <AlertTriangle size={12} className="inline mr-1.5" />
                This will update the automatic backup schedule. Click Save again to confirm.
              </div>
            )}
            {confirmSchedule ? (
              <div className="flex gap-2 mt-4">
                <button className="btn-ghost flex-1 justify-center text-sm" onClick={() => { setConfirmSchedule(false); setSchedule(savedScheduleRef.current.schedule); setRetention(savedScheduleRef.current.retention); setBackupTime(savedScheduleRef.current.backupTime); }} disabled={saveSchedule.isPending}>Cancel</button>
                <button className="btn-primary flex-1 justify-center text-sm" onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending}>{saveSchedule.isPending ? 'Saving...' : 'Confirm Save'}</button>
              </div>
            ) : (
              <button className="btn-primary w-full justify-center mt-4 text-sm" onClick={() => setConfirmSchedule(true)} disabled={saveSchedule.isPending}>Save Schedule</button>
            )}
          </motion.div>

          {/* Manual Backup + Import */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className="card p-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DatabaseBackup size={16} className="text-accent" />
                <h2 className="font-semibold text-sm text-text-primary">Manual Backup</h2>
              </div>
              <p className="text-xs text-text-muted mb-3">Create an immediate backup of the current server database.</p>
              {confirmBackup && (
                <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                  <AlertTriangle size={12} className="inline mr-1.5" />A new backup file will be created. Click Confirm to proceed.
                </div>
              )}
              {confirmBackup ? (
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1 justify-center text-sm" onClick={() => setConfirmBackup(false)} disabled={isBackingUp}>Cancel</button>
                  <button className="btn-primary flex-1 justify-center text-sm" onClick={handleManualBackup} disabled={isBackingUp}>
                    {isBackingUp ? <><RefreshCw size={14} className="animate-spin" /> Creating...</> : <><DatabaseBackup size={14} /> Confirm Backup</>}
                  </button>
                </div>
              ) : (
                <button className="btn-primary w-full justify-center text-sm" onClick={handleManualBackup}>
                  <DatabaseBackup size={14} /> Create Backup Now
                </button>
              )}
            </div>

            <div className="border-t border-border" />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Merge size={16} className="text-accent" />
                <h2 className="font-semibold text-sm text-text-primary">Import from Encoder</h2>
              </div>
              <p className="text-xs text-text-muted mb-3">
                Upload an encoder's <span className="font-mono">.sql</span> export. A diff preview will appear before any data is changed.
              </p>
              <label className="block w-full cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${importFile ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                  {importFile ? (
                    <>
                      <p className="text-xs font-semibold text-accent">{importFile.name}</p>
                      <p className="text-xs text-text-muted mt-1">{(importFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button type="button" className="mt-2 text-xs text-red-400 hover:text-red-500 transition-colors" onClick={e => { e.preventDefault(); setImportFile(null); }}>Remove</button>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={20} className="mx-auto mb-2 text-text-muted" />
                      <p className="text-xs text-text-muted">Click to select an encoder's <span className="font-mono">.sql</span> export</p>
                    </>
                  )}
                </div>
                <input type="file" accept=".sql" className="hidden" onClick={e => { (e.target as HTMLInputElement).value = ''; }} onChange={e => setImportFile(e.target.files?.[0] || null)} />
              </label>

              {!importFile && (
                <div className="mt-3 p-3 rounded-xl bg-bg-input border border-border text-[11px] text-text-muted space-y-1">
                  <p className="font-semibold text-text-secondary text-xs mb-1.5 flex items-center gap-1.5"><Eye size={11} /> How Smart Import Works</p>
                  <p>① Upload the encoder's exported <span className="font-mono">.sql</span> file</p>
                  <p>② Review diff — new records, updates, conflicts, and missing rows</p>
                  <p>③ Stale &amp; conflicted records are <strong>always blocked</strong></p>
                  <p>④ Safe updates and deletions require explicit opt-in</p>
                </div>
              )}

              <button
                className={`w-full justify-center mt-3 text-sm py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${importFile && !isPreviewing ? 'btn-primary' : 'btn-ghost opacity-50 cursor-not-allowed'}`}
                onClick={handlePreviewImport}
                disabled={!importFile || isPreviewing || isConfirming}
              >
                {isPreviewing
                  ? <><RefreshCw size={14} className="animate-spin" /> Analyzing differences...</>
                  : isConfirming
                  ? <><RefreshCw size={14} className="animate-spin" /> Applying merge...</>
                  : <><Eye size={14} /> Preview Import Diff</>}
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
            <span className="text-xs text-text-muted">{(backups as any[]).length} files stored</span>
          </div>
          {isLoading ? (
            <div className="py-10 text-center text-text-muted text-sm">Loading...</div>
          ) : (backups as any[]).length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">No backups yet.</div>
          ) : (
            typeOrder.map(type => {
              const months = grouped[type];
              if (!months || !Object.keys(months).length) return null;
              return (
                <div key={type}>
                  <div className="px-5 py-2 bg-bg-input/20 border-b border-t border-border flex items-center gap-2">
                    {type === 'auto'    && <RefreshCw size={12} className="text-blue-400" />}
                    {type === 'manual'  && <DatabaseBackup size={12} className="text-emerald-400" />}
                    {type === 'imports' && <Merge size={12} className="text-purple-400" />}
                    <span className="text-xs font-bold text-text-secondary">{typeLabels[type]}</span>
                  </div>
                  {Object.entries(months)
                    .sort(([a], [b]) => {
                      const parse = (s: string) => { const [m, y] = s.split('-'); return new Date(`${m} 1, ${y}`).getTime(); };
                      return parse(b) - parse(a);
                    })
                    .map(([month, items]) => (
                      <FolderGroup
                        key={month}
                        monthLabel={month}
                        items={items}
                        onDownload={handleDownload}
                        onDelete={(r: string) => deleteBackup.mutate(r)}
                        confirmDeleteFile={confirmDeleteFile}
                        setConfirmDeleteFile={setConfirmDeleteFile}
                        deleteMutation={deleteBackup}
                      />
                    ))
                  }
                </div>
              );
            })
          )}
        </motion.div>
      </div>
    </>
  );
}