import React from 'react';
import { AlarmClock, CircleCheck } from 'lucide-react';
import { getSLAStatus } from '../../utils/helpers';

const TONES = {
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  slate: 'bg-gray-100 text-gray-600',
  emerald: 'bg-emerald-100 text-emerald-700',
};

export default function SLABadge({ ticket }) {
  if (!ticket) return null;
  const sla = getSLAStatus(ticket);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[sla.tone]}`}>
      {sla.key === 'done' ? <CircleCheck size={13} /> : <AlarmClock size={13} />}
      {sla.label}
    </span>
  );
}
