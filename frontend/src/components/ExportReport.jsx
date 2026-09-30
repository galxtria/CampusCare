import React, { useState, useEffect, useMemo } from 'react';
import { Download, Calendar, FileSpreadsheet } from 'lucide-react';
import { tickets } from '../api';
import { formatDate, STATUS_LABELS, CATEGORIES } from '../constants';
import { useToast } from './ui/Toast';
import { exportPDF } from '../utils/helpers';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';

export default function ExportReport() {
  const toast = useToast();
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [catF, setCatF] = useState('all');
  const [signer, setSigner] = useState('Kepala Sarpras');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    tickets.listRaw().then((res) => {
      const d = res.data;
      setAllTickets(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
    }).catch(() => toast.error('Gagal memuat data tiket')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    let start = null;
    if (period === 'week') start = new Date(now.getTime() - 7 * 86400000);
    else if (period === 'month') { start = new Date(now); start.setMonth(start.getMonth() - 1); }
    else if (period === 'custom' && dateFrom) start = new Date(dateFrom);
    const end = period === 'custom' && dateTo ? new Date(`${dateTo}T23:59:59`) : now;
    return allTickets.filter((t) => {
      const dt = new Date(t.created_at);
      if (start && dt < start) return false;
      if (dt > end) return false;
      if (statusF !== 'all' && t.status !== statusF) return false;
      if (catF !== 'all' && t.category !== catF) return false;
      return true;
    });
  }, [allTickets, period, dateFrom, dateTo, statusF, catF]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((t) => t.status === 'pending').length,
    in_progress: filtered.filter((t) => t.status === 'in_progress').length,
    resolved: filtered.filter((t) => t.status === 'resolved').length,
  }), [filtered]);

  const periodLabel = period === 'week' ? '7 hari terakhir' : period === 'month' ? '30 hari terakhir' : `${dateFrom || '-'} s.d. ${dateTo || '-'}`;

  const kopHTML = (inner) => `
    <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
      <div style="text-align:center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="margin:0;">CAMPUSCARE</h2>
        <p style="margin:2px 0; font-size:12px;">Sistem Pelaporan Fasilitas Kampus · Tim Sarana &amp; Prasarana</p>
        <p style="margin:2px 0; font-size:12px; color:#555;">Rekap Laporan Periode: ${periodLabel} · Dicetak ${new Date().toLocaleDateString('id-ID')}</p>
      </div>${inner}
      <div style="display:flex; justify-content:flex-end; margin-top:32px;">
        <div style="text-align:center; font-size:13px;">
          <p>Mengetahui,</p><br/><br/><br/>
          <p><strong><u>${signer}</u></strong></p><p>NIP. ............................</p>
        </div>
      </div>
      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;"><p>CampusCare - Sistem Pelaporan Fasilitas Kampus</p></div>
    </div>`;

  const rowsHTML = filtered.map((t) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; font-size: 12px;">${t.location}</td>
        <td style="padding: 10px; font-size: 12px;">${t.category}</td>
        <td style="padding: 10px; font-size: 12px;">${STATUS_LABELS[t.status] || t.status}</td>
        <td style="padding: 10px; font-size: 12px;">${t.priority || '-'}</td>
        <td style="padding: 10px; font-size: 12px;">${formatDate(t.created_at)}</td>
        <td style="padding: 10px; font-size: 12px;">${t.user?.name || 'Tanpa nama'}</td>
      </tr>`).join('');

  const handleExportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        const html = kopHTML(`
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
            <div style="border:1px solid #e5e7eb; padding:12px; border-radius:8px;"><p style="font-size:11px;color:#666;">TOTAL</p><p style="font-size:24px;font-weight:bold;">${stats.total}</p></div>
            <div style="border:1px solid #e5e7eb; padding:12px; border-radius:8px;"><p style="font-size:11px;color:#666;">MENUNGGU</p><p style="font-size:24px;font-weight:bold;color:#dc2626;">${stats.pending}</p></div>
            <div style="border:1px solid #e5e7eb; padding:12px; border-radius:8px;"><p style="font-size:11px;color:#666;">DIPROSES</p><p style="font-size:24px;font-weight:bold;color:#ea580c;">${stats.in_progress}</p></div>
            <div style="border:1px solid #e5e7eb; padding:12px; border-radius:8px;"><p style="font-size:11px;color:#666;">SELESAI</p><p style="font-size:24px;font-weight:bold;color:#059669;">${stats.resolved}</p></div>
          </div>
          <table style="width:100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead><tr style="background:#f3f4f6;"><th style="padding:10px;text-align:left;font-size:12px;">Lokasi</th><th style="padding:10px;text-align:left;font-size:12px;">Kategori</th><th style="padding:10px;text-align:left;font-size:12px;">Status</th><th style="padding:10px;text-align:left;font-size:12px;">Prioritas</th><th style="padding:10px;text-align:left;font-size:12px;">Tanggal</th><th style="padding:10px;text-align:left;font-size:12px;">Pelapor</th></tr></thead>
            <tbody>${rowsHTML}</tbody>
          </table>`);
        exportPDF(html, `campuscare-${period}-${Date.now()}.pdf`);
        toast.success('PDF berhasil diunduh');
      } catch (err) { toast.error('Gagal export PDF'); }
      finally { setExporting(false); }
    }, 100);
  };

  const handleExportCSV = () => {
    const header = ['ID', 'Lokasi', 'Kategori', 'Status', 'Prioritas', 'Tanggal', 'Pelapor', 'NIM', 'Deskripsi'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(';')];
    filtered.forEach((t) => lines.push([t.id, t.location, t.category, t.status, t.priority, t.created_at, t.user?.name, t.user?.nim_nip, t.description].map(esc).join(';')));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `campuscare-${period}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV berhasil diunduh (bisa dibuka di Excel)');
  };

  if (loading) return <div className="flex items-center justify-center gap-2 py-20 text-gray-500"><Spinner size={24} /><span className="text-sm font-medium">Memuat data...</span></div>;

  return (
    <div>
      <PageHeader title="Export Laporan" subtitle="Download rekap tiket PDF / CSV dengan kop dan tanda tangan" />
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mx-auto max-w-xl space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700"><Calendar size={16} className="mb-1 inline-block" /> Periode</label>
            <div className="flex gap-2">
              {[['week', '7 Hari'], ['month', '1 Bulan'], ['custom', 'Custom']].map(([k, l]) => (
                <button key={k} onClick={() => setPeriod(k)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${period === k ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{l}</button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-lg border px-3 py-2.5 text-sm">
              <option value="all">Semua status</option><option value="pending">Menunggu</option><option value="in_progress">Diproses</option><option value="resolved">Selesai</option>
            </select>
            <select value={catF} onChange={(e) => setCatF(e.target.value)} className="rounded-lg border px-3 py-2.5 text-sm">
              <option value="all">Semua kategori</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nama penandatangan</label>
            <input value={signer} onChange={(e) => setSigner(e.target.value)} className="w-full rounded-lg border px-4 py-2.5 text-sm" />
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <p>Total: <strong>{stats.total}</strong> | Menunggu: <strong>{stats.pending}</strong> | Diproses: <strong>{stats.in_progress}</strong> | Selesai: <strong>{stats.resolved}</strong></p>
            <p className="mt-1">Periode: {periodLabel}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportPDF} disabled={exporting || stats.total === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
              {exporting ? <Spinner size={18} /> : <Download size={18} />} PDF + Kop
            </button>
            <button onClick={handleExportCSV} disabled={stats.total === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              <FileSpreadsheet size={18} /> CSV / Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
