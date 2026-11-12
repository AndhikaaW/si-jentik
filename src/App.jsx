import React, { useMemo, useState } from 'react';
import { compressToBase64 } from './image.js';
import { downloadExcel } from './export.js';
import { ClipboardList, Database, FileSpreadsheet, FileText, LayoutDashboard, UsersRound } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarProvider, SidebarTrigger,
} from './components/ui/sidebar.jsx';

const defaultDusuns = ['Krajan', 'Karangnongko', 'Sembungan', 'Mangunrejo', 'Gondang', 'Patuk', 'Plumbon', 'Kebonagung'];
const defaultFormula = { numerator: 'A - B', denominator: 'A', multiplier: 100 };
const initialReports = [
  { id: 'r1', dusun: 'Krajan', surveyor: 'Siti Rahma', examined: 48, positive: 2, tubs: 91, tubsPositive: 3, date: '2026-11-12', time: '09.42', lat: '-7.70412', lng: '110.62381', photo: '' },
  { id: 'r2', dusun: 'Karangnongko', surveyor: 'Dwi Lestari', examined: 36, positive: 1, tubs: 74, tubsPositive: 2, date: '2026-11-12', time: '10.18', lat: '-7.69881', lng: '110.63530', photo: '' },
  { id: 'r3', dusun: 'Sembungan', surveyor: 'Rina Astuti', examined: 42, positive: 5, tubs: 83, tubsPositive: 8, date: '2026-11-12', time: '08.56', lat: '-7.71134', lng: '110.64118', photo: '' },
  { id: 'r4', dusun: 'Mangunrejo', surveyor: 'Agus Widodo', examined: 31, positive: 0, tubs: 62, tubsPositive: 1, date: '2026-11-11', time: '11.07', lat: '', lng: '', photo: '' },
  { id: 'r5', dusun: 'Gondang', surveyor: 'Nia Puspita', examined: 39, positive: 2, tubs: 78, tubsPositive: 4, date: '2026-11-11', time: '09.22', lat: '', lng: '', photo: '' },
];
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const formulaTerm = (term, A, B) => term === 'A - B' ? A - B : term === 'B' ? B : A;
const googleMapsUrl = (report) => {
  if (!String(report.lat ?? '').trim() || !String(report.lng ?? '').trim()) return '';
  const lat = Number(report.lat);
  const lng = Number(report.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
};
const abj = (r, formula = defaultFormula) => {
  const A = Number(r.examined) || 0;
  const B = Number(r.positive) || 0;
  const denominator = formulaTerm(formula.denominator, A, B);
  return denominator ? (formulaTerm(formula.numerator, A, B) / denominator) * Number(formula.multiplier || 100) : 0;
};
const format = (n) => new Intl.NumberFormat('id-ID').format(n);

export default function App() {
  const [reports, setReports] = useState(() => readStore('sj-reports', initialReports));
  const [users, setUsers] = useState(() => readStore('sj-users', [
    { name: 'Siti Rahma', email: 'siti.rahma@puskesmas.id', role: 'Surveyor', dusun: 'Krajan', active: true },
    { name: 'Dwi Lestari', email: 'dwi.lestari@puskesmas.id', role: 'Surveyor', dusun: 'Karangnongko', active: true },
    { name: 'Nia Puspita', email: 'nia.puspita@puskesmas.id', role: 'Admin', dusun: 'Semua dusun', active: true },
  ]));
  const [roles, setRoles] = useState(() => readStore('sj-roles', ['Superadmin', 'Admin', 'Surveyor']));
  const [dusuns, setDusuns] = useState(() => readStore('sj-dusuns', defaultDusuns));
  const [formula, setFormula] = useState(() => readStore('sj-abj-formula', defaultFormula));
  const [page, setPage] = useState('Ringkasan');
  const [currentRole, setCurrentRole] = useState('Admin');
  const [profileOpen, setProfileOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportReports, setExportReports] = useState([]);
  const [editingDusun, setEditingDusun] = useState(null);
  const [showDusunForm, setShowDusunForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('Semua dusun');
  const totalExamined = reports.reduce((sum, r) => sum + r.examined, 0);
  const totalPositive = reports.reduce((sum, r) => sum + r.positive, 0);
  const overall = abj({ examined: totalExamined, positive: totalPositive }, formula);
  const latestDay = reports.reduce((latest, r) => r.date > latest ? r.date : latest, '');
  const latestReports = useMemo(() => reports.filter(r => r.date === latestDay), [reports, latestDay]);
  const byDusun = dusuns.map(name => {
    const rows = latestReports.filter(r => r.dusun === name);
    const houses = rows.reduce((n, r) => n + r.examined, 0);
    const positives = rows.reduce((n, r) => n + r.positive, 0);
    return { name, rows, houses, positives, score: houses ? abj({ examined: houses, positive: positives }, formula) : null };
  });
  const visibleReports = reports.filter(r => filter === 'Semua dusun' || r.dusun === filter);
  const persist = (key, val, setter) => { setter(val); localStorage.setItem(key, JSON.stringify(val)); };
  const flash = (text) => { setNotice(text); window.setTimeout(() => setNotice(''), 3200); };
  const openExport = (rows) => { setExportReports(rows); setShowExport(true); };
  const exportData = (format) => {
    const rows = [['Tanggal', 'Dusun', 'Surveyor', 'Rumah diperiksa', 'Rumah positif', 'ABJ %', 'Bak diperiksa', 'Bak positif', 'Lokasi (Google Maps)', 'Waktu kirim'], ...exportReports.map(r => { const url = googleMapsUrl(r); return [r.date, r.dusun, r.surveyor, r.examined, r.positive, Number(abj(r, formula).toFixed(2)), r.tubs, r.tubsPositive, url ? { formula: `HYPERLINK("${url}","Buka Google Maps")`, result: 'Buka Google Maps', url } : '', r.time]; })];
    if (format === 'xlsx') downloadExcel(rows);
    else {
      const csv = rows.map(row => row.map(value => {
        const text = value && typeof value === 'object' ? value.url : String(value ?? '');
        const safe = /^[=+@\-]/.test(text) ? `'${text}` : text;
        return `"${safe.replaceAll('"', '""')}"`;
      }).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'rekap-si-jentik.csv'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setShowExport(false);
  };
  const navigation = currentRole === 'Superadmin'
    ? ['Ringkasan', 'Laporan', 'Manajemen pengguna', 'Master data']
    : currentRole === 'Admin'
      ? ['Ringkasan', 'Laporan', 'Master data']
      : ['Laporan'];
  const canManageMasterData = currentRole === 'Superadmin' || currentRole === 'Admin';
  const isMasterPage = page === 'Master data dusun' || page === 'Setting rumus ABJ';
  const navIcons = { 'Ringkasan': LayoutDashboard, 'Laporan': ClipboardList, 'Manajemen pengguna': UsersRound, 'Riwayat laporan': ClipboardList, 'Master data': Database };

  return <SidebarProvider className="app-shell" defaultOpen style={{ '--sidebar-width': '248px' }}>
    <Sidebar className="shadcn-sidebar">
      <SidebarHeader><div className="brand"><div className="brand-mark" aria-hidden="true">SJ</div><div><strong>SI-JENTIK</strong><span>Puskesmas Kebonagung</span></div></div></SidebarHeader>
      <SidebarContent><SidebarGroup><SidebarGroupLabel>Menu utama</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{navigation.map(item => { const Icon = navIcons[item]; return <SidebarMenuItem key={item}><SidebarMenuButton isActive={item === 'Master data' ? isMasterPage : page === item} tooltip={item} onClick={() => setPage(item === 'Master data' ? 'Master data dusun' : item)}><Icon aria-hidden="true"/><span>{item}</span></SidebarMenuButton>{item === 'Master data' && isMasterPage && <SidebarMenuSub><SidebarMenuSubItem><button className={`master-subitem ${page === 'Master data dusun' ? 'active' : ''}`} onClick={() => setPage('Master data dusun')}>Master data dusun</button></SidebarMenuSubItem><SidebarMenuSubItem><button className={`master-subitem ${page === 'Setting rumus ABJ' ? 'active' : ''}`} onClick={() => setPage('Setting rumus ABJ')}>Setting rumus ABJ</button></SidebarMenuSubItem></SidebarMenuSub>}</SidebarMenuItem>; })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
      <SidebarFooter><button className="profile profile-trigger" onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen} aria-haspopup="menu"><span className="avatar">NP</span><span className="profile-copy"><b>Nia Puspita</b><span>{currentRole} · Mode demo</span></span><span className="more" aria-hidden="true">···</span></button><div className="sidebar-caption">Prototype · data contoh</div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="main-area" style={{ width: 0, minWidth: 0 }}>
      <header className="topbar"><SidebarTrigger className="sidebar-toggle" aria-label="Buka atau tutup navigasi"/><div className="mobile-brand"><span className="brand-mark">SJ</span><b>SI-JENTIK</b></div><div className="crumb">Puskesmas Kebonagung <span>/</span> {page}</div><div className="top-actions"><span className="connection"><i />Mode prototipe lokal</span><button className="circle-button" aria-label="Notifikasi">♧</button><button className="avatar small profile-avatar-button" onClick={() => setProfileOpen(v => !v)} aria-label="Buka menu akun" aria-expanded={profileOpen} aria-haspopup="menu">NP</button>{profileOpen && <div className="profile-menu" role="menu"><div className="profile-menu-head"><b>Nia Puspita</b><span>Simulasi role, tidak mengubah akun</span></div><span className="profile-menu-label">GANTI ROLE DEMO</span>{roles.map(role => <button role="menuitemradio" aria-checked={currentRole === role} className="role-option" key={role} onClick={() => { setCurrentRole(role); setPage(role === 'Surveyor' ? 'Riwayat laporan' : 'Ringkasan'); setProfileOpen(false); flash(`Menu diperbarui untuk mode demo ${role}`); }}><span>{role}</span><span>{currentRole === role ? '✓' : ''}</span></button>)}<div className="profile-menu-divider" /><button role="menuitem" className="logout-option" onClick={() => { setProfileOpen(false); flash('Logout Firebase belum aktif, ini masih mode demo.'); }}>Keluar dari mode demo</button></div>}</div></header>
      <div className="content">
        <div className="page-heading"><div><p className="date-line">KAMIS, 12 NOVEMBER 2026</p><h1>{page === 'Ringkasan' ? 'Pemantauan jentik' : page}</h1><p className="subheading">{page === 'Ringkasan' ? 'Pantau laporan PJB dari seluruh dusun.' : page === 'Laporan' ? 'Telusuri dan ekspor hasil pemeriksaan.' : page === 'Manajemen pengguna' ? 'Kelola akses pengguna dan peran aplikasi.' : page === 'Master data dusun' ? 'Kelola daftar dusun yang tersedia untuk pelaporan.' : page === 'Setting rumus ABJ' ? 'Atur rumus yang digunakan untuk menghitung ABJ.' : 'Catat pemeriksaan dan tinjau riwayat laporan.'}</p></div>{page !== 'Setting rumus ABJ' && <button className="primary-button" onClick={() => { if (page === 'Manajemen pengguna') setShowUser(true); else if (page === 'Master data dusun') { setEditingDusun(null); setShowDusunForm(true); } else setShowForm(true); }}><span aria-hidden="true">＋</span>{page === 'Manajemen pengguna' ? 'Tambah pengguna' : page === 'Master data dusun' ? 'Tambah dusun' : 'Input laporan'}</button>}</div>
        {page === 'Ringkasan' && <>
          <div className="metrics">
            <Metric title="Rumah diperiksa" value={format(totalExamined)} note="Akumulasi laporan tersimpan" icon="⌂" />
            <Metric title="Rumah positif" value={format(totalPositive)} note="Perlu tindak lanjut pemantauan" icon="⌕" />
          <Metric title="ABJ keseluruhan" value={`${overall.toFixed(1)}%`} note="Target acuan program 95%" icon="◌" accent={overall >= 95} />
            <Metric title="Dusun melapor hari ini" value={`${latestReports.length} / ${dusuns.length}`} note={`Pembaruan terakhir ${latestReports[0]?.time ?? '—'} WIB`} icon="▤" />
          </div>
          <div className="section-grid">
            <section className="panel dusun-panel"><div className="panel-heading"><div><h2>Status per dusun</h2><p>Rekap laporan pada {latestDay || 'belum ada laporan'}</p></div><span className="legend"><i /> Target ABJ 95%</span></div><div className="dusun-list">{byDusun.map(d => <div className="dusun-row" key={d.name}><div className="dusun-name"><span className="place-dot" />{d.name}</div><div className="bar-track"><div className={`bar-fill ${d.score === null ? 'empty' : d.score < 95 ? 'warn' : ''}`} style={{ width: `${d.score ?? 0}%` }} /></div><div className="dusun-score">{d.score === null ? <span className="not-reported">Belum lapor</span> : <><b className={d.score < 95 ? 'score-warn' : ''}>{d.score.toFixed(1)}%</b><span>{d.rows.length} laporan</span></>}</div></div>)}</div><div className="target-line-note"><span>0%</span><span>Garis vertikal menandai target program 95%</span><span>100%</span></div></section>
            <section className="panel activity-panel"><div className="panel-heading"><div><h2>Laporan terbaru</h2><p>Aktivitas surveyor terkini</p></div><button className="text-button" onClick={() => setPage(currentRole === 'Surveyor' ? 'Riwayat laporan' : 'Laporan')}>Lihat semua</button></div>{reports.slice(0, 4).map(r => <div className="activity-row" key={r.id}><div className="activity-icon">{r.dusun.slice(0, 1)}</div><div className="activity-copy"><b>{r.surveyor}</b><span>{r.dusun} · {r.examined} rumah diperiksa</span></div><time>{r.time}</time></div>)}</section>
          </div>
          <section className="panel table-panel"><div className="panel-heading"><div><h2>Ringkasan dusun</h2><p>Jumlah pemeriksaan dari laporan terbaru tiap dusun</p></div><button className="text-button" onClick={() => openExport(latestReports)}>Unduh rekap ↓</button></div><ReportsTable reports={latestReports} formula={formula} /></section>
        </>}
        {(page === 'Laporan' || page === 'Riwayat laporan') && <section className="panel table-panel"><div className="toolbar"><label className="filter-label">Dusun<select value={filter} onChange={e => setFilter(e.target.value)}><option>Semua dusun</option>{dusuns.map(d => <option key={d}>{d}</option>)}</select></label><button className="secondary-button" onClick={() => openExport(visibleReports)}>Unduh rekap</button></div><ReportsTable reports={visibleReports} formula={formula} /></section>}
        {page === 'Master data dusun' && <section className="panel table-panel"><div className="panel-heading master-heading"><div><h2>Master data dusun</h2><p>{dusuns.length} dusun terdaftar untuk dipilih pada laporan.</p></div></div><div className="master-dusun-list">{dusuns.map(name => <div className="master-dusun-row" key={name}><span className="master-dusun-name">{name}</span><span className="master-dusun-actions"><button className="secondary-button" onClick={() => { setEditingDusun(name); setShowDusunForm(true); }}>Ubah nama</button><button className="danger-text-button" onClick={() => { if (dusuns.length < 2) { flash('Minimal harus ada satu dusun aktif.'); return; } if (window.confirm(`Hapus dusun ${name} dari daftar pilihan? Riwayat laporan lama tetap tersimpan.`)) persist('sj-dusuns', dusuns.filter(d => d !== name), setDusuns); }}>Hapus</button></span></div>)}</div></section>}
        {page === 'Setting rumus ABJ' && <FormulaSettings formula={formula} onSave={next => { persist('sj-abj-formula', next, setFormula); flash('Pengaturan rumus ABJ disimpan.'); }} />}
        {page === 'Manajemen pengguna' && <><section className="panel roles-panel"><div className="panel-heading"><div><h2>Peran aplikasi</h2><p>Peran dapat ditambah sesuai kebutuhan organisasi.</p></div><button className="secondary-button" onClick={() => { const role = window.prompt('Nama peran baru'); if (role?.trim() && !roles.includes(role.trim())) persist('sj-roles', [...roles, role.trim()], setRoles); }}>＋ Tambah peran</button></div><div className="role-list">{roles.map(role => <span className="role-chip" key={role}>{role}</span>)}</div></section><section className="panel table-panel"><div className="panel-heading"><div><h2>Daftar pengguna</h2><p>{users.length} akun · data prototipe tersimpan di browser ini</p></div></div><div className="user-table"><div className="user-head"><span>Nama pengguna</span><span>Peran</span><span>Dusun</span><span>Status</span></div>{users.map((u, i) => <div className="user-row" key={`${u.email}-${i}`}><div className="user-ident"><span className="avatar user-avatar">{u.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span><span><b>{u.name}</b><small>{u.email}</small></span></div><span>{u.role}</span><span>{u.dusun}</span><span className="active-status"><i />Aktif</span></div>)}</div></section></>}
        <footer className="footer-note">SI-JENTIK REMOTE <span>Data pada prototype ini tersimpan lokal di browser, belum dikirim ke Firebase.</span></footer>
      </div>
    </SidebarInset>
    {showForm && <ReportModal dusuns={dusuns} formula={formula} onClose={() => setShowForm(false)} onSave={r => { const next = [r, ...reports]; persist('sj-reports', next, setReports); setShowForm(false); flash('Laporan tersimpan di prototipe.'); }} />}
    {showUser && <UserModal roles={roles} dusuns={dusuns} onClose={() => setShowUser(false)} onSave={u => { const next = [...users, u]; persist('sj-users', next, setUsers); setShowUser(false); flash('Pengguna ditambahkan ke data prototipe.'); }} />}
    {showDusunForm && <DusunModal initialName={editingDusun ?? ''} existing={dusuns} onClose={() => setShowDusunForm(false)} onSave={name => { const next = editingDusun ? dusuns.map(d => d === editingDusun ? name : d) : [...dusuns, name]; persist('sj-dusuns', next, setDusuns); setShowDusunForm(false); flash(editingDusun ? 'Nama dusun diperbarui.' : 'Dusun ditambahkan.'); }} />}
    {showExport && <ExportModal count={exportReports.length} onClose={() => setShowExport(false)} onChoose={exportData} />}
    {notice && <div className="toast" role="status">{notice}</div>}
  </SidebarProvider>;
}

function Metric({ title, value, note, icon, accent }) { return <section className="metric"><div className="metric-top"><span>{title}</span><span className="metric-icon">{icon}</span></div><strong className={accent ? 'good-number' : ''}>{value}</strong><small>{note}</small></section>; }

function ReportsTable({ reports, formula }) {
  if (!reports.length) return <div className="empty-state"><div>▤</div><b>Belum ada laporan pada pilihan ini</b><span>Ubah filter atau tambahkan laporan pemeriksaan.</span></div>;
  return <div className="table-scroll"><table><thead><tr><th>Dusun</th><th>Surveyor</th><th>Rumah diperiksa</th><th>Positif</th><th>ABJ</th><th>Koordinat</th><th>Waktu kirim</th></tr></thead><tbody>{reports.map(r => <tr key={r.id}><td data-label="Dusun"><b>{r.dusun}</b><small className="date-cell">{r.date}</small></td><td data-label="Surveyor">{r.surveyor}</td><td data-label="Rumah diperiksa">{r.examined}</td><td data-label="Rumah positif">{r.positive}</td><td data-label="ABJ"><span className={`abj-tag ${abj(r, formula) < 95 ? 'low' : ''}`}>{abj(r, formula).toFixed(1)}%</span></td><td data-label="Koordinat">{r.lat && r.lng ? <a className="map-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}>Buka peta ↗</a> : <span className="muted">Tidak tersedia</span>}</td><td data-label="Waktu kirim">{r.time} WIB</td></tr>)}</tbody></table></div>;
}

function ExportModal({ count, onClose, onChoose }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title"><div className="modal-head"><div><span className="eyebrow">EKSPOR LAPORAN</span><h2 id="export-title">Pilih format unduhan</h2><p className="export-count">{count} laporan akan disertakan.</p></div><button className="close-button" onClick={onClose} aria-label="Tutup">×</button></div><div className="export-choices"><button className="export-choice" onClick={() => onChoose('csv')}><span className="export-icon"><FileText size={20}/></span><span><b>CSV</b><small>.csv · mudah dibuka di spreadsheet</small></span><span className="choice-arrow">↓</span></button><button className="export-choice" onClick={() => onChoose('xlsx')}><span className="export-icon excel"><FileSpreadsheet size={20}/></span><span><b>Excel</b><small>.xlsx · workbook spreadsheet</small></span><span className="choice-arrow">↓</span></button></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button></div></section></div>;
}

function FormulaSettings({ formula, onSave }) {
  const [draft, setDraft] = useState(formula);
  const preview = `ABJ = (${draft.numerator}) / (${draft.denominator}) × ${draft.multiplier}%`;
  const sampleResult = (formulaTerm(draft.numerator, 100, 5) / (formulaTerm(draft.denominator, 100, 5) || 1)) * Number(draft.multiplier || 0);
  return <section className="panel formula-panel"><div className="panel-heading"><div><h2>Pengaturan rumus ABJ</h2><p>Perubahan rumus akan digunakan pada form, ringkasan, riwayat, dan ekspor.</p></div><span className="current-setting">Tersimpan di browser ini</span></div><div className="formula-definition"><div className="formula-equation"><i>ABJ</i> = <span className="fraction"><b>{draft.numerator}</b><b>{draft.denominator}</b></span> × {draft.multiplier}%</div><p><b>A</b> = jumlah rumah/bangunan yang diperiksa</p><p><b>B</b> = jumlah rumah/bangunan yang ditemukan jentik</p><p><b>A − B</b> = jumlah rumah/bangunan yang bebas jentik</p></div><div className="formula-controls"><label>Pembilang<select value={draft.numerator} onChange={e => setDraft(v => ({ ...v, numerator: e.target.value }))}><option value="A - B">A − B (rumah negatif)</option><option value="A">A (rumah diperiksa)</option><option value="B">B (rumah positif)</option></select></label><span className="formula-divider">÷</span><label>Penyebut<select value={draft.denominator} onChange={e => setDraft(v => ({ ...v, denominator: e.target.value }))}><option value="A">A (rumah diperiksa)</option><option value="B">B (rumah positif)</option></select></label><span className="formula-divider">×</span><label>Pengali (%)<input type="number" min="1" max="10000" value={draft.multiplier} onChange={e => setDraft(v => ({ ...v, multiplier: e.target.value }))}/></label></div><div className="formula-preview"><span>Pratinjau rumus</span><b>{preview}</b><small>Contoh: A = 100 dan B = 5 menghasilkan {sampleResult.toFixed(1)}%.</small></div><div className="formula-actions"><button className="secondary-button" onClick={() => setDraft(defaultFormula)}>Kembalikan default</button><button className="primary-button" onClick={() => { const multiplier = Number(draft.multiplier); if (!Number.isFinite(multiplier) || multiplier <= 0) return; onSave({ ...draft, multiplier }); }}>Simpan rumus</button></div><p className="prototype-warning">Default: ABJ = (A − B) / A × 100%. Pada prototype, pilihan rumus dibatasi ke kombinasi A dan B yang tersedia, tanpa menjalankan ekspresi bebas.</p></section>;
}

function DusunModal({ initialName, existing, onClose, onSave }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="dusun-title"><div className="modal-head"><div><span className="eyebrow">MASTER DATA</span><h2 id="dusun-title">{initialName ? 'Ubah nama dusun' : 'Tambah dusun'}</h2></div><button className="close-button" onClick={onClose} aria-label="Tutup">×</button></div><form onSubmit={e => { e.preventDefault(); const clean = name.trim(); if (existing.some(d => d.toLowerCase() === clean.toLowerCase() && d !== initialName)) { setError('Nama dusun tersebut sudah ada.'); return; } onSave(clean); }}><label>Nama dusun<input required maxLength="80" value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Masukkan nama dusun" /></label>{error && <div className="form-error" role="alert">{error}</div>}<p className="prototype-warning">Menghapus atau mengganti nama dusun tidak mengubah nama dusun pada laporan yang sudah tersimpan.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button">Simpan dusun</button></div></form></section></div>;
}

function ReportModal({ dusuns, formula, onClose, onSave }) {
  const [form, setForm] = useState({ dusun: '', surveyor: '', examined: '', positive: '', tubs: '', tubsPositive: '', lat: '', lng: '' });
  const [photo, setPhoto] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const score = form.examined > 0 ? abj({ examined: Number(form.examined), positive: Number(form.positive) || 0 }, formula) : null;
  const locate = () => { if (!navigator.geolocation) { setError('Perangkat tidak mendukung lokasi.'); return; } navigator.geolocation.getCurrentPosition(pos => { change('lat', pos.coords.latitude.toFixed(6)); change('lng', pos.coords.longitude.toFixed(6)); setError(''); }, () => setError('Lokasi tidak tersedia. Pastikan izin lokasi diberikan.'), { enableHighAccuracy: true, timeout: 12000 }); };
  const pickPhoto = async file => { if (!file) return; setBusy(true); setError(''); try { setPhoto(await compressToBase64(file)); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const submit = e => { e.preventDefault(); const examined = Number(form.examined); const positive = Number(form.positive); if (!form.dusun || !form.surveyor || examined < 1 || positive > examined) { setError('Periksa kembali isian. Rumah positif tidak boleh melebihi rumah diperiksa.'); return; } onSave({ ...form, id: crypto.randomUUID(), examined, positive, tubs: Number(form.tubs || 0), tubsPositive: Number(form.tubsPositive || 0), photo, date: new Date().toISOString().slice(0, 10), time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }); };
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><div className="modal-head"><div><span className="eyebrow">FORM PEMERIKSAAN</span><h2 id="report-title">Input laporan PJB</h2></div><button className="close-button" onClick={onClose} aria-label="Tutup">×</button></div><form onSubmit={submit}><div className="form-grid"><label>Dusun<select required value={form.dusun} onChange={e => change('dusun', e.target.value)}><option value="">Pilih dusun</option>{dusuns.map(d => <option key={d}>{d}</option>)}</select></label><label>Nama surveyor<input required value={form.surveyor} onChange={e => change('surveyor', e.target.value)} placeholder="Nama lengkap" /></label><label>Rumah diperiksa<input type="number" min="1" required value={form.examined} onChange={e => change('examined', e.target.value)} placeholder="0" /></label><label>Rumah positif<input type="number" min="0" required value={form.positive} onChange={e => change('positive', e.target.value)} placeholder="0" /></label><label>Bak diperiksa<input type="number" min="0" value={form.tubs} onChange={e => change('tubs', e.target.value)} placeholder="0" /></label><label>Bak positif<input type="number" min="0" value={form.tubsPositive} onChange={e => change('tubsPositive', e.target.value)} placeholder="0" /></label></div>{score !== null && <div className={`live-abj ${score < 95 ? 'low' : ''}`}><span>ABJ laporan ini</span><b>{score.toFixed(1)}%</b><small>{score >= 95 ? 'Di atas target acuan 95%' : 'Di bawah target acuan 95%'}</small></div>}<div className="form-section"><b>Koordinat lokasi <span className="optional">Opsional</span></b><p>Simpan koordinat surveyor saat mengisi laporan. Koordinat dapat dibuka di peta.</p><div className="coordinate-row"><label>Latitude<input value={form.lat} onChange={e => change('lat', e.target.value)} placeholder="Contoh: -7.704120" /></label><label>Longitude<input value={form.lng} onChange={e => change('lng', e.target.value)} placeholder="Contoh: 110.623810" /></label><button type="button" className="secondary-button gps-button" onClick={locate}>Ambil GPS saat ini</button></div>{form.lat && form.lng && <a className="map-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}>Periksa titik di Google Maps ↗</a>}</div><div className="form-section"><b>Foto bukti <span className="optional">Opsional · maks 5 MB</span></b><p>Foto dikompres dan diubah ke Base64 untuk rancangan penyimpanan Firestore.</p><label className="upload-box">{photo ? <img src={photo} alt="Pratinjau bukti pemeriksaan" /> : <><span className="upload-plus">＋</span><span>Pilih foto dari perangkat</span><small>JPG, PNG atau WEBP · ukuran awal maksimal 5 MB</small></>}<input type="file" accept="image/*" onChange={e => pickPhoto(e.target.files?.[0])} /></label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" disabled={busy}>{busy ? 'Memproses foto…' : 'Simpan laporan'}</button></div></form></section></div>;
}

function UserModal({ roles, dusuns, onClose, onSave }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState(roles[roles.length - 1]); const [dusun, setDusun] = useState('');
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="user-title"><div className="modal-head"><div><span className="eyebrow">AKSES APLIKASI</span><h2 id="user-title">Tambah pengguna</h2></div><button className="close-button" onClick={onClose} aria-label="Tutup">×</button></div><form onSubmit={e => { e.preventDefault(); onSave({ name, email, role, dusun: role === 'Surveyor' ? dusun : 'Semua dusun', active: true }); }}><label>Nama lengkap<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Peran<select value={role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r}>{r}</option>)}</select></label>{role === 'Surveyor' && <label>Dusun tugas<select required value={dusun} onChange={e => setDusun(e.target.value)}><option value="">Pilih dusun</option>{dusuns.map(d => <option key={d}>{d}</option>)}</select></label>}<p className="prototype-warning">Penambahan ini hanya tersimpan di prototype lokal. Pembuatan akun Firebase Authentication memerlukan konfigurasi admin yang aman.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button">Tambah pengguna</button></div></form></section></div>;
}
