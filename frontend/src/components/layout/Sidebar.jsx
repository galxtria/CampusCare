import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  ShieldCheck,
  LogOut,
  X,
  Users,
} from 'lucide-react';
import Logo from '../ui/Logo';

const USER_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/report/new', label: 'Laporkan Kerusakan', icon: FilePlus2 },
  { to: '/my-reports', label: 'Laporan Saya', icon: ClipboardList },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Kelola Tiket', icon: ShieldCheck, end: true },
  { to: '/admin/export', label: 'Export Laporan', icon: FilePlus2 },
  { to: '/admin/qr', label: 'QR Code', icon: FilePlus2 },
  { to: '/admin/users', label: 'Kelola Pengguna', icon: Users },
];

function NavContent({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-red-50 text-red-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <Icon size={19} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ user, onLogout, mobileOpen, onCloseMobile }) {
  const items = user?.role === 'admin' ? ADMIN_NAV : USER_NAV;

  const brand = (
    <div className="flex items-center gap-2.5 px-5">
      <Logo size={40} />
      <div>
        <p className="text-base font-bold leading-tight text-gray-900">CampusCare</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Sarpras Kampus</p>
      </div>
    </div>
  );

  const profile = (
    <div className="border-t border-gray-100 p-4">
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
          {(user?.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
          <p className="truncate text-xs text-gray-500">
            {user?.nim_nip} · {user?.role === 'admin' ? 'Admin' : 'Mahasiswa'}
          </p>
        </div>
        <button
          onClick={onLogout}
          title="Keluar"
          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="py-6">{brand}</div>
        <div className="flex-1 overflow-y-auto pb-4">
          <NavContent items={items} />
        </div>
        {profile}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Tutup menu"
            onClick={onCloseMobile}
            className="absolute inset-0 cursor-default bg-gray-900/50"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between py-5 pr-3">
              {brand}
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-4">
              <NavContent items={items} onNavigate={onCloseMobile} />
            </div>
            {profile}
          </aside>
        </div>
      )}
    </>
  );
}
