import React, { useState } from 'react';
import { QrCode, Download, Copy, Printer } from 'lucide-react';
import { generateQRCode, reportLinkForRoom } from '../utils/helpers';
import { ROOMS } from '../constants';
import { useToast } from './ui/Toast';
import PageHeader from './ui/PageHeader';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';

export default function QRGenerator() {
  const toast = useToast();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [qrCode, setQRCode] = useState(null);
  const [qrLink, setQrLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleGenerateQR = async () => {
    if (!selectedRoom) { toast.error('Pilih ruangan terlebih dahulu'); return; }
    setLoading(true);
    const link = reportLinkForRoom(selectedRoom);
    const qr = await generateQRCode(link);
    if (qr) {
      setQRCode(qr);
      setQrLink(link);
      setShowModal(true);
      toast.success('QR code berhasil dibuat');
    } else toast.error('Gagal membuat QR code');
    setLoading(false);
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qr-${selectedRoom.replace(/\s+/g, '-')}.png`;
    link.click();
    toast.success('QR code berhasil diunduh');
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(qrLink); toast.success('Link tersalin'); }
    catch { toast.error('Gagal menyalin'); }
  };

  const downloadAll = async () => {
    setBulkLoading(true);
    try {
      for (const r of ROOMS) {
        const link = reportLinkForRoom(r);
        const qr = await generateQRCode(link);
        if (!qr) continue;
        const a = document.createElement('a');
        a.href = qr;
        a.download = `qr-${r.replace(/\s+/g, '-')}.png`;
        a.click();
        await new Promise((res) => setTimeout(res, 300));
      }
      toast.success(`${ROOMS.length} QR berhasil diunduh`);
    } finally { setBulkLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Generator QR Code" subtitle="Buat QR code ruangan berisi link auto-fill lokasi" />
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mx-auto max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Pilih Ruangan</label>
            <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15">
              <option value="">Pilih ruangan</option>
              {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={handleGenerateQR} disabled={loading || !selectedRoom} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
            {loading ? <Spinner size={18} /> : <QrCode size={18} />} {loading ? 'Membuat QR...' : 'Buat QR Code'}
          </button>
          <button onClick={downloadAll} disabled={bulkLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {bulkLoading ? <Spinner size={18} /> : <Printer size={18} />} {bulkLoading ? 'Mengunduh...' : `Unduh semua (${ROOMS.length} ruangan)`}
          </button>
          <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 ring-1 ring-inset ring-blue-600/20">
            QR berisi link seperti <code>/report/new?room=Lab Komputer 1</code>. Mahasiswa scan lalu lokasi otomatis terisi di form laporan.
          </p>
        </div>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="QR Code Siap">
        {qrCode && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border-2 border-gray-200 bg-white p-4"><img src={qrCode} alt="QR Code" className="h-64 w-64" /></div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{selectedRoom}</p>
              <p className="mt-1 break-all text-xs text-gray-500">{qrLink}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadQR} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"><Download size={17} /> Unduh</button>
              <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold hover:bg-gray-50"><Copy size={17} /> Salin link</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
