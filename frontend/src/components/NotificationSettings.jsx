import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { sendNotification, requestNotificationPermission } from '../utils/helpers';
import PageHeader from './ui/PageHeader';

export default function NotificationSettings() {
  const [permitted, setPermitted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermitted(Notification.permission === 'granted');
      setChecked(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermitted(granted);
    if (granted) {
      sendNotification('CampusCare', {
        body: 'Notifikasi berhasil diaktifkan. Anda akan mendapat update status laporan.',
        tag: 'test',
      });
    }
  };

  if (!checked) return null;

  return (
    <div>
      <PageHeader title="Notifikasi" subtitle="Kelola pemberitahuan status laporan" />

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mx-auto max-w-md">
          {permitted ? (
            <div className="rounded-lg bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-600/20">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">Notifikasi Aktif</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    Anda akan menerima notifikasi saat status laporan berubah (Pending → Diproses → Selesai).
                    Pastikan browser dan sistem izin notifikasi sudah aktif.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-inset ring-amber-600/20">
              <div className="flex items-start gap-3">
                <Bell size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Notifikasi Belum Diaktifkan</p>
                  <p className="mt-1 text-sm text-amber-700">
                    Aktifkan notifikasi untuk mendapat update real-time saat laporan Anda diproses.
                  </p>
                  <button
                    onClick={handleRequestPermission}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    <Bell size={16} />
                    Aktifkan Notifikasi
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            <p className="font-semibold mb-2">💡 Tips:</p>
            <ul className="space-y-1">
              <li>• Notifikasi hanya muncul jika browser dalam mode aktif</li>
              <li>• Periksa pengaturan notifikasi sistem operasi Anda</li>
              <li>• Izinkan notifikasi ketika browser meminta</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
