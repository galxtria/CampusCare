import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notifications } from '../../api';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const [l, c] = await Promise.all([notifications.list(), notifications.unreadCount()]);
      setItems(Array.isArray(l.data) ? l.data : []);
      setUnread(c.data?.unread || 0);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const markAll = async () => {
    try {
      await notifications.markAllRead();
      setItems((p) => p.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  const openOne = async (n) => {
    if (!n.is_read) {
      try {
        await notifications.markRead(n.id);
        setItems((p) => p.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {}
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); load(); }}
        className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
        title="Notifikasi"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">Notifikasi</p>
            <button onClick={markAll} className="text-xs font-semibold text-red-600 hover:text-red-700">
              Tandai dibaca
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {items.length === 0 && <li className="px-4 py-6 text-center text-xs text-gray-400">Belum ada notifikasi.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => openOne(n)} className={`block w-full px-4 py-3 text-left transition hover:bg-gray-50 ${n.is_read ? '' : 'bg-red-50/50'}`}>
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-gray-400">{new Date(n.created_at).toLocaleString('id-ID')}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
