import { useEffect } from 'react';
import { tickets } from '../api';
import { STATUS_LABELS } from '../constants';
import { sendNotification } from './helpers';

/**
 * Pantau perubahan status laporan milik user setiap 60 detik.
 * Bila berubah dan izin notifikasi aktif → tampilkan notifikasi browser.
 */
export function useStatusNotifications(user) {
  useEffect(() => {
    if (!user || user.role !== 'user') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const key = `cc_status_${user.id}`;
    let timer = null;

    const check = async () => {
      try {
        const res = await tickets.list();
        const data = Array.isArray(res.data) ? res.data : [];
        const current = {};
        data.forEach((t) => {
          current[t.id] = t.status;
        });

        let prev = {};
        try {
          prev = JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          prev = {};
        }

        // Simpan baseline dulu bila belum ada (tanpa notifikasi).
        if (Object.keys(prev).length === 0) {
          localStorage.setItem(key, JSON.stringify(current));
          return;
        }

        data.forEach((t) => {
          if (prev[t.id] && prev[t.id] !== t.status) {
            sendNotification('CampusCare: status laporan berubah', {
              body: `${t.location} → ${STATUS_LABELS[t.status] || t.status}. Buka Laporan Saya untuk detail.`,
              tag: `ticket-${t.id}-${t.status}`,
            });
          }
        });

        localStorage.setItem(key, JSON.stringify(current));
      } catch {
        // Gagal polling (offline/server mati): abaikan, coba lagi interval berikut.
      }
    };

    check();
    timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [user]);
}
