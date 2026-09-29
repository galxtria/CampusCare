import React, { useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { tickets } from '../../api';
import { useToast } from './Toast';
import { formatDate } from '../../constants';
import Spinner from './Spinner';

/** Diskusi teknisi ↔ pelapor di dalam tiket. */
export default function TicketComments({ ticketId, initial = [], onUpdate }) {
  const toast = useToast();
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    setComments(initial);
  }, [initial]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await tickets.addComment(ticketId, body.trim());
      const next = [...comments, res.data];
      setComments(next);
      setBody('');
      onUpdate?.(next);
    } catch {
      toast.error('Gagal mengirim komentar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="max-h-56 space-y-2.5 overflow-y-auto rounded-xl bg-gray-50 p-3">
        {comments.length === 0 && (
          <p className="text-xs text-gray-400">Belum ada komentar. Mulai diskusi di bawah.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-white p-2.5 text-sm shadow-sm ring-1 ring-gray-100">
            <p className="mb-0.5 flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-gray-900">{c.user?.name || 'Pengguna'}</span>
              <span
                className={`rounded-full px-1.5 py-px font-medium ${
                  c.user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {c.user?.role === 'admin' ? 'Teknisi' : 'Pelapor'}
              </span>
              <span className="text-gray-400">{formatDate(c.created_at)}</span>
            </p>
            <p className="leading-relaxed text-gray-800">{c.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="mt-2 flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis komentar..."
          maxLength={1000}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
          title="Kirim komentar"
        >
          {sending ? <Spinner size={18} /> : <SendHorizonal size={18} />}
        </button>
      </form>
    </div>
  );
}
