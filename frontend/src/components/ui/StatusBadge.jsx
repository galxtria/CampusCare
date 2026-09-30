import React from 'react';
import { STATUS_LABELS } from '../../constants';

const STYLES = {
  pending: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 ring-red-600/20' },
  in_progress: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  resolved: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  rejected: { dot: 'bg-gray-500', pill: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || { dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-600 ring-gray-500/20' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
