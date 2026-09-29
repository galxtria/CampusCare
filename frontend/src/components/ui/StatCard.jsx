import React from 'react';

const TONES = {
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
};

export default function StatCard({ label, value, icon: Icon, tone = 'slate', sub }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`rounded-lg p-2.5 ${TONES[tone] || TONES.slate}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
