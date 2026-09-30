import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleAlert, CircleCheck, UserPlus, Search } from 'lucide-react';
import Logo from './ui/Logo';
import { auth } from '../api';
import Spinner from './ui/Spinner';

const inputClasses = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15';

export default function Activate({ setUser }) {
  const [params] = useSearchParams();
  const [nim, setNim] = useState(params.get('nim') || '');
  const [mhs, setMhs] = useState(null);
  const [checking, setChecking] = useState(false);
  const [pw, setPw] = useState({ password: '', password_confirmation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheck = async (e) => {
    e?.preventDefault();
    if (!nim.trim()) { setError('Masukkan NIM Anda'); return; }
    setError('');
    setChecking(true);
    setMhs(null);
    try {
      const res = await auth.checkNim(nim.trim());
      if (res.data.activated) {
        setError('NIM ini sudah memiliki akun. Silakan login.');
        return;
      }
      setMhs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'NIM tidak ditemukan');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (params.get('nim')) handleCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mhs) { setError('Cek NIM terlebih dahulu'); return; }
    if (pw.password.length < 6) { setError('Password minimal 6 karakter'); return; }
    if (pw.password !== pw.password_confirmation) { setError('Konfirmasi password tidak sama'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await auth.register({ nim_nip: mhs.nim, password: pw.password, password_confirmation: pw.password_confirmation });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      const pending = localStorage.getItem('pendingRoom');
      localStorage.removeItem('pendingRoom');
      navigate(pending ? `/report/new?room=${encodeURIComponent(pending)}` : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Aktivasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-4 flex justify-center"><Logo size={56} /></div>
        <h2 className="text-center text-2xl font-bold text-gray-900">Aktivasi Akun</h2>
        <p className="mt-1 text-center text-sm text-gray-500">Data mahasiswa ditarik otomatis dari Sistem Akademik. Anda hanya mengatur password CampusCare.</p>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleCheck} className="mt-6 flex gap-2">
          <input value={nim} onChange={(e) => setNim(e.target.value)} placeholder="Contoh: 2401010101" autoComplete="username" className={inputClasses} />
          <button disabled={checking} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {checking ? <Spinner size={16} /> : <Search size={16} />} Cek
          </button>
        </form>

        {mhs && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm ring-1 ring-inset ring-emerald-600/20">
            <p className="flex items-center gap-1.5 font-bold text-emerald-900"><CircleCheck size={16} /> Data ditemukan di SIAKAD</p>
            <p className="mt-2 font-semibold text-gray-900">{mhs.nama}</p>
            <p className="text-xs text-gray-600">NIM {mhs.nim} · {mhs.prodi} · Angkatan {mhs.angkatan}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password CampusCare</label>
            <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} placeholder="Minimal 6 karakter" autoComplete="new-password" className={inputClasses} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Konfirmasi password</label>
            <input type="password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} placeholder="Ulangi password" autoComplete="new-password" className={inputClasses} />
          </div>
          <button type="submit" disabled={loading || !mhs} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
            {loading ? <Spinner size={18} /> : <UserPlus size={18} />} {loading ? 'Mengaktivasi...' : 'Aktifkan & Masuk'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Sudah punya akun? <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">Masuk di sini</Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-400">NIM tidak terdaftar? Hubungi bagian akademik kampus.</p>
      </div>
    </div>
  );
}
