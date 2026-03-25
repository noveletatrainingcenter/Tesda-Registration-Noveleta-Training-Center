// frontend/src/pages/shared/Reports.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, ChevronDown, ChevronUp, Plus, Printer,
  Check, AlertCircle, User, Building2, BookOpen, Briefcase,
  CheckCircle2, ChevronRight, ChevronLeft, Save, Eye, Filter,
  Archive, RefreshCw, AlertTriangle, Pencil, FileSpreadsheet, FileDown,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const INSTITUTION_TYPES = ['Public', 'Private', 'TESDA'];
const INDUSTRY_SECTORS = [
  'Agriculture, Forestry and Fishing','Arts and Crafts','Automotive and Land Transportation',
  'Business and Management','Construction','Electrical and Electronics',
  'Fashion Design and Apparel','Food and Beverage',
  'Health Social and Other Community Development Services','ICT',
  'Infrastructure including Rail','Land Transportation','Metals and Engineering',
  'Tourism (Hotel and Restaurant)','Utilities (Water, Gas and Waste Management)',
  'Wholesale and Retail Trading / Services','Others',
];
const SECTOR_CODES: Record<string, string> = {
  'Agriculture, Forestry and Fishing':'AG','Arts and Crafts':'AC',
  'Automotive and Land Transportation':'AT','Business and Management':'BM',
  'Construction':'CN','Electrical and Electronics':'EE',
  'Fashion Design and Apparel':'FD','Food and Beverage':'FB',
  'Health Social and Other Community Development Services':'HS','ICT':'IC',
  'Infrastructure including Rail':'IR','Land Transportation':'LT',
  'Metals and Engineering':'ME','Tourism (Hotel and Restaurant)':'TR',
  'Utilities (Water, Gas and Waste Management)':'UT',
  'Wholesale and Retail Trading / Services':'WR','Others':'OT',
};
const CLIENT_TYPES = ['Employed','Underemployed','Unemployed','Self-Employed','Student','OFW','Others'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TraineeExtra {
  registration_id: number; student_id_number: string;
  pgs_training_component: string; voucher_number: string; client_type: string;
  date_started: string; date_finished: string; reason_not_finishing: string;
  assessment_results: string; employment_date: string;
  employer_name: string; employer_address: string;
  region: string; province: string; district: string; municipality: string;
  provider_name: string; tbp_id: string; address: string;
  institution_type: string; classification: string;
  full_qualification: string; qualification_clustered: string;
  qualification_ntr: string; copr_number: string;
  industry_sector: string; industry_sector_other: string; delivery_mode: string;
}

function emptyExtra(id: number): TraineeExtra {
  return {
    registration_id: id, student_id_number: '',
    pgs_training_component: '', voucher_number: '', client_type: '',
    date_started: '', date_finished: '', reason_not_finishing: '',
    assessment_results: '', employment_date: '', employer_name: '', employer_address: '',
    region: 'REGION 4A', province: 'CAVITE', district: 'District I',
    municipality: 'Noveleta', provider_name: 'Noveleta Training Center',
    tbp_id: '', address: 'Poblacion, Noveleta Cavite',
    institution_type: 'Public', classification: 'LGU',
    full_qualification: '', qualification_clustered: '',
    qualification_ntr: '', copr_number: '',
    industry_sector: '', industry_sector_other: '', delivery_mode: '',
  };
}

interface ProviderInfo {
  title: string; program_title: string;
  prepared_by_left: string; prepared_by_right: string; nclc_admin: string;
}
interface ProgramInfo {
  qualification_ntr: string; copr_number: string;
  industry_sector: string; industry_sector_other: string;
}

// ─── Excel export helper ──────────────────────────────────────────────────────
function buildExcelRows(
  applicants: any[],
  extras: Record<number, TraineeExtra>,
  sectorCode: string,
  selectedCourse: any,
): { rows: (string|null)[][], merges: any[], colors: string[] } {
  function dob(r: any) {
    if (!r.birth_month || !r.birth_day || !r.birth_year) return '';
    return `${String(new Date(`${r.birth_month} 1`).getMonth()+1).padStart(2,'0')}-${String(r.birth_day).padStart(2,'0')}-${String(r.birth_year).slice(-2)}`;
  }
  function suggestId(idx: number) { return `NTC-${sectorCode || 'S'}-${String(idx+1).padStart(4,'0')}`; }
  function fmtDate(v: string) {
    if (!v) return '';
    const dateOnly = v.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return v;
    const [y, m, d] = parts;
    return `${m}-${d}-${y.slice(2)}`;
  }

  const TOTAL_COLS = 42;

  // Row 1: group headers (merged)
  const groupRow: (string|null)[] = Array(TOTAL_COLS).fill(null);
  groupRow[0]  = 'TVET Providers Profile';   // cols 0-8  (9 cols)
  groupRow[9]  = 'Program Profile';           // cols 9-15 (7 cols)
  groupRow[16] = 'Students Profile';          // cols 16-38 (23 cols)
  groupRow[39] = 'Employment';                // cols 39-41 (3 cols)

  // Row 2: column headers
  const headerRow = [
    'Region','Province','District','Municipality/City','Name of Provider','TBP ID Number','Address',
    'Type of Institution','Classification of Provider','Full Qualification (WTR)','Qualification (Clustered)',
    'Qualification (NTR)','CoPR Number','Delivery Mode','Industry Sector of Qualification','Others, Please Specify',
    'Student ID Number','Family/Last Name','First Name','Middle Name','Contact Number','Email',
    'Street No. and Street Address','Barangay','Municipality/City','District','Province','Sex',
    'Date of Birth (mm-dd-yy)','Age','Civil Status','Highest Educational Attainment',
    'PGS Training Component','Voucher Number','Client Type',
    'Date Started (mm-dd-yy)','Date Finished (mm-dd-yy)','Reason for not Finishing','Assessment Results',
    'Employment Date (mm-dd-yy)','Name of Employer','Address of Employer',
  ];

  // Row 3: column letters
  const letterRow = [
    '(a)','(b)','(c)','(d)','(e)','(f)','(g)','(h)','(i)','(j)','(k)','(l)','(m)','(n)','(o)','(p)',
    '(q)','(r)','(s)','(t)','(u)','(v)','(w)','(x)','(y)','(z)','(aa)','(ac)','(ad)','(ae)','(af)','(ag)',
    '(ai)','(aj)','(ak)','(al)','(am)','(an)','(ao)','(ap)','(aq)','(ar)',
  ];

  const dataRows: string[][] = applicants.map((r, idx) => {
    const ex = extras[r.id] ?? emptyExtra(r.id);
    const sid = ex.student_id_number || suggestId(idx);
    return [
      ex.region, ex.province, ex.district, ex.municipality, ex.provider_name, ex.tbp_id, ex.address,
      ex.institution_type, ex.classification, ex.full_qualification, ex.qualification_clustered,
      ex.qualification_ntr, ex.copr_number,
      ex.delivery_mode || selectedCourse?.name || '',
      ex.industry_sector !== 'Others' ? ex.industry_sector : '',
      ex.industry_sector === 'Others' ? ex.industry_sector_other : '',
      sid, r.last_name||'', r.first_name||'', r.middle_name||'', r.contact_no||'', r.email||'',
      [r.address_street,r.address_subdivision].filter(Boolean).join(', '),
      r.address_barangay||'', r.address_city||'', '', r.address_province||'', r.sex||'',
      dob(r), String(r.age||''), r.civil_status||'', r.educational_attainment||'',
      ex.pgs_training_component||'', ex.voucher_number||'', ex.client_type||'',
      fmtDate(ex.date_started), fmtDate(ex.date_finished), ex.reason_not_finishing||'', ex.assessment_results||'',
      fmtDate(ex.employment_date), ex.employer_name||'', ex.employer_address||'',
    ];
  });

  // Merge ranges for group header row (row index 0)
  const merges = [
    { s: { r: 0, c: 0  }, e: { r: 0, c: 8  } }, // TVET Providers Profile
    { s: { r: 0, c: 9  }, e: { r: 0, c: 15 } }, // Program Profile
    { s: { r: 0, c: 16 }, e: { r: 0, c: 38 } }, // Students Profile
    { s: { r: 0, c: 39 }, e: { r: 0, c: 41 } }, // Employment
  ];

  // Colors per column for group header row: pink, yellow, green, blue
  // We'll pass group color assignments separately
  const groupColors = ['FFB3C6','FFD966','90EE90','C9DAF8'];

  return { rows: [groupRow, headerRow, letterRow, ...dataRows], merges, colors: groupColors };
}

// REPLACE the entire downloadAsExcel function WITH THIS:
function downloadAsExcel(
  applicants: any[],
  extras: Record<number, TraineeExtra>,
  sectorCode: string,
  selectedCourse: any,
  filename: string,
) {
  const { rows, merges } = buildExcelRows(applicants, extras, sectorCode, selectedCourse);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;

  const groupDefs = [
    { start: 0,  end: 8,  color: 'FFB3C6' },
    { start: 9,  end: 15, color: 'FFD966' },
    { start: 16, end: 38, color: '90EE90' },
    { start: 39, end: 41, color: 'C9DAF8' },
  ];

  groupDefs.forEach(({ start, end, color }) => {
    for (let c = start; c <= end; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
      ws[cellAddr].s = {
        fill: { fgColor: { rgb: color }, patternType: 'solid' },
        font: { bold: true, sz: 11, name: 'Calibri' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
        border: { top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'} },
      };
    }
  });

  for (let c = 0; c < 42; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 1, c });
    if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
    ws[cellAddr].s = {
      fill: { fgColor: { rgb: '555555' }, patternType: 'solid' },
      font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: { top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'} },
    };
  }

  for (let c = 0; c < 42; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 2, c });
    if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
    ws[cellAddr].s = {
      fill: { fgColor: { rgb: 'FFE066' }, patternType: 'solid' },
      font: { bold: true, sz: 11, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: { top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'} },
    };
  }

  for (let r = 3; r < rows.length; r++) {
    for (let c = 0; c < 42; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellAddr]) ws[cellAddr] = { v: '', t: 's' };
      const isDateCol = c === 35 || c === 36;
      ws[cellAddr].s = {
        font: { sz: 11, name: 'Calibri', bold: isDateCol },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
        border: { top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'} },
      };
    }
  }

  ws['!cols'] = rows[1].map((header: any, colIdx: number) => {
    // Start with the header text length
    let maxLen = header ? String(header).length : 10;

    // Check all data rows for longer content
    for (let r = 3; r < rows.length; r++) {
      const cellVal = rows[r][colIdx];
      if (cellVal) {
        maxLen = Math.max(maxLen, String(cellVal).length);
      }
    }

    // Add padding and cap it so columns don't go insane
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
});
  ws['!rows'] = [{ hpt: 30 }, { hpt: 40 }, { hpt: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Print helpers ────────────────────────────────────────────────────────────
const PRINT_STYLES = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:7px;color:#000;background:#fff;}.page{padding:6mm;}table{border-collapse:collapse;}th,td{border:1px solid #000;padding:2px 3px;vertical-align:middle;font-size:6.5px;word-wrap:break-word;overflow-wrap:break-word;background:#fff;color:#000;}th{text-align:center;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:landscape;margin:5mm;}}`;

function openPrintWindow(content: string, title: string, autoPrint: boolean) {
  const win = window.open('', '_blank', 'width=1500,height=900');
  if (!win) { toast.error('Pop-up blocked. Allow pop-ups and try again.'); return; }
  
  win.document.open();
  win.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          ${PRINT_STYLES}
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: landscape;
              margin: 5mm;
            }
            /* Force page breaks for wide tables */
            .print-wrapper {
              display: block;
              width: 100%;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="print-wrapper" style="width: 3300px; max-width: none;">
            ${content}
          </div>
        </div>
      </body>
    </html>`);
  win.document.close();
  
  if (autoPrint) {
    win.onload = () => { 
      win.focus(); 
      // Small delay to ensure CSS is applied
      setTimeout(() => {
        win.print(); 
        win.close(); 
      }, 500);
    };
  }
}

// ─── Action Buttons component ─────────────────────────────────────────────────
function ReportActions({
  printRef,
  title,
  applicants,
  extras,
  sectorCode,
  selectedCourse,
}: {
  printRef: React.RefObject<HTMLDivElement>;
  title: string;
  applicants: any[];
  extras: Record<number, TraineeExtra>;
  sectorCode: string;
  selectedCourse: any;
}) {
  const [excelLoading, setExcelLoading] = useState(false);

function handlePrint() {
  // Add a small toast to remind user
  toast.success('Printing... Make sure scale is set to 100% in print dialog', {
    duration: 3000
  });
  
  // Just call window.print() - the CSS will handle hiding everything else
  window.print();
}

  function handleSavePDF() {
    window.print();
  }

  async function handleSaveExcel() {
    setExcelLoading(true);
    try {
      const filename = (title || 'TESDA_Report').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
      downloadAsExcel(applicants, extras, sectorCode, selectedCourse, filename);
      toast.success('Excel file downloaded!');
    } catch {
      toast.error('Failed to generate Excel. Try again.');
    } finally {
      setExcelLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrint}
        className="btn-ghost text-sm flex items-center gap-2"
        title="Send to printer"
      >
        <Printer size={13}/> Print
      </button>
      {/* <button
        onClick={handleSavePDF}
        className="btn-ghost text-sm flex items-center gap-2"
        title="Open print dialog → Save as PDF"
      >
        <FileDown size={13}/> Save PDF
      </button> */}
      <button
        onClick={handleSaveExcel}
        disabled={excelLoading}
        className="btn-primary text-sm flex items-center gap-2"
        title="Download as Excel (.xlsx)"
      >
        <FileSpreadsheet size={13}/> {excelLoading ? 'Generating…' : 'Save Excel'}
      </button>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm' }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="dlg" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
            <div className="pointer-events-auto w-full max-w-sm card p-6 shadow-2xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-accent/10 text-accent"><AlertTriangle size={18} /></div>
                <div>
                  <h3 className="font-bold text-base text-text-primary leading-snug">{title}</h3>
                  <p className="text-sm text-text-muted mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
                <button className="btn-primary text-sm" onClick={onConfirm}>{confirmLabel}</button>
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
      <label className="label text-xs mb-1 block">{label}{required && <span className="text-accent"> *</span>}</label>
      {children}
    </div>
  );
}
function Inp({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return <input className={clsx('input-base text-sm', className)} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
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

// ─── Shared print table builder ───────────────────────────────────────────────
function ReportTable({ provider, applicants, extras, sectorCode, selectedCourse }: {
  provider: ProviderInfo; applicants: any[]; extras: Record<number, TraineeExtra>;
  sectorCode: string; selectedCourse: any;
}) {
  function dob(r: any) {
    if (!r.birth_month || !r.birth_day || !r.birth_year) return '';
    return `${String(new Date(`${r.birth_month} 1`).getMonth()+1).padStart(2,'0')}-${String(r.birth_day).padStart(2,'0')}-${String(r.birth_year).slice(-2)}`;
  }
  function suggestId(idx: number) { return `NTC-${sectorCode || 'S'}-${String(idx+1).padStart(4,'0')}`; }

  const cellStyle: React.CSSProperties = { border:'1px solid #000', padding:'2px 3px', fontSize:9, verticalAlign:'middle', textAlign:'center', background:'#fff', color:'#000', whiteSpace:'normal', wordBreak:'break-word', minWidth:'40px', maxWidth:'150px' };
  const dateCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 'bold' };
  const colHeaderStyle: React.CSSProperties = { background:'#555', color:'#fff', fontSize:7, padding:'2px 1px', border:'1px solid #000', whiteSpace:'normal' as const, lineHeight:1.2 };
  const colLetterStyle: React.CSSProperties = { background:'#ffe066', color:'#000', fontSize:8, padding:'2px 1px', border:'1px solid #000' };

  return (
    <div style={{ fontFamily:'Arial, sans-serif', fontSize:'9px', padding:'6mm', background:'#fff', color:'#000', minWidth:'3300px', width:'max-content' }}>
      <div style={{ marginBottom:4 }}>
        <div style={{ fontSize:14, fontWeight:'bold', textDecoration:'underline', color:'#000' }}>{provider.title || 'ENROLLMENT/TERMINAL REPORT'}</div>
        <div style={{ fontSize:11, fontWeight:'bold', marginTop:1, color:'#000' }}>Noveleta Training Center</div>
        {(provider.program_title || selectedCourse?.name) && <div style={{ fontSize:11, marginTop:1, color:'#000' }}>{provider.program_title || selectedCourse?.name}</div>}
      </div>
      <table style={{ borderCollapse:'collapse', background:'#fff' }}>
        <thead>
          <tr>
            <td colSpan={9} style={{background:'#f4a7b9',textAlign:'center',fontWeight:'bold',fontSize:9,padding:'3px',border:'1px solid #000',color:'#000'}}>TVET Providers Profile</td>
            <td colSpan={7} style={{background:'#ffd966',textAlign:'center',fontWeight:'bold',fontSize:9,padding:'3px',border:'1px solid #000',color:'#000'}}>Program Profile</td>
            <td colSpan={23} style={{background:'#90ee90',textAlign:'center',fontWeight:'bold',fontSize:9,padding:'3px',border:'1px solid #000',color:'#000'}}>Students Profile</td>
            <td colSpan={3} style={{background:'#c9daf8',textAlign:'center',fontWeight:'bold',fontSize:9,padding:'3px',border:'1px solid #000',color:'#000'}}>Employment</td>
          </tr>
          <tr>
            {['Region','Province','District','Municipality/City','Name of Provider','TBP ID Number','Address','Type of Institution','Classification of Provider',
              'Full Qualification (WTR)','Qualification (Clustered)','Qualification (NTR)','CoPR Number','Delivery Mode','Industry Sector of Qualification','Others, Please Specify',
              'Student ID Number','Family/Last Name','First Name','Middle Name','Contact Number','Email','Street No. and Street Address','Barangay',
              'Municipality/City','District','Province','Sex','Date of Birth (mm-dd-yy)','Age','Civil Status','Highest Educational Attainment',
              'PGS Training Component','Voucher Number','Client Type','Date Started (mm-dd-yy)','Date Finished (mm-dd-yy)','Reason for not Finishing','Assessment Results',
              'Employment Date (mm-dd-yy)','Name of Employer','Address of Employer',
            ].map((h,i) => <th key={i} style={colHeaderStyle}>{h}</th>)}
          </tr>
          <tr>
            {['(a)','(b)','(c)','(d)','(e)','(f)','(g)','(h)','(i)','(j)','(k)','(l)','(m)','(n)','(o)','(p)',
              '(q)','(r)','(s)','(t)','(u)','(v)','(w)','(x)','(y)','(z)','(aa)','(ac)','(ad)','(ae)','(af)','(ag)',
              '(ai)','(aj)','(ak)','(al)','(am)','(an)','(ao)','(ap)','(aq)','(ar)',
            ].map((l,i) => <th key={i} style={colLetterStyle}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {applicants.map((r: any, idx) => {
            const ex = extras[r.id] ?? emptyExtra(r.id);
            const sid = ex.student_id_number || suggestId(idx);
            function fmtDate(v: string) {
              if (!v) return '';
              const dateOnly = v.split('T')[0];
              const parts = dateOnly.split('-');
              if (parts.length !== 3) return v;
              const [y, m, d] = parts;
              return `${m}-${d}-${y.slice(2)}`;
            }
            const cells = [
              ex.region, ex.province, ex.district, ex.municipality, ex.provider_name, ex.tbp_id, ex.address, ex.institution_type, ex.classification,
              ex.full_qualification, ex.qualification_clustered, ex.qualification_ntr, ex.copr_number,
              ex.delivery_mode || selectedCourse?.name || '',
              ex.industry_sector !== 'Others' ? ex.industry_sector : '',
              ex.industry_sector === 'Others' ? ex.industry_sector_other : '',
              sid, r.last_name||'', r.first_name||'', r.middle_name||'', r.contact_no||'', r.email||'',
              [r.address_street,r.address_subdivision].filter(Boolean).join(', '),
              r.address_barangay||'', r.address_city||'', '', r.address_province||'', r.sex||'',
              dob(r), r.age||'', r.civil_status||'', r.educational_attainment||'',
              ex.pgs_training_component||'', ex.voucher_number||'', ex.client_type||'',
              fmtDate(ex.date_started), fmtDate(ex.date_finished), ex.reason_not_finishing||'', ex.assessment_results||'',
              fmtDate(ex.employment_date), ex.employer_name||'', ex.employer_address||'',
            ];
            return <tr key={r.id}>{cells.map((v,i) => <td key={i} style={i === 35 || i === 36 ? dateCellStyle : cellStyle}>{v}</td>)}</tr>;
          })}
          {[...Array(Math.max(0,3-applicants.length))].map((_,i) => (
            <tr key={`blank-${i}`}>{[...Array(42)].map((_,j) => <td key={j} style={cellStyle}>&nbsp;</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop:14, display:'flex', gap:24, width:'600px' }}>
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontSize:'8px', color:'#555', marginBottom:8 }}>Prepared by:</div>
          <div style={{ fontSize:'10px', fontWeight:'bold', color:'#000', marginBottom:2 }}>{provider.prepared_by_left||''}</div>
          <div style={{ fontSize:'8px', color:'#555' }}>Trainer</div>
        </div>
        {provider.prepared_by_right && (
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ fontSize:'8px', color:'#555', marginBottom:8 }}>Prepared by:</div>
            <div style={{ fontSize:'10px', fontWeight:'bold', color:'#000', marginBottom:2 }}>{provider.prepared_by_right}</div>
            <div style={{ fontSize:'8px', color:'#555' }}>Trainer</div>
          </div>
        )}
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontSize:'8px', marginBottom:8, visibility:'hidden' }}>x</div>
          <div style={{ fontSize:'10px', fontWeight:'bold', color:'#000', marginBottom:2 }}>{provider.nclc_admin||''}</div>
          <div style={{ fontSize:'8px', color:'#555' }}>NCLC Administrator</div>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW — read-only print preview ──────────────────────────────────────────
function ReportView({ reportId, onBack, onEdit }: {
  reportId: number; onBack: () => void; onEdit: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null!);
  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => api.get(`/reports/${reportId}`).then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="max-w-6xl mx-auto">
      <button onClick={onBack} className="btn-ghost text-sm mb-6"><ChevronLeft size={14}/> All Reports</button>
      <div className="card p-8 flex items-center justify-center"><div className="text-text-muted text-sm">Loading report…</div></div>
    </div>
  );
  if (!report) return (
    <div className="max-w-6xl mx-auto">
      <button onClick={onBack} className="btn-ghost text-sm mb-6"><ChevronLeft size={14}/> All Reports</button>
      <div className="card p-8 flex items-center justify-center"><div className="text-text-muted text-sm">Report not found.</div></div>
    </div>
  );

  const provider: ProviderInfo = {
    title: report.title||'', program_title: report.program_title||'',
    prepared_by_left: report.prepared_by_left||'', prepared_by_right: report.prepared_by_right||'',
    nclc_admin: report.nclc_admin||'',
  };
  const trainees: any[] = report.trainees || [];
  const sectorCode = SECTOR_CODES[report.industry_sector] || 'S';
  const applicants = trainees.map((t: any) => ({
    id: Number(t.registration_id), last_name: t.last_name||'', first_name: t.first_name||'',
    middle_name: t.middle_name||'', contact_no: t.contact_no||'', email: t.email||'',
    sex: t.sex||'', age: t.age||'', civil_status: t.civil_status||'',
    educational_attainment: t.educational_attainment||'',
    address_street: t.address_street||'', address_subdivision: t.address_subdivision||'',
    address_barangay: t.address_barangay||'', address_city: t.address_city||'',
    address_province: t.address_province||'',
    birth_month: t.birth_month||'', birth_day: t.birth_day||'', birth_year: t.birth_year||'',
  }));
  const extras: Record<number, TraineeExtra> = {};
  for (const t of trainees) {
    extras[Number(t.registration_id)] = {
      registration_id: t.registration_id, student_id_number: t.student_id_number||'',
      pgs_training_component: t.pgs_training_component||'', voucher_number: t.voucher_number||'',
      client_type: t.client_type||'', date_started: t.date_started||'', date_finished: t.date_finished||'',
      reason_not_finishing: t.reason_not_finishing||'', assessment_results: t.assessment_results||'',
      employment_date: t.employment_date||'', employer_name: t.employer_name||'', employer_address: t.employer_address||'',
      region: t.region||'REGION 4A', province: t.province||'CAVITE', district: t.district||'District I',
      municipality: t.municipality||'Noveleta', provider_name: t.provider_name||'Noveleta Training Center',
      tbp_id: t.tbp_id||'', address: t.address||'Poblacion, Noveleta Cavite',
      institution_type: t.institution_type||'Public', classification: t.classification||'LGU',
      full_qualification: t.full_qualification||'', qualification_clustered: t.qualification_clustered||'',
      qualification_ntr: t.qualification_ntr||'', copr_number: t.copr_number||'',
      industry_sector: t.industry_sector||'', industry_sector_other: t.industry_sector_other||'',
      delivery_mode: t.delivery_mode||'',
    };
  }

  console.log('extras sample:', Object.values(extras)[0]);
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        {/* Single flex container for both left and right elements */}
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Back button and title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="btn-ghost text-sm shrink-0">
              <ChevronLeft size={14}/> All Reports
            </button>
          </div>

          {/* Right side: Trainee count, Edit button, and ReportActions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-xs text-text-muted mr-1">
              {trainees.length} trainee{trainees.length !== 1 ? 's' : ''}
            </span>
            <button onClick={onEdit} className="btn-ghost text-sm flex items-center gap-2">
              <Pencil size={13}/> Edit
            </button>
            <ReportActions
              printRef={printRef}
              title={provider.title}
              applicants={applicants}
              extras={extras}
              sectorCode={sectorCode}
              selectedCourse={null}
            />
          </div>
        </div>
        <div className="min-w-0 mt-4">
          <h1 className="section-title truncate">{provider.title || 'Report'}</h1>
          {provider.program_title && (
            <p className="text-sm text-text-muted mt-0.5 truncate">{provider.program_title}</p>
          )}
        </div>
      </div>
      
      {/* Rest of the component remains the same */}
      <div className="card overflow-hidden">
        <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'70vh' }}>
          <div ref={printRef} id="print-area">
            <ReportTable provider={provider} applicants={applicants} extras={extras} sectorCode={sectorCode} selectedCourse={null} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WIZARD STEPS ─────────────────────────────────────────────────────────────
const STEPS = [
  { label:'Select Course', icon:BookOpen },
  { label:'Select Applicants', icon:User },
  { label:'Training Details', icon:Briefcase },
  { label:'Signatories', icon:User },
  { label:'Review & Print', icon:FileText },
];

function StepSelectCourse({ selectedCourse, setSelectedCourse, programInfo, setProgramInfo }: {
  selectedCourse: any; setSelectedCourse: (c: any) => void;
  programInfo: ProgramInfo; setProgramInfo: (p: ProgramInfo) => void;
}) {
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses-active'],
    queryFn: () => api.get('/courses', { params: { status:'active', limit:100 } }).then(r => r.data.data),
    staleTime: 60000,
  });
  const courses: any[] = coursesData || [];
  function handleSectorChange(v: string) {
    setProgramInfo({ ...programInfo, industry_sector:v, industry_sector_other: v !== 'Others' ? '' : programInfo.industry_sector_other });
    if (selectedCourse?.sector && selectedCourse.sector !== v) setSelectedCourse(null);
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
        <div className="form-section-title"><FileText size={15}/> Program Details</div>
        <p className="text-xs text-text-muted -mt-2 mb-4">Select the industry sector to filter courses.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Industry Sector of Qualification" required>
            <Sel value={programInfo.industry_sector} onChange={handleSectorChange} options={INDUSTRY_SECTORS} />
          </Field>
          {programInfo.industry_sector === 'Others' && (
            <Field label="Please Specify">
              <Inp value={programInfo.industry_sector_other} onChange={v => setProgramInfo({ ...programInfo, industry_sector_other:v })} placeholder="Specify sector" />
            </Field>
          )}
        </div>
      </div>
      {programInfo.industry_sector && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
          <div className="form-section-title"><BookOpen size={15}/> Select Course / Training Program</div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-sm border border-dashed border-border rounded-xl">No courses found for this sector.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCourses.map((c: any) => (
                <button key={c.id} onClick={() => setSelectedCourse(c)}
                  className={clsx('text-left p-4 rounded-xl border transition-all',
                    isSelected(c) ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50 bg-bg-input hover:bg-accent/5')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-text-primary leading-snug">{c.name}</div>
                    {isSelected(c) && <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5"/>}
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

function StepSelectApplicants({
  selectedIds,
  setSelectedIds,
  courseName,
}: {
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  courseName: string;
}) {
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [limit, setLimit]                 = useState(10);
  const [hideEnrolled, setHideEnrolled]   = useState(true);

  // Fetch IDs already enrolled in this course
  const { data: enrolledData } = useQuery({
    queryKey: ['enrolled-ids', courseName],
    queryFn: (): Promise<number[]> =>
      api.get('/reports/enrolled-ids', { params: { course_name: courseName } })
        .then(r => r.data.data as number[]),
    enabled: !!courseName,
    staleTime: 30000,
  });
  const enrolledIds = new Set<number>(enrolledData ?? []);

  const { data, isLoading } = useQuery({
    queryKey: ['all-applicants-report', search, page, limit],
    queryFn: () =>
      api.get('/registrations', { params: { page, limit, search, status: 'active' } })
         .then(r => r.data),
    staleTime: 10000,
  });

  const allApplicants: any[] = data?.data || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  // Apply the hide filter on top of paginated results
  const applicants = hideEnrolled
    ? allApplicants.filter(r => !enrolledIds.has(r.id))
    : allApplicants;

  const enrolledOnPageCount = allApplicants.filter(r => enrolledIds.has(r.id)).length;

  function toggle(id: number) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    );
  }

  function togglePage() {
    const pageIds = applicants.map((r: any) => r.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
    else setSelectedIds([...new Set([...selectedIds, ...pageIds])]);
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="form-section-title">
          <User size={15} /> Select Applicants for This Batch
        </div>
        {selectedIds.length > 0 && (
          <span className="badge badge-blue">{selectedIds.length} selected</span>
        )}
      </div>

      {/* Notice banner */}
      {enrolledIds.size > 0 && (
        <div className={clsx(
          'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
          hideEnrolled
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
            : 'bg-bg-input border-border text-text-muted'
        )}>
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            <span className="font-semibold">{enrolledIds.size} applicant{enrolledIds.size !== 1 ? 's are' : ' is'} already enrolled</span>
            {' '}in <span className="font-medium">{courseName}</span>.
            {hideEnrolled
              ? ` ${enrolledOnPageCount > 0 ? `(${enrolledOnPageCount} hidden on this page)` : ''} Toggle to show them anyway.`
              : ' They are shown below with a warning badge.'}
          </div>
          {/* Toggle switch */}
          <button
            type="button"
            onClick={() => setHideEnrolled(h => !h)}
            className="flex items-center gap-2 shrink-0 text-xs font-semibold"
          >
            <span className={clsx('text-xs', hideEnrolled ? 'text-amber-500' : 'text-text-muted')}>
              {hideEnrolled ? 'Hiding enrolled' : 'Showing all'}
            </span>
            <div className={clsx(
              'relative w-9 h-5 rounded-full transition-colors duration-200',
              hideEnrolled ? 'bg-amber-500' : 'bg-bg-input border border-border'
            )}>
              <div className={clsx(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                hideEnrolled ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </div>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          className="input-base pl-9 text-sm"
          placeholder="Search by name, contact…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={applicants.length > 0 && applicants.every((r: any) => selectedIds.includes(r.id))}
                  onChange={togglePage}
                />
              </th>
              <th>Name</th>
              <th>Contact</th>
              <th>Sex</th>
              <th>Civil Status</th>
              {!hideEnrolled && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [...Array(limit)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(hideEnrolled ? 5 : 6)].map((_, j) => (
                      <td key={j}><div className="skeleton" /></td>
                    ))}
                  </tr>
                ))
              : applicants.length === 0
              ? (
                <tr>
                  <td colSpan={hideEnrolled ? 5 : 6} className="text-center py-10 text-text-muted text-sm">
                    {hideEnrolled && enrolledOnPageCount > 0
                      ? 'All applicants on this page are already enrolled. Toggle to show them.'
                      : 'No applicants found.'}
                  </td>
                </tr>
              )
              : applicants.map((r: any) => {
                  const isEnrolled = enrolledIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        selectedIds.includes(r.id) && 'bg-accent/5',
                        isEnrolled && !hideEnrolled && 'opacity-75'
                      )}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                      </td>
                      <td>
                        <div className="font-medium text-sm text-text-primary">
                          {r.last_name}, {r.first_name}
                          {r.middle_name ? ` ${r.middle_name[0]}.` : ''}
                        </div>
                        <div className="text-xs text-text-muted">{r.contact_no || '—'}</div>
                      </td>
                      <td className="text-xs text-text-secondary">{r.contact_no || '—'}</td>
                      <td>
                        <span className="badge badge-blue text-xs">{r.sex || '—'}</span>
                      </td>
                      <td className="text-xs text-text-secondary">{r.civil_status || '—'}</td>
                      {!hideEnrolled && (
                        <td>
                          {isEnrolled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                              <AlertCircle size={9} /> Already enrolled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-500">
                              <CheckCircle2 size={9} /> Eligible
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted whitespace-nowrap">Rows per page:</span>
            <select
              className="text-xs py-1 px-2 rounded-lg border border-border bg-bg-input text-text-primary w-16 cursor-pointer"
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {PAGE_SIZE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {total === 0 ? '0–0 of 0' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
            </span>
            <button className="btn-ghost text-xs py-1 px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn-ghost text-xs py-1 px-2" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTrainingDetails({ applicants, extras, setExtras, sectorCode, selectedCourse, industrySector }: {
  applicants: any[]; extras: Record<number, TraineeExtra>;
  setExtras: (e: Record<number, TraineeExtra>) => void; sectorCode: string;
  selectedCourse: any; industrySector: string;
}) {
  const [openId, setOpenId] = useState<number | null>(applicants[0]?.id ?? null);
  function setEx(id: number, k: keyof TraineeExtra, v: string) {
    setExtras({ ...extras, [id]: { ...(extras[id] ?? emptyExtra(id)), [k]:v } });
  }
  function getEx(id: number): TraineeExtra {
    if (extras[id]) return extras[id];
    return {
      ...emptyExtra(id),
      delivery_mode: selectedCourse?.name ?? '',
      industry_sector: industrySector ?? '',
    };
  }
  function suggestId(idx: number) { return `NTC-${sectorCode||'S'}-${String(idx+1).padStart(4,'0')}`; }

  return (
    <div className="space-y-3">
      <div className="form-section-title"><Briefcase size={15}/> Training Details per Trainee</div>
      <p className="text-xs text-text-muted -mt-2">Each trainee has their own TVET Provider, Program Profile, and training details.</p>
      {applicants.map((r: any, idx) => {
        const ex = getEx(r.id);
        const isOpen = openId === r.id;
        const suggested = suggestId(idx);
        const isComplete = !!(ex.client_type && ex.date_started && ex.date_finished && ex.provider_name && ex.delivery_mode);
        return (
          <div key={r.id} className="card overflow-hidden">
            <button className={clsx('w-full flex items-center justify-between px-4 py-3 text-left transition-colors', isOpen ? 'bg-accent/5 border-b border-border' : 'hover:bg-bg-input')}
              onClick={() => setOpenId(isOpen ? null : r.id)}>
              <div className="flex items-center gap-3">
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', isOpen ? 'bg-accent text-white' : 'bg-bg-input text-text-muted')}>{idx+1}</div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{r.last_name}, {r.first_name}{r.middle_name ? ` ${r.middle_name[0]}.` : ''}</div>
                  <div className="text-xs text-text-muted font-mono">{ex.student_id_number||suggested} · {r.contact_no||'no contact'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isComplete ? <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Done</span>
                  : <span className="text-xs text-amber-500 flex items-center gap-1"><AlertCircle size={12}/> Incomplete</span>}
                {isOpen ? <ChevronUp size={14} className="text-text-muted"/> : <ChevronDown size={14} className="text-text-muted"/>}
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                  exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
                  <div className="p-4 space-y-5">
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Personal Info (from Registration)</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-bg-input">
                        {[
                          ['Full Name', `${r.last_name}, ${r.first_name} ${r.middle_name||''}`],
                          ['Contact', r.contact_no], ['Email', r.email], ['Sex', r.sex],
                          ['Date of Birth', r.birth_month && r.birth_day && r.birth_year
                            ? `${String(new Date(`${r.birth_month} 1`).getMonth()+1).padStart(2,'0')}-${String(r.birth_day).padStart(2,'0')}-${String(r.birth_year).slice(-2)}` : '—'],
                          ['Age', r.age], ['Civil Status', r.civil_status], ['Education', r.educational_attainment],
                          ['Address', [r.address_street,r.address_barangay,r.address_city].filter(Boolean).join(', ')],
                        ].map(([label,val]) => (
                          <div key={label as string}>
                            <div className="text-xs text-text-muted">{label}</div>
                            <div className="text-xs font-medium text-text-primary truncate">{val||'—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Student ID</div>
                      <div className="max-w-xs">
                        <Field label="Student ID Number">
                          <Inp value={ex.student_id_number||suggested} onChange={v => setEx(r.id,'student_id_number',v)} placeholder={suggested}/>
                        </Field>
                        <p className="text-xs text-text-muted mt-1">NTC = Noveleta Training Center · {sectorCode||'XX'} = Sector Code</p>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3"><Building2 size={12} className="inline mr-1"/>TVET Provider Info</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Region"><Inp value={ex.region} onChange={v => setEx(r.id,'region',v)}/></Field>
                        <Field label="Province"><Inp value={ex.province} onChange={v => setEx(r.id,'province',v)}/></Field>
                        <Field label="District"><Inp value={ex.district} onChange={v => setEx(r.id,'district',v)}/></Field>
                        <Field label="Municipality / City"><Inp value={ex.municipality} onChange={v => setEx(r.id,'municipality',v)}/></Field>
                        <Field label="Name of Provider" required><Inp value={ex.provider_name} onChange={v => setEx(r.id,'provider_name',v)}/></Field>
                        <Field label="TBP ID Number"><Inp value={ex.tbp_id} onChange={v => setEx(r.id,'tbp_id',v)} placeholder="(optional)"/></Field>
                        <div className="md:col-span-2"><Field label="Address"><Inp value={ex.address} onChange={v => setEx(r.id,'address',v)}/></Field></div>
                        <Field label="Type of Institution"><Sel value={ex.institution_type} onChange={v => setEx(r.id,'institution_type',v)} options={INSTITUTION_TYPES}/></Field>
                        <Field label="Classification of Provider"><Inp value={ex.classification} onChange={v => setEx(r.id,'classification',v)}/></Field>
                        <Field label="Full Qualification (WTR)"><Inp value={ex.full_qualification} onChange={v => setEx(r.id,'full_qualification',v)} placeholder="(optional)"/></Field>
                        <Field label="Qualification (Clustered)"><Inp value={ex.qualification_clustered} onChange={v => setEx(r.id,'qualification_clustered',v)} placeholder="(optional)"/></Field>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3"><BookOpen size={12} className="inline mr-1"/>Program Profile</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Delivery Mode" required><Inp value={ex.delivery_mode} onChange={v => setEx(r.id,'delivery_mode',v)} placeholder="e.g. Computer Systems Servicing NC II"/></Field>
                        <Field label="Industry Sector"><Sel value={ex.industry_sector} onChange={v => setEx(r.id,'industry_sector',v)} options={INDUSTRY_SECTORS}/></Field>
                        {ex.industry_sector === 'Others' && (
                          <Field label="Please Specify"><Inp value={ex.industry_sector_other} onChange={v => setEx(r.id,'industry_sector_other',v)} placeholder="Specify sector"/></Field>
                        )}
                        <Field label="Qualification (NTR)"><Inp value={ex.qualification_ntr} onChange={v => setEx(r.id,'qualification_ntr',v)} placeholder="(optional)"/></Field>
                        <Field label="CoPR Number"><Inp value={ex.copr_number} onChange={v => setEx(r.id,'copr_number',v)} placeholder="(optional)"/></Field>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Training</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="PGS Training Component"><Inp value={ex.pgs_training_component} onChange={v => setEx(r.id,'pgs_training_component',v)} placeholder="(optional)"/></Field>
                        <Field label="Voucher Number"><Inp value={ex.voucher_number} onChange={v => setEx(r.id,'voucher_number',v)} placeholder="(optional)"/></Field>
                        <Field label="Client Type" required><Sel value={ex.client_type} onChange={v => setEx(r.id,'client_type',v)} options={CLIENT_TYPES}/></Field>
                        <Field label="Date Started" required>
                          <input type="date" className="input-base text-sm"
                            value={(() => {
                              const v = ex.date_started;
                              if (!v) return '';
                              if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
                              if (v.includes('T')) return v.split('T')[0];
                              const [m, d, y] = v.split('-');
                              if (m && d && y) return `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                              return '';
                            })()}
                            onChange={e => { const d = e.target.value; setEx(r.id, 'date_started', d); }}/>
                        </Field>
                        <Field label="Date Finished" required>
                          <input type="date" className="input-base text-sm"
                            value={(() => {
                              const v = ex.date_finished;
                              if (!v) return '';
                              if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
                              if (v.includes('T')) return v.split('T')[0];
                              const [m, d, y] = v.split('-');
                              if (m && d && y) return `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                              return '';
                            })()}
                            onChange={e => { const d = e.target.value; setEx(r.id, 'date_finished', d); }}/>
                        </Field>
                        <Field label="Reason for Not Finishing"><Inp value={ex.reason_not_finishing} onChange={v => setEx(r.id,'reason_not_finishing',v)} placeholder="(optional)"/></Field>
                        <Field label="Assessment Results"><Inp value={ex.assessment_results} onChange={v => setEx(r.id,'assessment_results',v)} placeholder="(optional)"/></Field>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Employment</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Employment Date (mm-dd-yy)"><Inp value={ex.employment_date} onChange={v => setEx(r.id,'employment_date',v)} placeholder="(optional)"/></Field>
                        <Field label="Name of Employer"><Inp value={ex.employer_name} onChange={v => setEx(r.id,'employer_name',v)} placeholder="(optional)"/></Field>
                        <Field label="Address of Employer"><Inp value={ex.employer_address} onChange={v => setEx(r.id,'employer_address',v)} placeholder="(optional)"/></Field>
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

function StepSignatories({ provider, setProvider }: { provider: ProviderInfo; setProvider: (v: ProviderInfo) => void }) {
  function setP(k: keyof ProviderInfo, v: string) { setProvider({ ...provider, [k]:v }); }
  return (
    <div className="space-y-6">
      <div>
        <div className="form-section-title"><FileText size={15}/> Report Info</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Report Title"><Inp value={provider.title} onChange={v => setP('title',v)}/></Field>
          <Field label="Program Title"><Inp value={provider.program_title} onChange={v => setP('program_title',v)} placeholder="e.g. Reflexology Therapy"/></Field>
        </div>
      </div>
      <div>
        <div className="form-section-title"><User size={15}/> Signatories</div>
        <p className="text-xs text-text-muted -mt-2 mb-4">These appear at the bottom of the printed report.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Prepared By (1st Trainer)"><Inp value={provider.prepared_by_left} onChange={v => setP('prepared_by_left',v)} placeholder="Name, Title"/></Field>
          <Field label="Prepared By (2nd Trainer)"><Inp value={provider.prepared_by_right} onChange={v => setP('prepared_by_right',v)} placeholder="Name, Title (optional)"/></Field>
          <Field label="NCLC Administrator" required><Inp value={provider.nclc_admin} onChange={v => setP('nclc_admin',v)} placeholder="Name"/></Field>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT WIZARD ──────────────────────────────────────────────────────────────
function EditWizard({ reportId, onDone }: { reportId: number; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(2);
  const [maxStep, setMaxStep] = useState(4);
  function goToStep(n: number) { setStep(n); setMaxStep(prev => Math.max(prev, n)); }

  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [programInfo, setProgramInfo] = useState<ProgramInfo>({ qualification_ntr:'', copr_number:'', industry_sector:'', industry_sector_other:'' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [extras, setExtras] = useState<Record<number, TraineeExtra>>({});
  const [provider, setProvider] = useState<ProviderInfo>({ title:'', program_title:'', prepared_by_left:'', prepared_by_right:'', nclc_admin:'' });

  const { data: existingReport } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => api.get(`/reports/${reportId}`).then(r => r.data.data),
  });

  useEffect(() => {
    if (!existingReport || loaded) return;
    setLoaded(true);
    setProvider({
      title: existingReport.title||'', program_title: existingReport.program_title||'',
      prepared_by_left: existingReport.prepared_by_left||'', prepared_by_right: existingReport.prepared_by_right||'',
      nclc_admin: existingReport.nclc_admin||'',
    });
    setProgramInfo({
      qualification_ntr: existingReport.qualification_ntr||'', copr_number: existingReport.copr_number||'',
      industry_sector: existingReport.industry_sector||'', industry_sector_other: existingReport.industry_sector_other||'',
    });
    setSelectedCourse({ id: existingReport.course_id ?? null, name: existingReport.delivery_mode, sector: existingReport.industry_sector });
    if (existingReport.trainees?.length) {
      setSelectedIds(existingReport.trainees.map((t: any) => t.registration_id));
      const newExtras: Record<number, TraineeExtra> = {};
      for (const t of existingReport.trainees) {
        newExtras[t.registration_id] = {
          registration_id: t.registration_id, student_id_number: t.student_id_number||'',
          pgs_training_component: t.pgs_training_component||'', voucher_number: t.voucher_number||'',
          client_type: t.client_type||'', date_started: t.date_started||'', date_finished: t.date_finished||'',
          reason_not_finishing: t.reason_not_finishing||'', assessment_results: t.assessment_results||'',
          employment_date: t.employment_date||'', employer_name: t.employer_name||'', employer_address: t.employer_address||'',
          region: t.region||'REGION 4A', province: t.province||'CAVITE', district: t.district||'District I',
          municipality: t.municipality||'Noveleta', provider_name: t.provider_name||'Noveleta Training Center',
          tbp_id: t.tbp_id||'', address: t.address||'Poblacion, Noveleta Cavite',
          institution_type: t.institution_type||'Public', classification: t.classification||'LGU',
          full_qualification: t.full_qualification||'', qualification_clustered: t.qualification_clustered||'',
          qualification_ntr: t.qualification_ntr||'', copr_number: t.copr_number||'',
          industry_sector: t.industry_sector||'', industry_sector_other: t.industry_sector_other||'',
          delivery_mode: t.delivery_mode||'',
        };
      }
      setExtras(newExtras);
    }
  }, [existingReport, loaded]);

  const { data: allRegs } = useQuery({
    queryKey: ['all-regs-for-report'],
    queryFn: () => api.get('/registrations', { params:{ limit:500, status:'active' } }).then(r => r.data.data),
    enabled: selectedIds.length > 0,
    staleTime: 30000,
  });
  const selectedApplicants = useMemo(() => (allRegs||[]).filter((r: any) => selectedIds.includes(r.id)), [allRegs, selectedIds]);
  const sectorCode = useMemo(() => SECTOR_CODES[programInfo.industry_sector] || 'S', [programInfo.industry_sector]);

  function canProceed(): boolean {
    if (step === 0) return !!(selectedCourse && programInfo.industry_sector);
    if (step === 1) return selectedIds.length > 0;
    if (step === 2) return selectedIds.every(id => { const ex = extras[id] ?? emptyExtra(id); return !!(ex.client_type && ex.date_started && ex.date_finished); });
    if (step === 3) return !!(provider.nclc_admin && provider.prepared_by_left);
    return true;
  }

  async function handleSave() {
    if (saving) return;
    const trainees = selectedIds.map((id, idx) => {
      const ex = extras[id] ?? emptyExtra(id);
      return {
        registration_id: id,
        student_id_number: ex.student_id_number || `NTC-${sectorCode}-${String(idx+1).padStart(4,'0')}`,
        pgs_training_component: ex.pgs_training_component, voucher_number: ex.voucher_number,
        client_type: ex.client_type, date_started: ex.date_started||null, date_finished: ex.date_finished||null,
        reason_not_finishing: ex.reason_not_finishing, assessment_results: ex.assessment_results,
        employment_date: ex.employment_date||null, employer_name: ex.employer_name, employer_address: ex.employer_address,
        region: ex.region, province: ex.province, district: ex.district, municipality: ex.municipality,
        provider_name: ex.provider_name, tbp_id: ex.tbp_id, address: ex.address,
        institution_type: ex.institution_type, classification: ex.classification,
        full_qualification: ex.full_qualification, qualification_clustered: ex.qualification_clustered,
        qualification_ntr: ex.qualification_ntr, copr_number: ex.copr_number,
        industry_sector: ex.industry_sector, industry_sector_other: ex.industry_sector_other, delivery_mode: ex.delivery_mode,
      };
    });
    const payload = {
      title: provider.title, program_title: provider.program_title,
      prepared_by_left: provider.prepared_by_left, prepared_by_right: provider.prepared_by_right, nclc_admin: provider.nclc_admin,
      region:'', province:'', district:'', municipality:'', provider_name:'', tbp_id:'', address:'',
      institution_type:'', classification:'', full_qualification:'', qualification_clustered:'',
      delivery_mode: selectedCourse?.name||'',
      qualification_ntr: programInfo.qualification_ntr, copr_number: programInfo.copr_number,
      industry_sector: programInfo.industry_sector, industry_sector_other: programInfo.industry_sector_other,
      trainees,
    };
    setSaving(true);
    try {
      await api.put(`/reports/${reportId}`, payload);
      toast.success('Report updated.');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      await queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      goToStep(4);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  const printRef = useRef<HTMLDivElement>(null!);
  const slide = { enter:{ opacity:0, x:20 }, center:{ opacity:1, x:0 }, exit:{ opacity:0, x:-20 } };

  if (!loaded) return (
    <div className="max-w-6xl mx-auto">
      <button onClick={onDone} className="btn-ghost text-sm mb-6"><ChevronLeft size={14}/> All Reports</button>
      <div className="card p-8 flex items-center justify-center"><div className="text-text-muted text-sm">Loading report data…</div></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Save confirmation modal */}
      <ConfirmModal 
        open={showSaveConfirm} 
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={() => { setShowSaveConfirm(false); handleSave(); }}
        title="Save Changes?" 
        description={`Update this report with ${selectedIds.length} trainee${selectedIds.length!==1?'s':''}?`}
        confirmLabel="Save & Preview"
      />
      
      {/* Leave without saving confirmation modal */}
      <ConfirmModal 
        open={showLeaveConfirm} 
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => { 
          setShowLeaveConfirm(false); 
          onDone(); 
        }}
        title="Discard Changes?" 
        description="You have unsaved changes. Are you sure you want to leave without saving?" 
        confirmLabel="Leave Without Saving"
      />
      
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => {
            // Check if we're on a step where changes could have been made
            // You can make this more sophisticated by tracking actual changes
            if (step > 0 || selectedIds.length > 0) {
              setShowLeaveConfirm(true);
            } else {
              onDone();
            }
          }} 
          className="btn-ghost text-sm"
        >
          <ChevronLeft size={14}/> All Reports
        </button>
        <div className="flex-1">
          <h1 className="section-title">Edit Report</h1>
          <p className="text-sm text-text-muted mt-1">{provider.title}</p>
        </div>
        <span className="text-xs text-text-muted">ID: {reportId}</span>
      </div>
      
      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <button onClick={() => goToStep(i)}
                className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  i === step ? 'btn-primary' : 'btn-ghost text-accent border-accent')}>
                {i < step ? <Check size={12}/> : <s.icon size={12}/>}
                {s.label}
              </button>
              {i < STEPS.length-1 && <ChevronRight size={14} className="text-text-muted shrink-0"/>}
            </div>
          ))}
        </div>
      </div>
      
      <div className="card p-6 mb-5 min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 0 && <motion.div key="s0" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <StepSelectCourse selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} programInfo={programInfo} setProgramInfo={setProgramInfo}/>
          </motion.div>}
          {step === 1 && <motion.div key="s1" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <StepSelectApplicants selectedIds={selectedIds} setSelectedIds={setSelectedIds} courseName={selectedCourse?.name ?? ''}/>
          </motion.div>}
          {step === 2 && <motion.div key="s2" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            {selectedApplicants.length === 0
              ? <div className="flex items-center justify-center h-48 text-text-muted text-sm">Loading applicant data…</div>
              : <StepTrainingDetails applicants={selectedApplicants} extras={extras} setExtras={setExtras} sectorCode={sectorCode} selectedCourse={selectedCourse} industrySector={programInfo.industry_sector}/>}
          </motion.div>}
          {step === 3 && <motion.div key="s3" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <StepSignatories provider={provider} setProvider={setProvider}/>
          </motion.div>}
          {step === 4 && <motion.div key="s4" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="form-section-title"><FileText size={15}/> Review & Print</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved (ID: {reportId})</span>
                  <ReportActions
                    printRef={printRef}
                    title={provider.title}
                    applicants={selectedApplicants}
                    extras={extras}
                    sectorCode={sectorCode}
                    selectedCourse={selectedCourse}
                  />
                </div>
              </div>
              <div style={{ overflowX:'auto', overflowY:'auto', borderRadius:'12px', border:'1px solid var(--border)', maxHeight:'600px' }}>
                <div ref={printRef} id="print-area">
                  <ReportTable provider={provider} applicants={selectedApplicants} extras={extras} sectorCode={sectorCode} selectedCourse={selectedCourse}/>
                </div>
              </div>
            </div>
          </motion.div>}
        </AnimatePresence>
      </div>
      
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" disabled={step === 0} onClick={() => goToStep(step-1)}><ChevronLeft size={14}/> Previous</button>
        <div className="flex items-center gap-2">
          {!canProceed() && step < 4 && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle size={12}/>
              {step===0?'Select a course and industry sector':step===1?'Select at least one applicant':step===2?'All trainees must have Client Type, Date Started, and Date Finished':'NCLC Administrator and at least one trainer are required'}
            </span>
          )}
          {step === 3 && <button className="btn-primary text-sm" onClick={() => setShowSaveConfirm(true)} disabled={saving||!canProceed()}>{saving?'Saving…':<><Save size={14}/> Save & Preview</>}</button>}
          {step < 3 && <button className="btn-primary text-sm" disabled={!canProceed()} onClick={() => goToStep(step+1)}>Next <ChevronRight size={14}/></button>}
        </div>
      </div>
    </div>
  );
}

// ─── NEW WIZARD ───────────────────────────────────────────────────────────────
function NewWizard({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  function goToStep(n: number) { setStep(n); setMaxStep(prev => Math.max(prev, n)); }

  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [savedReportId, setSavedReportId] = useState<number | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [programInfo, setProgramInfo] = useState<ProgramInfo>({ qualification_ntr:'', copr_number:'', industry_sector:'', industry_sector_other:'' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [extras, setExtras] = useState<Record<number, TraineeExtra>>({});
  const [provider, setProvider] = useState<ProviderInfo>({ title:'ENROLLMENT/TERMINAL REPORT', program_title:'', prepared_by_left:'', prepared_by_right:'', nclc_admin:'' });

  const { data: allRegs } = useQuery({
    queryKey: ['all-regs-for-report'],
    queryFn: () => api.get('/registrations', { params:{ limit:500, status:'active' } }).then(r => r.data.data),
    enabled: selectedIds.length > 0,
    staleTime: 30000,
  });
  const selectedApplicants = useMemo(() => (allRegs||[]).filter((r: any) => selectedIds.includes(r.id)), [allRegs, selectedIds]);
  const sectorCode = useMemo(() => SECTOR_CODES[programInfo.industry_sector] || 'S', [programInfo.industry_sector]);

  function canProceed(): boolean {
    if (step === 0) return !!(selectedCourse && programInfo.industry_sector);
    if (step === 1) return selectedIds.length > 0;
    if (step === 2) return selectedIds.every(id => { const ex = extras[id] ?? emptyExtra(id); return !!(ex.client_type && ex.date_started && ex.date_finished); });
    if (step === 3) return !!(provider.nclc_admin && provider.prepared_by_left);
    return true;
  }

  async function handleSave() {
    if (saving) return;
    const trainees = selectedIds.map((id, idx) => {
      const ex = extras[id] ?? emptyExtra(id);
      return {
        registration_id: id,
        student_id_number: ex.student_id_number || `NTC-${sectorCode}-${String(idx+1).padStart(4,'0')}`,
        pgs_training_component: ex.pgs_training_component, voucher_number: ex.voucher_number,
        client_type: ex.client_type, date_started: ex.date_started||null, date_finished: ex.date_finished||null,
        reason_not_finishing: ex.reason_not_finishing, assessment_results: ex.assessment_results,
        employment_date: ex.employment_date||null, employer_name: ex.employer_name, employer_address: ex.employer_address,
        region: ex.region, province: ex.province, district: ex.district, municipality: ex.municipality,
        provider_name: ex.provider_name, tbp_id: ex.tbp_id, address: ex.address,
        institution_type: ex.institution_type, classification: ex.classification,
        full_qualification: ex.full_qualification, qualification_clustered: ex.qualification_clustered,
        qualification_ntr: ex.qualification_ntr, copr_number: ex.copr_number,
        industry_sector: ex.industry_sector, industry_sector_other: ex.industry_sector_other, delivery_mode: ex.delivery_mode,
      };
    });
    const payload = {
      title: provider.title, program_title: provider.program_title,
      prepared_by_left: provider.prepared_by_left, prepared_by_right: provider.prepared_by_right, nclc_admin: provider.nclc_admin,
      region:'', province:'', district:'', municipality:'', provider_name:'', tbp_id:'', address:'',
      institution_type:'', classification:'', full_qualification:'', qualification_clustered:'',
      delivery_mode: selectedCourse?.name||'',
      qualification_ntr: programInfo.qualification_ntr, copr_number: programInfo.copr_number,
      industry_sector: programInfo.industry_sector, industry_sector_other: programInfo.industry_sector_other,
      trainees,
    };
    setSaving(true);
    try {
      const { data } = await api.post('/reports', payload);
      setSavedReportId(data.id);
      toast.success('Report saved!');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      goToStep(4);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  const printRef = useRef<HTMLDivElement>(null!);
  const slide = { enter:{ opacity:0, x:20 }, center:{ opacity:1, x:0 }, exit:{ opacity:0, x:-20 } };

  return (
    <div className="max-w-6xl mx-auto">
      <ConfirmModal open={showSaveConfirm} onClose={() => setShowSaveConfirm(false)}
        onConfirm={() => { setShowSaveConfirm(false); handleSave(); }}
        title="Save Report?" description={`Create a new report with ${selectedIds.length} trainee${selectedIds.length!==1?'s':''}?`}
        confirmLabel="Save & Preview"/>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onDone} className="btn-ghost text-sm"><ChevronLeft size={14}/> All Reports</button>
        <div className="flex-1">
          <h1 className="section-title">New Report</h1>
          <p className="text-sm text-text-muted mt-1">TESDA Enrollment / Terminal Report</p>
        </div>
        {savedReportId && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved (ID: {savedReportId})</span>}
      </div>
      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <button onClick={() => i <= maxStep && i !== step && goToStep(i)}
                className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  i === step ? 'btn-primary' : i <= maxStep ? 'btn-ghost text-accent border-accent' : 'opacity-40 cursor-default btn-ghost')}>
                {i < step && i <= maxStep ? <Check size={12}/> : <s.icon size={12}/>}
                {s.label}
              </button>
              {i < STEPS.length-1 && <ChevronRight size={14} className="text-text-muted shrink-0"/>}
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6 mb-5 min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 0 && <motion.div key="s0" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <StepSelectCourse selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} programInfo={programInfo} setProgramInfo={setProgramInfo}/>
          </motion.div>}
          {step === 1 && <motion.div key="s1" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <StepSelectApplicants selectedIds={selectedIds} setSelectedIds={setSelectedIds} courseName={selectedCourse?.name ?? ''}/>
          </motion.div>}
          {step === 2 && <motion.div key="s2" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            {selectedApplicants.length === 0
              ? <div className="flex items-center justify-center h-48 text-text-muted text-sm">Loading applicant data…</div>
              : <StepTrainingDetails applicants={selectedApplicants} extras={extras} setExtras={setExtras} sectorCode={sectorCode} selectedCourse={selectedCourse} industrySector={programInfo.industry_sector}/>}
          </motion.div>}
          {step === 3 && <motion.div key="s3" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <StepSignatories provider={provider} setProvider={setProvider}/>
          </motion.div>}
          {step === 4 && <motion.div key="s4" variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration:0.18 }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="form-section-title"><FileText size={15}/> Review & Print</div>
                <div className="flex items-center gap-3">
                  {savedReportId && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Saved to DB (ID: {savedReportId})</span>}
                  <ReportActions
                    printRef={printRef}
                    title={provider.title}
                    applicants={selectedApplicants}
                    extras={extras}
                    sectorCode={sectorCode}
                    selectedCourse={selectedCourse}
                  />
                </div>
              </div>
              <div style={{ overflowX:'auto', overflowY:'auto', borderRadius:'12px', border:'1px solid var(--border)', maxHeight:'600px' }}>
                <div ref={printRef} id="print-area">
                  <ReportTable provider={provider} applicants={selectedApplicants} extras={extras} sectorCode={sectorCode} selectedCourse={selectedCourse}/>
                </div>
              </div>
            </div>
          </motion.div>}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" disabled={step === 0} onClick={() => goToStep(step-1)}><ChevronLeft size={14}/> Previous</button>
        <div className="flex items-center gap-2">
          {!canProceed() && step < 4 && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle size={12}/>
              {step===0?'Select a course and industry sector':step===1?'Select at least one applicant':step===2?'All trainees must have Client Type, Date Started, and Date Finished':'NCLC Administrator and at least one trainer are required'}
            </span>
          )}
          {step === 3 && <button className="btn-primary text-sm" onClick={() => setShowSaveConfirm(true)} disabled={saving||!canProceed()}>{saving?'Saving…':<><Save size={14}/> Save & Preview</>}</button>}
          {step < 3 && <button className="btn-primary text-sm" disabled={!canProceed()} onClick={() => goToStep(step+1)}>Next <ChevronRight size={14}/></button>}
        </div>
      </div>
    </div>
  );
}

// ─── Reports List ─────────────────────────────────────────────────────────────
type CompletionFilter = 'all' | 'finished' | 'in-progress';

// frontend/src/pages/shared/Reports.tsx

// First, find the ReportsList component (around line 970) and replace its search/filter section:

function ReportsList({ onNew, onView, onEdit }: {
  onNew: () => void; onView: (id: number) => void; onEdit: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch]                   = useState('');
  const [page, setPage]                       = useState(1);
  const [limit, setLimit]                     = useState(10);
  const [tab, setTab]                         = useState<'active'|'archived'>('active');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [dateFrom, setDateFrom]               = useState('');
  const [dateTo, setDateTo]                   = useState('');
  const [minTrainees, setMinTrainees]         = useState('');
  const [maxTrainees, setMaxTrainees]         = useState('');
  const [showFilters, setShowFilters]         = useState(false);
  const [archiveTarget, setArchiveTarget]     = useState<{ id: number; title: string }|null>(null);
  const [restoreTarget, setRestoreTarget]     = useState<{ id: number; title: string }|null>(null);

  const hasActiveFilters = !!(dateFrom||dateTo||minTrainees||maxTrainees);
  function clearFilters() { setDateFrom(''); setDateTo(''); setMinTrainees(''); setMaxTrainees(''); setPage(1); }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', page, limit, search, tab, dateFrom, dateTo, minTrainees, maxTrainees],
    queryFn: () => api.get('/reports', {
      params:{
        page, limit, search,
        archived: tab === 'archived' ? true : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_trainees: minTrainees || undefined,
        max_trainees: maxTrainees || undefined,
      },
    }).then(r => r.data),
    staleTime: 10000,
  });

  const allReports: any[] = data?.data || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  const reports = useMemo(() => {
    if (completionFilter === 'all') return allReports;
    return allReports.filter(r => {
      const done  = r.finished_count ?? 0;
      const total = r.trainee_count  ?? 0;
      if (completionFilter === 'finished')    return total > 0 && done === total;
      if (completionFilter === 'in-progress') return done < total;
      return true;
    });
  }, [allReports, completionFilter]);

  const finishedCount   = allReports.filter(r => (r.trainee_count ?? 0) > 0 && r.finished_count === r.trainee_count).length;
  const inProgressCount = allReports.filter(r => (r.finished_count ?? 0) < (r.trainee_count ?? 0)).length;

  async function archive(id: number) {
    try { await api.patch(`/reports/${id}/archive`); toast.success('Archived.'); await queryClient.invalidateQueries({ queryKey:['reports'] }); }
    catch { toast.error('Failed to archive.'); }
  }
  async function restore(id: number) {
    try { await api.patch(`/reports/${id}/restore`); toast.success('Restored.'); await queryClient.invalidateQueries({ queryKey:['reports'] }); }
    catch { toast.error('Failed to restore.'); }
  }

  const completionTabs: { key: CompletionFilter; label: string; count: number }[] = [
    { key: 'all',         label: 'All',         count: allReports.length },
    { key: 'finished',    label: 'Finished',    count: finishedCount     },
    { key: 'in-progress', label: 'In Progress', count: inProgressCount   },
  ];

  return (
    <div>
      <ConfirmModal open={!!archiveTarget} onClose={() => setArchiveTarget(null)}
        onConfirm={async () => { if(archiveTarget){await archive(archiveTarget.id);setArchiveTarget(null);} }}
        title="Archive Report?" description={`"${archiveTarget?.title}" will be moved to Archived.`} confirmLabel="Archive"/>
      <ConfirmModal open={!!restoreTarget} onClose={() => setRestoreTarget(null)}
        onConfirm={async () => { if(restoreTarget){await restore(restoreTarget.id);setRestoreTarget(null);} }}
        title="Restore Report?" description={`"${restoreTarget?.title}" will be moved back to Active.`} confirmLabel="Restore"/>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Reports</h1>
          <p className="text-sm text-text-muted mt-1">{total} {tab} report{total!==1?'s':''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm"><RefreshCw size={14}/></button>
          {tab === 'active' && <button onClick={onNew} className="btn-primary text-sm"><Plus size={14}/> New Report</button>}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['active','archived'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); setCompletionFilter('all'); }}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize', tab===t?'btn-primary':'btn-ghost')}>
            {t==='archived' && <Archive size={13}/>}
            {t==='active'?'Active':'Archived'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 mb-4">
        {completionTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setCompletionFilter(t.key); setPage(1); }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              completionFilter === t.key
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'btn-ghost opacity-70'
            )}
          >
            {t.key === 'finished'    && <CheckCircle2 size={11} className="text-green-500" />}
            {t.key === 'in-progress' && <AlertCircle  size={11} className="text-amber-500" />}
            {t.label}
            <span className={clsx(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              completionFilter === t.key ? 'bg-accent/20 text-accent' : 'bg-bg-input text-text-muted'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* FIXED: Search + Filters section */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input - fixed */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              placeholder="Search by title or program…"
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filter toggle button - fixed */}
          <button 
            onClick={() => setShowFilters(f=>!f)} 
            className={clsx(
              'h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shrink-0',
              hasActiveFilters 
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
            {hasActiveFilters && (
              <span className="ml-1 w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center font-medium">
                {[dateFrom,dateTo,minTrainees,maxTrainees].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              transition={{ duration: 0.18 }} 
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Date From - fixed */}
                  <div>
                    <label className="label text-xs mb-1 block">Date From</label>
                    <input 
                      type="date" 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      value={dateFrom} 
                      onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    />
                  </div>
                  {/* Date To - fixed */}
                  <div>
                    <label className="label text-xs mb-1 block">Date To</label>
                    <input 
                      type="date" 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      value={dateTo} 
                      onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    />
                  </div>
                  {/* Min Trainees - fixed */}
                  <div>
                    <label className="label text-xs mb-1 block">Min Trainees</label>
                    <input 
                      type="number" 
                      min="0" 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all" 
                      placeholder="e.g. 5" 
                      value={minTrainees} 
                      onChange={e => { setMinTrainees(e.target.value); setPage(1); }}
                    />
                  </div>
                  {/* Max Trainees - fixed */}
                  <div>
                    <label className="label text-xs mb-1 block">Max Trainees</label>
                    <input 
                      type="number" 
                      min="0" 
                      className="w-full h-10 px-3 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all" 
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

      {/* Rest of the component remains the same from here */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title / Program</th>
              <th>Trainees</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(limit)].map((_,i) => (
                <tr key={i}>{[...Array(5)].map((_,j) => <td key={j}><div className="skeleton"/></td>)}</tr>
              ))
            ) : reports.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16">
                <div className="text-4xl mb-3">{tab==='archived'?'🗄️':'📋'}</div>
                <div className="text-sm text-text-muted mb-3">
                  {completionFilter !== 'all'
                    ? `No ${completionFilter === 'finished' ? 'fully finished' : 'in-progress'} reports on this page.`
                    : tab === 'archived' ? 'No archived reports.' : 'No reports yet.'
                  }
                </div>
                {tab==='active' && completionFilter==='all' && (
                  <button onClick={onNew} className="btn-primary text-sm mx-auto"><Plus size={14}/> Create First Report</button>
                )}
              </td></tr>
            ) : reports.map((r: any) => {
              const finished     = r.finished_count ?? 0;
              const traineeTotal = r.trainee_count  ?? 0;
              const allDone      = traineeTotal > 0 && finished === traineeTotal;
              const pct          = traineeTotal === 0 ? 0 : Math.round((finished / traineeTotal) * 100);
              return (
                <tr key={r.id}>
                  <td>
                    <div className="font-semibold text-sm text-text-primary">{r.title}</div>
                    {r.program_title && <div className="text-xs text-text-muted">{r.program_title}</div>}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1.5 min-w-[110px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-blue">{traineeTotal} trainee{traineeTotal!==1?'s':''}</span>
                        {allDone && traineeTotal > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-500 whitespace-nowrap">
                            <CheckCircle2 size={10}/> All finished
                          </span>
                        )}
                        {!allDone && finished > 0 && (
                          <span className="text-[10px] font-semibold text-amber-500 whitespace-nowrap">
                            {finished}/{traineeTotal} done
                          </span>
                        )}
                      </div>
                      {traineeTotal > 0 && (
                        <div className="h-1 w-full rounded-full bg-bg-input overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              allDone ? 'bg-green-500' : finished > 0 ? 'bg-amber-400' : 'bg-border'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-xs text-text-muted">{r.creator_name||'—'}</td>
                  <td className="text-xs text-text-muted">{new Date(r.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {tab==='active' ? (
                        <>
                          <button title="View / Print" onClick={() => onView(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent transition-colors"><Eye size={14}/></button>
                          <button title="Edit" onClick={() => onEdit(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-amber-400 transition-colors"><Pencil size={14}/></button>
                          <button title="Archive" onClick={() => setArchiveTarget({ id:r.id, title:r.title })} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"><Archive size={14}/></button>
                        </>
                      ) : (
                        <button title="Restore" onClick={() => setRestoreTarget({ id:r.id, title:r.title })} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-green-500 transition-colors"><RefreshCw size={14}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-end gap-4 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Rows per page:</span>
            <select className="text-xs py-1 px-2 rounded-lg border border-border bg-bg-input text-text-primary w-16 cursor-pointer"
              value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <span className="text-xs text-text-muted ml-5">{total===0?'0–0 of 0':`${(page-1)*limit+1}–${Math.min(page*limit,total)} of ${total}`}</span>
          <button className="btn-ghost text-xs py-1.5 px-3" disabled={page<=1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={13}/> Prev</button>
          <button className="btn-ghost text-xs py-1.5 px-3" disabled={page>=pages} onClick={() => setPage(p=>p+1)}>Next <ChevronRight size={13}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Reports() {
  const [mode, setMode] = useState<'list'|'new'|'view'|'edit'>('list');
  const [activeId, setActiveId] = useState<number|null>(null);

  if (mode === 'view' && activeId)
    return <ReportView reportId={activeId} onBack={() => { setMode('list'); setActiveId(null); }} onEdit={() => setMode('edit')} />;

  if (mode === 'edit' && activeId)
    return <EditWizard reportId={activeId} onDone={() => { setMode('list'); setActiveId(null); }} />;

  if (mode === 'new')
    return <NewWizard onDone={() => setMode('list')} />;

  return (
    <ReportsList
      onNew={() => { setActiveId(null); setMode('new'); }}
      onView={id => { setActiveId(id); setMode('view'); }}
      onEdit={id => { setActiveId(id); setMode('edit'); }}
    />
  );
}