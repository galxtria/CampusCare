import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from '../ui/NotificationBell';

export default function AppLayout({ user, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      <Sidebar
        user={user}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-sm text-gray-500 sm:block">{today}</span>
              <NotificationBell />
              <Link to="/profile" title="Profil saya" className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100">
                <User size={20} />
              </Link>
              <span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20 sm:block">
                {user?.role === 'admin' ? 'Admin Sarpras' : `NIM ${user?.nim_nip}`}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>

        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-gray-400 lg:px-8">
            <span>
              <span className="font-semibold text-gray-500">CampusCare</span> · Sistem Pelaporan
              Fasilitas Kampus
            </span>
            <span>Tim Sarana &amp; Prasarana</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
