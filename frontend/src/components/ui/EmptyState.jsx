import React from 'react';
import { ClipboardList } from 'lucide-react';

export default function EmptyState({ icon: Icon = ClipboardList, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <div className="rounded-full bg-gray-100 p-4 text-gray-400">
        <Icon size={28} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
