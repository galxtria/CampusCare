import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CircleAlert,
  Clock,
  CircleCheck,
  Plus,
  ChevronRight,
  MapPin,
  Megaphone,
  ThumbsUp,
  Siren,
} from 'lucide-react';
import { tickets } from '../api';
import { formatDate } from '../constants';
import { useToast } from './ui/Toast';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import PriorityBadge from './ui/PriorityBadge';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';

export default function Dashboard({ user }) {
  const toast = useToast();
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0 });
  const [recent, setRecent] = useState([]);
  const [reported, setReported] = useState([]);
  const [supporting, setSupporting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tickets
      .list()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setStats({
          pending: data.filter((t) => t.status === 'pending').length,
          in_progress: data.filter((t) => t.status === 'in_progress').length,
          resolved: data.filter((t) => t.status === 'resolved').length,
        });
        setRecent(
          [...data]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
        );
      })
      .catch(() => toast.error('Gagal memuat data dashboard'))
      .finally(() => setLoading(false));

    tickets
      .active()
      .then((res) => setReported(Array.isArray(res.data) ? res.data.slice(0, 6) : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSupport = async (id) => {
    setSupporting(id);
    try {
      const res = await tickets.support(id);
      setReported((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, supported_by_me: true, supports_count: res.data.supports_count }
            : t
        )
      );
      toast.success('Dukungan tercatat, terima kasih!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mendukung laporan');
    } finally {
      setSupporting(null);
    }
  };

  const displayName = user?.name || 'Pengguna';

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Sapaan + CTA */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-red-700 via-red-600 to-red-500 p-6 text-white shadow-sm lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden rounded-xl bg-white/15 p-3 sm:block">
              <Megaphone size={28} />
            </div>
            <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            Halo, {displayName}
          </h1>
              <p className="mt-1 max-w-md text-sm text-red-100">
                Temukan fasilitas rusak? Laporkan dalam hitungan menit dan pantau status
                perbaikannya secara transparan.
              </p>
            </div>
          </div>
          <Link
            to="/report/new"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-red-700 shadow transition hover:bg-red-50"
          >
            <Plus size={18} />
            Laporkan Kerusakan
          </Link>
        </div>
      </div>

      {/* Statistik */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Menunggu" value={stats.pending} icon={CircleAlert} tone="red" sub="Laporan masuk ke sistem" />
        <StatCard label="Diproses" value={stats.in_progress} icon={Clock} tone="amber" sub="Teknisi sedang menangani" />
        <StatCard label="Selesai" value={stats.resolved} icon={CircleCheck} tone="emerald" sub="Fasilitas kembali normal" />
      </div>

      {/* Fasilitas yang sudah/sedang dilaporkan — cegah duplikat */}
      {reported.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200/70 bg-amber-50/50 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200/60 px-5 py-4">
            <Siren size={18} className="text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Fasilitas yang Sudah Dilaporkan
              </h2>
              <p className="text-xs text-gray-500">
                Cek di sini dulu sebelum melapor. Dukung laporan yang ada agar tidak duplikat.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-amber-100">
            {reported.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
                    <MapPin size={15} className="shrink-0 text-gray-400" />
                    {t.location}
                    {t.is_mine && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        Laporan Anda
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate pl-6 text-xs text-gray-500">
                    {t.category} · {formatDate(t.created_at)} · {t.supports_count} dukungan
                  </p>
                </div>
                <StatusBadge status={t.status} />
                {!t.is_mine &&
                  (t.supported_by_me ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-emerald-700">
                      <ThumbsUp size={14} />
                      Didukung
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSupport(t.id)}
                      disabled={supporting === t.id}
                      title="Saya juga mengalami ini"
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                      <ThumbsUp size={14} />
                      {supporting === t.id ? '...' : 'Saya juga'}
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aktivitas terbaru */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Aktivitas Terbaru</h2>
          <Link
            to="/my-reports"
            className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition hover:text-red-700"
          >
            Lihat semua
            <ChevronRight size={16} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada laporan"
              description="Laporan kerusakan yang kamu kirim akan muncul di sini."
              action={
                <Link
                  to="/report/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <Plus size={16} />
                  Buat laporan pertama
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  to="/my-reports"
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
                      <MapPin size={15} className="shrink-0 text-gray-400" />
                      {t.location}
                    </p>
                    <p className="mt-0.5 truncate pl-6 text-xs text-gray-500">
                      {t.category} · {formatDate(t.created_at)}
                    </p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
