import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ImagePlus, X, SendHorizonal, TriangleAlert, ThumbsUp, QrCode } from 'lucide-react';
import { tickets } from '../api';
import { CATEGORIES, ROOMS, OTHER_LOCATION, STATUS_LABELS } from '../constants';
import { isDuplicateReport, detectPriority, compressImage } from '../utils/helpers';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';

const inputClasses =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15';

export default function ReportForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ location: '', category: '', description: '' });
  const [room, setRoom] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState([]);
  const [supporting, setSupporting] = useState(null);
  const [ackDifferent, setAckDifferent] = useState(false);
  const [searchParams] = useSearchParams();
  const [scanOpen, setScanOpen] = useState(false);
  const videoRef = useRef(null);
  const scanTimer = useRef(null);

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      const match = ROOMS.find((r) => r.toLowerCase() === roomParam.toLowerCase());
      if (match) setRoom(match);
      else { setRoom(OTHER_LOCATION); setForm((p) => ({ ...p, location: roomParam })); }
      toast.success?.(`Lokasi terisi dari QR: ${roomParam}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    tickets
      .active()
      .then((res) => setActive(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const currentLocation = room === OTHER_LOCATION ? form.location : room;

  // Laporan aktif lain dengan lokasi + kategori persis sama (maks 14 hari terakhir).
  const duplicates = useMemo(() => {
    if (!currentLocation.trim() || !form.category) return [];
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return active.filter(
      (t) =>
        new Date(t.created_at).getTime() >= cutoff &&
        isDuplicateReport({ location: currentLocation, category: form.category }, t)
    );
  }, [active, currentLocation, form.category]);

  // Konfirmasi "masalah berbeda" harus diulang tiap ganti lokasi/kategori.
  useEffect(() => {
    setAckDifferent(false);
  }, [currentLocation, form.category]);

  const handleSupport = async (id) => {
    setSupporting(id);
    try {
      const res = await tickets.support(id);
      setActive((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, supported_by_me: true, supports_count: res.data.supports_count }
            : t
        )
      );
      toast.success('Dukungan tercatat. Anda tidak perlu membuat laporan baru');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mendukung laporan');
    } finally {
      setSupporting(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus gambar JPG/PNG'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Foto maksimal 5 MB'); return; }
    const compressed = await compressImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const stopScan = () => {
    if (scanTimer.current) clearInterval(scanTimer.current);
    const stream = videoRef.current?.srcObject;
    stream?.getTracks()?.forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startScan = async () => {
    setScanOpen(true);
    try {
      if (!('BarcodeDetector' in window)) { toast.error('Browser tidak mendukung scan kamera. Gunakan QR berupa link.'); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      await videoRef.current?.play?.();
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scanTimer.current = setInterval(async () => {
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes?.[0]?.rawValue;
          if (raw) {
            let roomName = raw;
            try {
              const u = new URL(raw);
              roomName = u.searchParams.get('room') || raw;
            } catch {}
            const match = ROOMS.find((r) => r.toLowerCase() === String(roomName).toLowerCase());
            if (match) setRoom(match);
            else { setRoom(OTHER_LOCATION); setForm((p) => ({ ...p, location: String(roomName) })); }
            toast.success(`QR terbaca: ${roomName}`);
            stopScan(); setScanOpen(false);
          }
        } catch {}
      }, 500);
    } catch { toast.error('Tidak bisa akses kamera'); }
  };

  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentLocation.trim() || !form.category || !form.description.trim()) {
      toast.error('Lengkapi lokasi, kategori, dan deskripsi terlebih dahulu');
      return;
    }
    if (duplicates.length > 0 && !ackDifferent) {
      toast.error('Centang konfirmasi bahwa ini masalah berbeda, atau dukung laporan yang ada');
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('location', currentLocation.trim());
    formData.append('category', form.category);
    formData.append('description', form.description.trim());
    // Prioritas ditentukan otomatis oleh sistem dari isi laporan.
    formData.append('priority', detectPriority(`${currentLocation} ${form.description}`));
    if (photo) formData.append('photo', photo);

    try {
      await tickets.create(formData);
      toast.success('Laporan berhasil dikirim ke tim sarpras');
      navigate('/my-reports');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengirim laporan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Laporkan Kerusakan"
        subtitle="Isi detail di bawah ini agar teknisi bisa langsung menuju lokasi"
      />

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-gray-700">
              Lokasi / Ruangan <span className="text-red-600">*</span>
            </label>
            <div className="mb-2 flex gap-2">
              <button type="button" onClick={startScan} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                <QrCode size={14} /> Scan QR Ruangan
              </button>
            </div>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className={inputClasses}
            >
              <option value="">Pilih lokasi</option>
              {ROOMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value={OTHER_LOCATION}>{OTHER_LOCATION}</option>
            </select>
            {room === OTHER_LOCATION && (
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Tulis nama lokasi, contoh: Kelas 412"
                className={`${inputClasses} mt-2`}
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Kategori Kerusakan <span className="text-red-600">*</span>
            </label>
            <select name="category" value={form.category} onChange={handleChange} className={inputClasses}>
              <option value="">Pilih kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-600/20">
              <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                Laporan serupa sudah ada. Kemungkinan ini masalah yang sama.
              </p>
              <ul className="mt-3 space-y-2">
                {duplicates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-amber-900"
                  >
                    <span className="font-semibold">
                      #{t.id} · {t.location}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium">
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                    <span>· {t.supports_count} dukungan</span>
                    {t.is_mine ? (
                      <span className="font-medium text-gray-500">(laporan Anda)</span>
                    ) : t.supported_by_me ? (
                      <span className="font-medium text-emerald-700">✓ Sudah Anda dukung</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSupport(t.id)}
                        disabled={supporting === t.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                      >
                        <ThumbsUp size={13} />
                        {supporting === t.id ? 'Menyimpan...' : 'Saya juga mengalami ini'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                Dukung laporan yang ada agar tidak duplikat, atau centang di bawah bila ini masalah berbeda lalu kirim laporan baru.
              </p>
              <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-amber-900">
                <input
                  type="checkbox"
                  checked={ackDifferent}
                  onChange={(e) => setAckDifferent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                />
                Saya yakin ini masalah berbeda dari laporan di atas
              </label>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Deskripsi Keluhan <span className="text-red-600">*</span>
              </label>
              <span className="text-xs text-gray-400">{form.description.length}/500</span>
            </div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Contoh: Proyektor tidak mau menyala, lampu indikator berkedip merah..."
              rows="4"
              maxLength={500}
              className={`${inputClasses} resize-none`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Foto Bukti <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            {preview ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200">
                <img src={preview} alt="Pratinjau bukti" className="max-h-72 w-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute right-3 top-3 rounded-lg bg-gray-900/70 p-1.5 text-white transition hover:bg-gray-900"
                >
                  <X size={18} />
                </button>
                <p className="truncate bg-gray-50 px-4 py-2 text-xs text-gray-500">{photo?.name}</p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-red-400 hover:bg-red-50/40">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-input"
                />
                <label htmlFor="photo-input" className="cursor-pointer">
                  <ImagePlus className="mx-auto mb-2 text-gray-400" size={36} />
                  <p className="text-sm font-semibold text-gray-700">Klik untuk mengunggah foto</p>
                  <p className="mt-1 text-xs text-gray-400">JPG / PNG, maks. 5 MB</p>
                </label>
              </div>
            )}
          </div>

          <p className="rounded-lg bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
            Prioritas laporan (Darurat / Mendesak / Ringan) ditentukan otomatis oleh sistem
            dari deskripsi kerusakan dan memengaruhi target waktu penyelesaian.
          </p>

          <button
            type="submit"
            disabled={loading || (duplicates.length > 0 && !ackDifferent)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Spinner size={18} /> : <SendHorizonal size={18} />}
            {loading ? 'Mengirim laporan...' : duplicates.length > 0 && !ackDifferent ? 'Kunci: konfirmasi dulu di atas' : 'Kirim Laporan'}
          </button>
        </div>
      </form>

      <Modal open={scanOpen} onClose={() => { stopScan(); setScanOpen(false); }} title="Scan QR Ruangan">
        <div className="space-y-3">
          <video ref={videoRef} className="h-64 w-full rounded-xl bg-black object-cover" muted playsInline />
          <p className="text-xs text-gray-500">Arahkan kamera ke QR yang ditempel di pintu ruangan. QR berisi link laporan dengan lokasi otomatis.</p>
        </div>
      </Modal>
    </div>
  );
}
