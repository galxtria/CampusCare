import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { rooms } from '../api';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';

const inputClasses = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15';

export default function RoomManagement() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const res = await rooms.list();
      setData(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Gagal memuat data ruangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setName(r.name);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nama ruangan wajib diisi'); return; }
    setSaving(true);
    try {
      if (editing) {
        await rooms.update(editing.id, name.trim());
        toast.success('Ruangan diperbarui');
      } else {
        await rooms.create(name.trim());
        toast.success('Ruangan ditambahkan');
      }
      setModalOpen(false);
      setLoading(true);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan ruangan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await rooms.delete(pendingDelete.id);
      setData((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      toast.success('Ruangan dihapus');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus ruangan');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
        <Spinner size={24} />
        <span className="text-sm font-medium">Memuat data ruangan...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Kelola Ruangan"
        subtitle="Daftar ini dipakai di form laporan dan generator QR"
        action={
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700">
            <Plus size={17} /> Ruangan Baru
          </button>
        }
      />

      {data.length === 0 ? (
        <EmptyState title="Belum ada ruangan" description="Tambahkan ruangan pertama agar bisa dipilih di form laporan." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Nama Ruangan</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r) => (
                  <tr key={r.id} className="transition hover:bg-gray-50/70">
                    <td className="px-5 py-3.5">
                      <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                        <Building2 size={15} className="text-gray-400" />{r.name}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(r)} title="Ubah nama" className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"><Pencil size={17} /></button>
                        <button onClick={() => setPendingDelete(r)} title="Hapus" className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah Ruangan' : 'Ruangan Baru'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nama ruangan</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Lab Komputer 3" maxLength={100} className={inputClasses} />
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
        title="Hapus ruangan?"
        message={`"${pendingDelete?.name}" tidak lagi muncul di form laporan dan QR. Riwayat laporan lama tetap tersimpan.`}
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
