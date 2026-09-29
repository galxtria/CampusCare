import React, { useState } from 'react';
import { QrCode, Download } from 'lucide-react';
import { generateQRCode } from '../utils/helpers';
import { ROOMS } from '../constants';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';

export default function QRGenerator() {
  const toast = useToast();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [qrCode, setQRCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleGenerateQR = async () => {
    if (!selectedRoom) {
      toast.error('Pilih ruangan terlebih dahulu');
      return;
    }
    setLoading(true);
    const qr = await generateQRCode(selectedRoom);
    if (qr) {
      setQRCode(qr);
      setShowModal(true);
      toast.success('QR code berhasil dibuat');
    } else {
      toast.error('Gagal membuat QR code');
    }
    setLoading(false);
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qr-${selectedRoom.replace(/\s+/g, '-')}.png`;
    link.click();
    toast.success('QR code berhasil diunduh');
  };

  return (
    <div>
      <PageHeader
        title="Generator QR Code"
        subtitle="Buat QR code ruangan untuk mempermudah pelaporan"
      />

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mx-auto max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Pilih Ruangan
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
            >
              <option value="">Pilih ruangan</option>
              {ROOMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateQR}
            disabled={loading || !selectedRoom}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Spinner size={18} /> : <QrCode size={18} />}
            {loading ? 'Membuat QR...' : 'Buat QR Code'}
          </button>

          <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 ring-1 ring-inset ring-blue-600/20">
            💡 Cetak QR code ini dan tempel di pintu ruangan. Mahasiswa bisa scan untuk auto-fill
            lokasi saat membuat laporan.
          </p>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="QR Code Siap">
        {qrCode && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
              <img src={qrCode} alt="QR Code" className="h-64 w-64" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{selectedRoom}</p>
              <p className="mt-1 text-xs text-gray-500">Scan untuk lapor kerusakan ruangan ini</p>
            </div>
            <button
              onClick={downloadQR}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              <Download size={17} />
              Unduh QR Code
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
