import React from 'react';
import { CircleAlert } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';

export default function ConfirmDialog({
  open,
  title = 'Hapus laporan?',
  message = 'Tindakan ini tidak dapat dibatalkan.',
  confirmLabel = 'Ya, hapus',
  loading = false,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-50 p-2 text-red-600">
          <CircleAlert size={22} />
        </div>
        <p className="pt-1.5 text-sm text-gray-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading && <Spinner size={16} />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
