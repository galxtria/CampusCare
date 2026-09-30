import { useState, useEffect, useRef } from 'react';

/**
 * Polling otomatis: panggil ulang `fetcher` tiap `intervalMs` agar data
 * selalu terbaru tanpa refresh manual. Lewati saat tab disembunyikan
 * agar hemat resource. Return waktu update terakhir (atau null).
 */
export default function useAutoRefresh(fetcher, intervalMs = 30000) {
  const [updatedAt, setUpdatedAt] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let alive = true;
    const run = async (silent) => {
      try {
        await fetcherRef.current(silent);
        if (alive) setUpdatedAt(new Date());
      } catch {
        // polling gagal diam-diam; coba lagi interval berikutnya
      }
    };
    run(false);
    const t = setInterval(() => {
      if (!document.hidden) run(true);
    }, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  return updatedAt;
}

export const formatTime = (d) =>
  d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
