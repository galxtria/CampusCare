import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, KeyRound, User, GraduationCap, ShieldCheck, Search } from 'lucide-react';
import { users } from '../api';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';

const inputClasses =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15';

const emptyForm = { name: '', nim_nip: '', password: '' };

export default function UserManagement({ currentUser }) {
  const toast = useToast();
  const [tab, setTab] = useState('mahasiswa');
  const [data, setData] = useState([]);
  const [siakad, setSiakad] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [u, s] = await Promise.all([users.list(), users.siakadStudents()]);
      setData(Array.isArray(u.data) ? u.data : []);
      setSiakad(Array.isArray(s.data) ? s.data : []);
    } catch {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((u) => u.role === 'user')
      .filter((u) => !q || `${u.name} ${u.nim_nip} ${u.prodi || ''}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search]);

  const admins = useMemo(() => data.filter((u) => u.role === 'admin'), [data]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, nim_nip: u.nim_nip, password: '' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.nim_nip.trim()) {
      toast.error('Nama dan NIP wajib diisi');
      return;
    }
    if (!editing && !form.password) {
      toast.error('Password wajib diisi untuk akun baru');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const payload = { name: form.name.trim(), nim_nip: form.nim_nip.trim(), role: 'admin' };
        if (form.password) payload.password = form.password;
        await users.update(editing.id, payload);
        toast.success('Akun admin diperbarui');
      } else {
        await users.create({ name: form.name.trim(), nim_nip: form.nim_nip.trim(), password: form.password, role: 'admin' });
        toast.success('Akun admin baru dibuat');
      }
      setModalOpen(false);
      setLoading(true);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan akun');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await users.delete(pendingDelete.id);
      setData((prev) => prev.filter((u) => u.id !== pendingDelete.id));
      toast.success('Akun berhasil dihapus');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus akun');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat data pengguna...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Kelola Pengguna"
        subtitle="Mahasiswa dari Sistem Akademik (read-only) · Admin dikelola manual"
        action={
          tab === 'admin' ? (
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700">
              <Plus size={17} /> Admin Baru
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('mahasiswa')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${tab === 'mahasiswa' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <GraduationCap size={15} /> Mahasiswa · {students.length}
        </button>
        <button onClick={() => setTab('admin')} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${tab === 'admin' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <ShieldCheck size={15} /> Admin · {admins.length}
        </button>
      </div>

      {tab === 'mahasiswa' ? (
        <>
          <div className="mb-4 rounded-xl bg-sky-50 p-4 text-xs text-sky-900 ring-1 ring-inset ring-sky-600/20">
            Data mahasiswa ditarik dari <strong>Sistem Akademik</strong> saat aktivasi akun dan <strong>tidak bisa dibuat, diubah, atau dihapus</strong> dari sini.
            {siakad.length > 0 && <> Total {siakad.length} terdaftar di SIAKAD, {siakad.filter((s) => s.activated).length} sudah aktivasi.</>}
          </div>
          <div className="relative mb-4">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIM, atau prodi..." className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15" />
          </div>
          {students.length === 0 ? (
            <EmptyState title="Belum ada mahasiswa" description="Mahasiswa muncul di sini setelah aktivasi akun dengan NIM SIAKAD." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3 font-semibold">Nama</th>
                      <th className="px-5 py-3 font-semibold">NIM</th>
                      <th className="px-5 py-3 font-semibold">Prodi</th>
                      <th className="px-5 py-3 font-semibold">Angkatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((u) => (
                      <tr key={u.id} className="transition hover:bg-gray-50/70">
                        <td className="px-5 py-3.5"><p className="flex items-center gap-1.5 font-semibold text-gray-900"><User size={14} className="text-gray-400" />{u.name}</p></td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{u.nim_nip}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{u.prodi || '-'}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{u.angkatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Nama</th>
                  <th className="px-5 py-3 font-semibold">NIP</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((u) => (
                  <tr key={u.id} className="transition hover:bg-gray-50/70">
                    <td className="px-5 py-3.5">
                      <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                        <User size={14} className="text-gray-400" />{u.name}
                        {currentUser?.id === u.id && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">Anda</span>}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{u.nim_nip}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} title="Ubah / reset password" className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"><Pencil size={17} /></button>
                        <button onClick={() => setPendingDelete(u)} title="Hapus" disabled={currentUser?.id === u.id} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-30"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah Admin' : 'Admin Baru'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nama</label>
            <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap" className={inputClasses} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">NIP</label>
            <input type="text" value={form.nim_nip} onChange={(e) => setForm((p) => ({ ...p, nim_nip: e.target.value }))} placeholder="NIP admin" className={inputClasses} />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <KeyRound size={14} className="text-gray-400" />
              {editing ? 'Password baru (kosongkan bila tidak diubah)' : 'Password'}
            </label>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={editing ? 'Isi untuk reset password' : 'Minimal 6 karakter'} autoComplete="new-password" className={inputClasses} />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
              {saving && <Spinner size={16} />} Simpan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Hapus akun?"
        message={`Akun admin "${pendingDelete?.name}" akan dihapus permanen.`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
