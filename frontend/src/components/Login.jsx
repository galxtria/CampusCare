import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, CircleCheck, LogIn } from 'lucide-react';
import Logo from './ui/Logo';
import { auth } from '../api';
import Spinner from './ui/Spinner';

const HIGHLIGHTS = [
  'Laporkan kerusakan fasilitas dalam hitungan menit',
  'Pantau status perbaikan secara real-time',
  'Terhubung langsung dengan tim sarpras kampus',
];

export default function Login({ setUser }) {
  const [form, setForm] = useState({ nim_nip: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomParam = params.get('room') || '';

  useEffect(() => {
    if (roomParam) localStorage.setItem('pendingRoom', roomParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nim_nip.trim() || !form.password) {
      setError('NIM dan password harus diisi');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await auth.login(form.nim_nip.trim(), form.password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      const pending = localStorage.getItem('pendingRoom');
      localStorage.removeItem('pendingRoom');
      navigate(pending ? `/report/new?room=${encodeURIComponent(pending)}` : res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal, periksa koneksi ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Panel branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-red-800 via-red-700 to-red-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Logo size={46} />
          <div>
            <p className="text-xl font-bold">CampusCare</p>
            <p className="text-xs font-medium uppercase tracking-widest text-red-200">
              Sarpras Kampus
            </p>
          </div>
        </div>

        <div>
          <h1 className="max-w-md text-3xl font-bold leading-tight xl:text-4xl">
            Fasilitas rusak? Laporkan dalam hitungan menit.
          </h1>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-red-50">
                <CircleCheck size={20} className="mt-0.5 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-red-200">Tim Sarana &amp; Prasarana · Layanan pelaporan kampus</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size={56} />
          </div>

          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">CampusCare</h2>
          <p className="mt-1 text-center text-sm text-gray-500">
            Masuk dengan akun kampus Anda
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">NIM / NIP</label>
              <input
                type="text"
                name="nim_nip"
                value={form.nim_nip}
                onChange={handleChange}
                placeholder="Masukan NIM"
                autoComplete="username"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-gray-600"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? <Spinner size={18} /> : <LogIn size={18} />}
              {loading ? 'Memeriksa akun...' : 'Masuk'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
            Belum punya akun? Hubungi admin sarpras kampus.
          </p>
        </div>
      </div>
    </div>
  );
}
