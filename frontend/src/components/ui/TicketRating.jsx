import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { tickets } from '../../api';
import { useToast } from './Toast';
import Spinner from './Spinner';

/** Input & tampil rating kepuasan (1-5 bintang). */
export default function TicketRating({ ticket, onRated }) {
  const toast = useToast();
  const [stars, setStars] = useState(ticket.rating || 5);
  const [review, setReview] = useState(ticket.rating_review || '');
  const [saving, setSaving] = useState(false);

  if (ticket.status !== 'resolved') return null;

  if (ticket.rating) {
    return (
      <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-600/20">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Rating Anda
        </p>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={18}
              className={s <= ticket.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
            />
          ))}
        </div>
        {ticket.rating_review && (
          <p className="mt-1 text-sm italic text-gray-700">“{ticket.rating_review}”</p>
        )}
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await tickets.rate(ticket.id, stars, review.trim() || null);
      toast.success('Terima kasih atas penilaian Anda!');
      onRated?.(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan rating');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-600/20">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Seberapa puas Anda dengan perbaikan ini?
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setStars(s)} title={`${s} bintang`}>
            <Star
              size={24}
              className={s <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}
            />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Ceritakan pengalaman Anda (opsional)"
        rows={2}
        maxLength={500}
        className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
      >
        {saving && <Spinner size={16} />}
        Kirim Penilaian
      </button>
    </div>
  );
}
