import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X, SendHorizonal } from 'lucide-react';
import { tickets } from '../api';
import { CATEGORIES } from '../constants';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';

const inputClasses =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15';

export default function ReportForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ location: '', category: '', description: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location.trim() || !form.category || !form.description.trim()) {
      toast.error('Lengkapi lokasi, kategori, dan deskripsi terlebih dahulu');
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('location', form.location.trim());
    formData.append('category', form.category);
    formData.append('description', form.description.trim());
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
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Lokasi / Ruangan <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Contoh: Lab Komputer 2, Ruang Kuliah 3.2"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Kategori Kerusakan <span className="text-red-600">*</span>
            </label>
            <select name="category" value={form.category} onChange={handleChange} className={inputClasses}>
              <option value="">— Pilih kategori —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

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

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Spinner size={18} /> : <SendHorizonal size={18} />}
            {loading ? 'Mengirim laporan...' : 'Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  );
}
