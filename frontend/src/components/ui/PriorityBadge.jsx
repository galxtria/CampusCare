import React from 'react';
import { Flame, Zap, Leaf } from 'lucide-react';
import { PRIORITY_LABELS } from '../../constants';

const TONES = {
  darurat: { cls: 'bg-red-100 text-red-700', Icon: Flame },
  mendesak: { cls: 'bg-amber-100 text-amber-800', Icon: Zap },
  ringan: { cls: 'bg-emerald-100 text-emerald-700', Icon: Leaf },
};

export default function PriorityBadge({ priority = 'ringan' }) {
  const { cls, Icon } = TONES[priority] || TONES.ringan;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <Icon size={13} />
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}
