import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Trash2, Eye, MapPin } from 'lucide-react';
import { tickets } from '../api';
import { CATEGORIES, STORAGE_URL, formatDate, isSameCategory } from '../constants';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import StatusBadge from './ui/StatusBadge';
import PriorityBadge from './ui/PriorityBadge';
import SLABadge from './ui/SLABadge';
import TicketTimeline from './ui/TicketTimeline';
import TicketComments from './ui/TicketComments';
import TicketRating from './ui/TicketRating';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';

const STATUS_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'in_progress', label: 'Diproses' },
  { key: 'resolved', label: 'Selesai' },
];

export default function MyReports() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDetail = async (t) => {
    setSelected(t);
    try {
      const res = await tickets.get(t.id);
      setSelected(res.data);
    } catch {
      // tetap tampilkan data ringkas bila detail gagal dimuat
    }
  };

  useEffect(() => {
    tickets
      .listRaw()
      .then((res) => {
        const d = res.data;
        setData(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
      })
      .catch(() => toast.error('Gagal memuat laporan'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      all: data.length,
      pending: data.filter((t) => t.status === 'pending').length,
      in_progress: data.filter((t) => t.status === 'in_progress').length,
      resolved: data.filter((t) => t.status === 'resolved').length,
    }),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && !isSameCategory(t.category, categoryFilter)) return false;
      if (q && !`${t.location} ${t.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, statusFilter, categoryFilter]);

  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await tickets.delete(pendingDelete.id);
      setData((prev) => prev.filter((t) => t.id !== pendingDelete.id));
      toast.success('Laporan berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus laporan');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat laporan...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Laporan Saya"
        subtitle="Pantau perkembangan setiap laporan yang kamu kirim"
        action={
          <Link
            to="/report/new"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={17} />
            Laporan Baru
          </Link>
        }
      />

      {/* Filter */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari lokasi atau deskripsi..."
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
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === key
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label} · {counts[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar */}
      {filtered.length === 0 ? (
        <EmptyState
          title={data.length === 0 ? 'Belum ada laporan' : 'Tidak ada hasil'}
          description={
            data.length === 0
              ? 'Mulai laporkan kerusakan fasilitas kampus yang kamu temukan.'
              : 'Coba ubah kata kunci atau filter yang dipilih.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Lokasi</th>
                  <th className="px-5 py-3 font-semibold">Kategori</th>
                  <th className="px-5 py-3 font-semibold">Prioritas</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((t) => (
                  <tr key={t.id} className="transition hover:bg-gray-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{t.location}</p>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">{t.description}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{t.category}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-gray-500">{formatDate(t.created_at)}</p>
                      <div className="mt-1"><SLABadge ticket={t} /></div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(t)}
                          title="Lihat detail"
                          className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          onClick={() => setPendingDelete(t)}
                          title="Hapus"
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">Halaman {page} dari {totalPages} · {filtered.length} laporan</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.location} wide>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <PriorityBadge priority={selected.priority} />
              <SLABadge ticket={selected} />
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {selected.category}
              </span>
              {(selected.supports_count || 0) > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {selected.supports_count} dukungan
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={13} />
                {formatDate(selected.created_at)}
              </span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Deskripsi</p>
              <p className="text-sm leading-relaxed text-gray-800">{selected.description}</p>
            </div>
            {selected.photo_path && (
              <img
                src={`${STORAGE_URL}/${selected.photo_path}`}
                alt="Bukti kerusakan"
                className="max-h-80 w-full rounded-xl border border-gray-200 object-cover"
              />
            )}
            <div
              className={`rounded-xl p-4 text-sm ${
                selected.admin_notes ? 'bg-amber-50 ring-1 ring-inset ring-amber-600/20' : 'bg-gray-50'
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Catatan teknisi
              </p>
              <p className="text-gray-800">{selected.admin_notes || 'Belum ada catatan dari tim sarpras.'}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Riwayat penanganan
              </p>
              <TicketTimeline histories={selected.histories} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Diskusi dengan teknisi
              </p>
              <TicketComments ticketId={selected.id} initial={selected.comments || []} />
            </div>
            <TicketRating
              ticket={selected}
              onRated={(updated) => {
                setSelected(updated);
                setData((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
              }}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Hapus laporan?"
        message={`Laporan "${pendingDelete?.location}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
