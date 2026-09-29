import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import { isSameCategory } from '../constants';

/** Normalisasi nama lokasi agar "kelas 412" == "Kelas 412" == "Ruang 412". */
export const normalizeLocation = (value = '') =>
  value
    .toLowerCase()
    .replace(/^(ruang|ruangan|kelas|room|r\.?)\s+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Dua laporan dianggap duplikat hanya bila lokasi SAMA dan kategori PERSIS
 *  sama. Contoh: AC rusak + proyektor rusak di kelas yang sama (selang 1 jam)
 *  adalah DUA laporan berbeda dan tidak saling memicu peringatan. */
export const isDuplicateReport = (a, b) => {
  if (!a || !b || !a.location || !b.location) return false;
  if (!a.category || !b.category) return false;
  if (normalizeLocation(a.location) !== normalizeLocation(b.location)) return false;
  return isSameCategory(a.category, b.category);
};

const DARURAT_KEYWORDS = ['korsleting', 'terbakar', 'kebakaran', 'bau gas', 'gas bocor', 'banjir', 'runtuh', 'ambruk', 'roboh', 'mati total', 'padam total', 'tersengat', 'kesetrum', 'kaca pecah', 'bocor besar', 'pipa pecah', 'jebol'];
const MENDESAK_KEYWORDS = ['mati', 'rusak', 'bocor', 'mampet', 'mampat', 'tersumbat', 'tidak menyala', 'tidak dingin', 'tidak bisa', 'patah', 'pecah', 'jatuh', 'macet', 'padam', 'rembes'];

/** Tebak prioritas dari teks (mirip logika backend, untuk hint di form). */
export const detectPriority = (text = '') => {
  const t = text.toLowerCase();
  if (DARURAT_KEYWORDS.some((k) => t.includes(k))) return 'darurat';
  if (MENDESAK_KEYWORDS.some((k) => t.includes(k))) return 'mendesak';
  return 'ringan';
};

export const PRIORITY_SLA_DAYS = { darurat: 1, mendesak: 2, ringan: 3 };

/** Tenggat penyelesaian berdasarkan prioritas. */
export const getSLADeadline = (createdAt, priority = 'ringan') => {
  const days = PRIORITY_SLA_DAYS[priority] ?? 3;
  const d = new Date(createdAt);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Status SLA: { key, label, tone }. Tiket selesai selalu 'done'. */
export const getSLAStatus = (ticket) => {
  if (!ticket || ticket.status === 'resolved') return { key: 'done', label: 'Selesai', tone: 'emerald' };
  const deadline = getSLADeadline(ticket.created_at, ticket.priority);
  const daysLeft = Math.ceil((deadline - new Date()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return { key: 'overdue', label: `Terlambat ${Math.abs(daysLeft)} hari`, tone: 'red' };
  if (daysLeft === 0) return { key: 'today', label: 'Tenggat hari ini', tone: 'amber' };
  if (daysLeft === 1) return { key: 'soon', label: 'Sisa 1 hari', tone: 'amber' };
  return { key: 'safe', label: `Sisa ${daysLeft} hari`, tone: 'slate' };
};

export const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, { width: 300, margin: 1 });
  } catch (err) {
    console.error('QR generation failed:', err);
    return null;
  }
};

export const exportPDF = (html, filename) => {
  const element = document.createElement('div');
  element.innerHTML = html;
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  };
  html2pdf().set(opt).from(element).save();
};
