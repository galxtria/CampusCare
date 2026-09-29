import React, { useState, useEffect } from 'react';
import { Download, Calendar } from 'lucide-react';
import { tickets } from '../api';
import { formatDate, STATUS_LABELS } from '../constants';
import { useToast } from './ui/Toast';
import { exportPDF } from '../utils/helpers';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';

export default function ExportReport() {
  const toast = useToast();
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week'); // week, month
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    tickets
      .list()
      .then((res) => setAllTickets(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Gagal memuat data tiket'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFilteredTickets = () => {
    const now = new Date();
    const startDate =
      period === 'week'
        ? new Date(now.setDate(now.getDate() - 7))
        : new Date(now.setMonth(now.getMonth() - 1));

    return allTickets.filter((t) => new Date(t.created_at) >= startDate);
  };

  const generateHTML = () => {
    const filtered = getFilteredTickets();
    const stats = {
      total: filtered.length,
      pending: filtered.filter((t) => t.status === 'pending').length,
      in_progress: filtered.filter((t) => t.status === 'in_progress').length,
      resolved: filtered.filter((t) => t.status === 'resolved').length,
    };

    const rows = filtered
      .map(
        (t) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-size: 13px;">${t.location}</td>
        <td style="padding: 12px; font-size: 13px;">${t.category}</td>
        <td style="padding: 12px; font-size: 13px;">${STATUS_LABELS[t.status] || t.status}</td>
        <td style="padding: 12px; font-size: 13px;">${formatDate(t.created_at)}</td>
        <td style="padding: 12px; font-size: 13px;">${t.user?.name || 'Tanpa nama'}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h1 style="color: #1f2937; margin-bottom: 8px;">CampusCare - Rekap Laporan</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">
          ${period === 'week' ? '7 hari terakhir' : 'Bulan ini'} · Tanggal: ${new Date().toLocaleDateString('id-ID')}
        </p>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px;">
          <div style="border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">TOTAL LAPORAN</p>
            <p style="font-size: 28px; font-weight: bold; color: #1f2937;">${stats.total}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">MENUNGGU</p>
            <p style="font-size: 28px; font-weight: bold; color: #dc2626;">${stats.pending}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">DIPROSES</p>
            <p style="font-size: 28px; font-weight: bold; color: #ea580c;">${stats.in_progress}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">SELESAI</p>
            <p style="font-size: 28px; font-weight: bold; color: #059669;">${stats.resolved}</p>
          </div>
        </div>

        <h2 style="color: #1f2937; font-size: 16px; margin-bottom: 12px; margin-top: 24px;">Daftar Tiket</h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 13px; color: #374151;">Lokasi</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 13px; color: #374151;">Kategori</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 13px; color: #374151;">Status</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 13px; color: #374151;">Tanggal</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 13px; color: #374151;">Pelapor</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>CampusCare - Sistem Pelaporan Fasilitas Kampus</p>
          <p>Tim Sarana & Prasarana</p>
        </div>
      </div>
    `;
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        exportPDF(generateHTML(), `campuscare-${period}-${Date.now()}.pdf`);
        toast.success('PDF berhasil diunduh');
      } catch (err) {
        toast.error('Gagal export PDF');
        console.error(err);
      } finally {
        setExporting(false);
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat data...</span>
      </div>
    );
  }

  const filtered = getFilteredTickets();
  const stats = {
    total: filtered.length,
    pending: filtered.filter((t) => t.status === 'pending').length,
    in_progress: filtered.filter((t) => t.status === 'in_progress').length,
    resolved: filtered.filter((t) => t.status === 'resolved').length,
  };

  return (
    <div>
      <PageHeader
        title="Export Laporan"
        subtitle="Download rekap tiket dalam format PDF untuk arsip dan analisis"
      />

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mx-auto max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              <Calendar size={16} className="mb-1 inline-block" /> Periode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('week')}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  period === 'week'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  period === 'month'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1 Bulan
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <p className="font-semibold mb-1">📊 Statistik {period === 'week' ? '7 hari' : 'bulan'} ini:</p>
            <p>Total: <strong>{stats.total}</strong> | Menunggu: <strong>{stats.pending}</strong> | Diproses: <strong>{stats.in_progress}</strong> | Selesai: <strong>{stats.resolved}</strong></p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || stats.total === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {exporting ? <Spinner size={18} /> : <Download size={18} />}
            {exporting ? 'Membuat PDF...' : 'Unduh PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
