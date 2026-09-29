import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  CircleAlert,
  Clock,
  CircleCheck,
  Search,
  Eye,
  User,
  Wrench,
} from 'lucide-react';
import { tickets } from '../api';
import { CATEGORIES, STORAGE_URL, formatDate } from '../constants';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';

const STATUS_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'in_progress', label: 'Diproses' },
  { key: 'resolved', label: 'Selesai' },
];

const STATUS_FLOW = ['pending', 'in_progress', 'resolved'];
const STATUS_ACTION_LABEL = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export default function AdminDashboard() {
  const toast = useToast();
  const [allTickets, setAllTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [chosenStatus, setChosenStatus] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    try {
      const res = await tickets.list();
      setAllTickets(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Gagal memuat data tiket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (ticket) => {
    setSelected(ticket);
    setChosenStatus(ticket.status);
    setAdminNotes(ticket.admin_notes || '');
  };

  const stats = useMemo(
    () => ({
      total: allTickets.length,
      pending: allTickets.filter((t) => t.status === 'pending').length,
      in_progress: allTickets.filter((t) => t.status === 'in_progress').length,
      resolved: allTickets.filter((t) => t.status === 'resolved').length,
    }),
    [allTickets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...allTickets]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (
          q &&
          !`${t.location} ${t.description} ${t.user?.name || ''}`.toLowerCase().includes(q)
        )
          return false;
        return true;
      });
  }, [allTickets, search, statusFilter, categoryFilter]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await tickets.update(selected.id, { status: chosenStatus, admin_notes: adminNotes });
      toast.success(`Tiket ${selected.location} diperbarui`);
      setSelected(null);
      setLoading(true);
      await loadTickets();
    } catch {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat data tiket...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Kelola Tiket"
        subtitle="Tinjau laporan masuk dan kelola status pengerjaannya"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total Laporan" value={stats.total} icon={ClipboardList} tone="slate" sub="Semua tiket masuk" />
        <StatCard label="Menunggu" value={stats.pending} icon={CircleAlert} tone="red" sub="Belum ditangani" />
        <StatCard label="Diproses" value={stats.in_progress} icon={Clock} tone="amber" sub="Sedang dikerjakan" />
        <StatCard label="Selesai" value={stats.resolved} icon={CircleCheck} tone="emerald" sub="Perbaikan tuntas" />
      </div>

      {/* Filter */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari lokasi, deskripsi, atau nama pelapor..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-red-600 focus:outline-none"
          >
            <option value="all">Semua kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_TABS.map(({ key, label }) => {
            const count = key === 'all' ? stats.total : stats[key];
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === key
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabel */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada tiket"
          description="Belum ada laporan yang cocok dengan filter saat ini."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Laporan</th>
                  <th className="px-5 py-3 font-semibold">Pelapor</th>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="transition hover:bg-gray-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{t.location}</p>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                        {t.category} · {t.description}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="flex items-center gap-1.5 font-medium text-gray-700">
                        <User size={14} className="text-gray-400" />
                        {t.user?.name || '-'}
                      </p>
                      <p className="pl-5 text-xs text-gray-400">{t.user?.nim_nip || ''}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-gray-500">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <button
                        onClick={() => openDetail(t)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        <Eye size={14} />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal eksekusi */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Eksekusi Tiket" wide>
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {selected.category}
              </span>
              <span className="text-xs text-gray-400">
                {selected.location} · {formatDate(selected.created_at)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Pelapor</p>
                <p className="text-sm font-semibold text-gray-900">{selected.user?.name || '-'}</p>
                <p className="text-xs text-gray-500">NIM/NIP: {selected.user?.nim_nip || '-'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Deskripsi</p>
                <p className="text-sm leading-relaxed text-gray-800">{selected.description}</p>
              </div>
            </div>

            {selected.photo_path && (
              <img
                src={`${STORAGE_URL}/${selected.photo_path}`}
                alt="Bukti kerusakan"
                className="max-h-80 w-full rounded-xl border border-gray-200 object-cover"
              />
            )}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Wrench size={16} className="text-gray-400" />
                Ubah status pengerjaan
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setChosenStatus(s)}
                    className={`rounded-lg px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
                      chosenStatus === s
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {STATUS_ACTION_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Catatan teknisi
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder='Contoh: Lampu proyektor sudah diganti baru'
                rows="3"
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {saving && <Spinner size={16} />}
                Simpan Perubahan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
