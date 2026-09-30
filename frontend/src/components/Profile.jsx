import React, { useState } from 'react';
import { User, KeyRound } from 'lucide-react';
import { auth } from '../api';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';

const inputClasses = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15';

export default function Profile({ user, setUser }) {
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [changing, setChanging] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nama wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await auth.updateProfile({ name: name.trim() });
      const updated = { ...user, name: res.data.name };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      toast.success('Profil diperbarui');
    } catch { toast.error('Gagal memperbarui profil'); }
    finally { setSaving(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.password.length < 6) { toast.error('Password baru minimal 6 karakter'); return; }
    if (pw.password !== pw.password_confirmation) { toast.error('Konfirmasi password tidak sama'); return; }
    setChanging(true);
    try {
      await auth.changePassword(pw);
      setPw({ current_password: '', password: '', password_confirmation: '' });
      toast.success('Password berhasil diubah');
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mengubah password'); }
    finally { setChanging(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profil Saya" subtitle={isAdmin ? 'Kelola nama tampilan dan password akun' : 'Data akun dikelola admin, Anda hanya bisa ganti password'} />
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-900"><User size={16} /> Data akun</p>
        {isAdmin ? (
        <form onSubmit={saveProfile} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
        </div>
        <button disabled={saving} className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {saving ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
        </form>
        ) : (
        <div className="space-y-3 text-sm">
          <div><p className="text-xs text-gray-400">Nama</p><p className="font-semibold text-gray-900">{user?.name}</p></div>
          <p className="rounded-lg bg-gray-50 px-4 py-2.5 text-xs text-gray-500">Data nama & NIM hanya bisa diubah oleh admin sarpras. Hubungi admin bila ada kesalahan data.</p>
        </div>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm">
          <div><p className="text-xs text-gray-400">NIM / NIP</p><p className="font-semibold">{user?.nim_nip}</p></div>
          <div><p className="text-xs text-gray-400">Peran</p><p className="font-semibold capitalize">{user?.role === 'admin' ? 'Admin' : 'Mahasiswa'}</p></div>
          {user?.role !== 'admin' && (
            <>
              <div><p className="text-xs text-gray-400">Program Studi</p><p className="font-semibold">{user?.prodi || '-'}</p></div>
              <div><p className="text-xs text-gray-400">Angkatan</p><p className="font-semibold">{user?.angkatan || '-'}</p></div>
            </>
          )}
        </div>
      </div>
      <form onSubmit={changePw} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-900"><KeyRound size={16} /> Ganti password</p>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password lama</label>
          <input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} className={inputClasses} autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password baru</label>
            <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} className={inputClasses} autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Konfirmasi</label>
            <input type="password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} className={inputClasses} autoComplete="new-password" />
          </div>
        </div>
        <button disabled={changing} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
          {changing && <Spinner size={16} />} Ubah Password
        </button>
      </form>
    </div>
  );
}
