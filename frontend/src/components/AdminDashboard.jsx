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
import { CATEGORIES, STORAGE_URL, formatDate, isSameCategory } from '../constants';
import { isDuplicateReport } from '../utils/helpers';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import PriorityBadge from './ui/PriorityBadge';
import SLABadge from './ui/SLABadge';
import TicketTimeline from './ui/TicketTimeline';
import TicketComments from './ui/TicketComments';
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
  const [chosenPriority, setChosenPriority] = useState('ringan');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [checkedIds, setCheckedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('resolved');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);

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
    tickets
      .stats()
      .then((res) => setInsight(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (ticket) => {
    setSelected(ticket);
    setChosenStatus(ticket.status);
    setChosenPriority(ticket.priority || 'ringan');
    setAdminNotes(ticket.admin_notes || '');
    try {
      const res = await tickets.get(ticket.id);
      setSelected(res.data);
      setChosenStatus(res.data.status);
      setChosenPriority(res.data.priority || 'ringan');
      setAdminNotes(res.data.admin_notes || '');
    } catch {
      // tetap tampilkan data ringkas bila detail gagal dimuat
    }
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
        if (categoryFilter !== 'all' && !isSameCategory(t.category, categoryFilter)) return false;
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
      const res = await tickets.update(selected.id, { status: chosenStatus, admin_notes: adminNotes, priority: chosenPriority });
      const followed = res.data.auto_followed || 0;
      toast.success(
        followed > 0
          ? `Tiket diperbarui. ${followed} laporan identik ikut berubah otomatis`
          : `Tiket ${selected.location} diperbarui`
      );
      setSelected(null);
      setLoading(true);
      await loadTickets();
    } catch {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  /** Tiket aktif lain yang kemungkinan masalah yang sama (info saja). */
  const similarTickets = useMemo(() => {
    if (!selected) return [];
    return allTickets.filter(
      (t) =>
        t.id !== selected.id &&
        t.status !== 'resolved' &&
        isDuplicateReport(selected, t)
    );
  }, [allTickets, selected]);

  const toggleCheck = (id) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCheckAll = () => {
    setCheckedIds((prev) =>
      prev.length === filtered.length ? [] : filtered.map((t) => t.id)
    );
  };

  const handleBulkApply = async () => {
    if (checkedIds.length === 0) return;
    setBulkApplying(true);
    try {
      const res = await tickets.bulkUpdate({
        ids: checkedIds,
        status: bulkStatus,
        admin_notes: bulkNotes.trim() || undefined,
      });
      toast.success(`${res.data.updated} tiket berhasil diperbarui`);
      setCheckedIds([]);
      setBulkNotes('');
      setLoading(true);
      await loadTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menerapkan aksi massal');
    } finally {
      setBulkApplying(false);
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

      {insight && (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Kinerja Penanganan</h3>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between text-gray-600">
                Rata-rata selesai
                <strong className="text-gray-900">
                  {insight.avg_resolution_hours > 0 ? `${insight.avg_resolution_hours} jam` : '-'}
                </strong>
              </p>
              <p className="flex justify-between text-gray-600">
                Melewati target SLA
                <strong className={insight.overdue > 0 ? 'text-red-600' : 'text-gray-900'}>
                  {insight.overdue} tiket
                </strong>
              </p>
              <p className="flex justify-between text-gray-600">
                Darurat aktif
                <strong className="text-gray-900">{insight.by_priority?.darurat || 0} tiket</strong>
              </p>
              <p className="flex justify-between text-gray-600">
                Rating kepuasan
                <strong className="text-gray-900">
                  {insight.rating_count > 0 ? `★ ${insight.avg_rating} (${insight.rating_count})` : '-'}
                </strong>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Lokasi Terbanyak Dilaporkan</h3>
            <div className="space-y-2">
              {(insight.top_locations || []).map((l) => (
                <div key={l.location} className="text-xs">
                  <div className="mb-1 flex justify-between text-gray-600">
                    <span className="truncate font-medium">{l.location}</span>
                    <span className="font-bold text-gray-900">{l.total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{
                        width: `${Math.min(100, (l.total / Math.max(1, insight.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {(insight.top_locations || []).length === 0 && (
                <p className="text-xs text-gray-400">Belum ada data.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Tren 14 Hari Terakhir</h3>
            <div className="flex h-24 items-end gap-1">
              {(insight.trend || []).map((d) => {
                const max = Math.max(1, ...insight.trend.map((x) => x.total));
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.total}`}>
                    <div
                      className="w-full rounded-t bg-red-500/80"
                      style={{ height: `${Math.max(4, (d.total / max) * 80)}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              {(insight.trend || [])[0]?.date} sampai {(insight.trend || []).slice(-1)[0]?.date}
            </p>
          </div>
        </div>
      )}

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

      {/* Aksi massal */}
      {checkedIds.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm lg:flex-row lg:items-center">
          <p className="text-sm font-semibold text-red-900">
            {checkedIds.length} tiket ditandai
          </p>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-red-600 focus:outline-none"
          >
            {STATUS_TABS.filter((s) => s.key !== 'all').map(({ key, label }) => (
              <option key={key} value={key}>
                Ubah ke {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={bulkNotes}
            onChange={(e) => setBulkNotes(e.target.value)}
            placeholder="Catatan untuk semua tiket (opsional)"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBulkApply}
              disabled={bulkApplying}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {bulkApplying ? 'Menerapkan...' : 'Terapkan'}
            </button>
            <button
              onClick={() => setCheckedIds([])}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada tiket"
          description="Belum ada laporan yang cocok dengan filter saat ini."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && checkedIds.length === filtered.length}
                      onChange={toggleCheckAll}
                      title="Tandai semua"
                      className="h-4 w-4 accent-red-600"
                    />
                  </th>
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
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={checkedIds.includes(t.id)}
                        onChange={() => toggleCheck(t.id)}
                        title={`Tandai tiket #${t.id}`}
                        className="h-4 w-4 accent-red-600"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{t.location}</p>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                        {t.category} · {t.description}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1 text-xs">
                        <PriorityBadge priority={t.priority} />
                        {(t.supports_count || 0) > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                            {t.supports_count} dukungan
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="flex items-center gap-1.5 font-medium text-gray-700">
                        <User size={14} className="text-gray-400" />
                        {t.user?.name || 'Tanpa nama'}
                      </p>
                      <p className="pl-5 text-xs text-gray-400">{t.user?.nim_nip || ''}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-gray-500">{formatDate(t.created_at)}</p>
                      <div className="mt-1"><SLABadge ticket={t} /></div>
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
              <PriorityBadge priority={selected.priority} />
              <SLABadge ticket={selected} />
              {selected.rating && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  ★ {selected.rating}/5
                </span>
              )}
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
                <p className="text-sm font-semibold text-gray-900">{selected.user?.name || 'Tanpa nama'}</p>
                <p className="text-xs text-gray-500">NIM/NIP: {selected.user?.nim_nip || 'Tidak ada'}</p>
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
              </p>              <div className="grid grid-cols-3 gap-2">
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

            {similarTickets.length > 0 && (
              <div className="rounded-xl bg-sky-50 p-4 ring-1 ring-inset ring-sky-600/20">
                <p className="mb-2 text-sm font-semibold text-sky-900">
                  Laporan serupa ({similarTickets.length}). Kemungkinan masalah yang sama.
                </p>
                <ul className="space-y-1.5">
                  {similarTickets.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-2 text-xs text-sky-900">
                      <button
                        type="button"
                        onClick={() => openDetail(t)}
                        className="font-bold underline hover:text-sky-700"
                      >
                        #{t.id}
                      </button>
                      <span>{t.user?.name || 'Pelapor'} · {formatDate(t.created_at)}</span>
                      <StatusBadge status={t.status} />
                      {(t.supports_count || 0) > 0 && (
                        <span className="font-medium">{t.supports_count} dukungan</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-sky-700">
                  Tiket di bawah otomatis ikut berubah saat status tiket ini disimpan. Tidak perlu dikerjakan satu per satu.
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700">Prioritas</p>
              <div className="grid grid-cols-3 gap-2">
                {['ringan', 'mendesak', 'darurat'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChosenPriority(p)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition sm:text-sm ${
                      chosenPriority === p
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
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

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Riwayat penanganan
              </p>
              <TicketTimeline histories={selected.histories} />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Diskusi dengan pelapor
              </p>
              <TicketComments ticketId={selected.id} initial={selected.comments || []} />
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
