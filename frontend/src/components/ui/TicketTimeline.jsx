import React from 'react';
import { STATUS_LABELS, formatDate } from '../../constants';

const DOT = {
  pending: 'bg-red-500',
  in_progress: 'bg-amber-500',
  resolved: 'bg-emerald-500',
};

/** Garis waktu perubahan status tiket. */
export default function TicketTimeline({ histories = [] }) {
  if (!histories.length) {
    return <p className="text-xs text-gray-400">Belum ada riwayat perubahan status.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l-2 border-gray-200 pl-5">
      {histories.map((h) => (
        <li key={h.id} className="relative">
          <span
            className={`absolute -left-[27px] top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${DOT[h.to_status] || 'bg-gray-400'}`}
          />
          <p className="text-sm font-semibold text-gray-900">
            {h.from_status ? `${STATUS_LABELS[h.from_status] || h.from_status} → ` : ''}
            {STATUS_LABELS[h.to_status] || h.to_status}
          </p>
          <p className="text-xs text-gray-500">
            {formatDate(h.created_at)}
            {h.actor?.name ? ` · oleh ${h.actor.name}` : ''}
          </p>
          {h.note && <p className="mt-0.5 text-xs italic text-gray-600">“{h.note}”</p>}
        </li>
      ))}
    </ol>
  );
}
