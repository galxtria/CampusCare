import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import { isSameCategory, ROOM_TYPE_KEYWORDS, CATEGORY_ROOM_TYPES } from '../constants';

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

const DARURAT_KEYWORDS = ['korsleting', 'terbakar', 'kebakaran', 'bau gas', 'gas bocor', 'banjir', 'runtuh', 'ambruk', 'roboh', 'tersengat', 'kesetrum', 'kaca pecah', 'pipa pecah', 'bocor besar', 'jebol', 'bahaya', 'meledak', 'ledakan'];
const FUNGSI_KEYWORDS = ['mati', 'rusak', 'bocor', 'mampet', 'mampat', 'tersumbat', 'tidak menyala', 'tidak dingin', 'tidak bisa', 'patah', 'pecah', 'jatuh', 'macet', 'padam', 'rembes'];
const DAMPAK_KEYWORDS = ['semua', 'total', 'seluruh', 'satu ruangan', 'tidak bisa dipakai', 'terganggu', 'menggangu', 'batal', 'darurat'];
const KRITIS_CATEGORIES = ['Korsleting / Listrik Padam', 'Kebocoran Pipa', 'WiFi / Internet', 'CCTV', 'AC / Pendingin Ruangan', 'Komputer Lab', 'Proyektor'];

/** Skoring prioritas berbobot dari kerusakannya (mirror logika backend): { priority, reasons }. */
export const scorePriority = (text = '', category = '') => {
  const t = text.toLowerCase();
  let score = 0;
  const reasons = [];
  for (const k of DARURAT_KEYWORDS) {
    if (t.includes(k)) return { priority: 'darurat', reasons: [`kata kunci bahaya: "${k}"`] };
  }
  for (const k of FUNGSI_KEYWORDS) {
    if (t.includes(k)) { score += 1; reasons.push(`fungsi terganggu: "${k}"`); break; }
  }
  for (const k of DAMPAK_KEYWORDS) {
    if (t.includes(k)) { score += 1; reasons.push(`dampak luas: "${k}"`); break; }
  }
  if (KRITIS_CATEGORIES.includes(category)) { score += 1; reasons.push(`kategori kritis: ${category}`); }
  if (score >= 3) return { priority: 'darurat', reasons: reasons.slice(0, 3) };
  if (score >= 1) return { priority: 'mendesak', reasons: reasons.slice(0, 3) };
  return { priority: 'ringan', reasons: ['kerusakan ringan, tidak mengganggu kegiatan'] };
};

/** Tebak prioritas dari teks (mirip logika backend, untuk hint di form). */
export const detectPriority = (text = '') => scorePriority(text).priority;

export const PRIORITY_SLA_DAYS = { darurat: 1, mendesak: 2, ringan: 3 };

/** Tenggat penyelesaian berdasarkan prioritas. */
export const getSLADeadline = (createdAt, priority = 'ringan') => {
  const days = PRIORITY_SLA_DAYS[priority] ?? 3;
  const d = new Date(createdAt);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Status SLA: { key, label, tone }. Tiket selesai/ditolak selalu terminal. */
export const getSLAStatus = (ticket) => {
  if (!ticket) return { key: 'done', label: 'Selesai', tone: 'emerald' };
  if (ticket.status === 'resolved') return { key: 'done', label: 'Selesai', tone: 'emerald' };
  if (ticket.status === 'rejected') return { key: 'rejected', label: 'Ditolak', tone: 'slate' };
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

/** Tipe ruangan dari namanya; 'other' bila tak dikenali (selalu lolos cek). */
export const detectRoomType = (location = '') => {
  const t = location.toLowerCase();
  for (const [type, keywords] of Object.entries(ROOM_TYPE_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) return type;
  }
  return 'other';
};

/**
 * Cek kecocokan kategori vs ruangan.
 * Return null bila cocok/tak perlu dicek, atau pesan peringatan bila janggal
 * (misal keran di lab komputer). Sengaja peringatan lunak, bukan blokir,
 * karena selalu ada pengecualian di lapangan.
 */
export const checkCategoryRoom = (category, location) => {
  if (!category || !location?.trim()) return null;
  const allowed = CATEGORY_ROOM_TYPES[category];
  if (!allowed) return null;
  const type = detectRoomType(location);
  if (type === 'other' || allowed.includes(type)) return null;
  return `Kategori "${category}" tidak biasa di "${location.trim()}". Periksa kembali ruangan/kategorinya.`;
};
/** Kompres gambar ke max 1280px JPEG 0.8 agar upload ringan. Return File. */
export const compressImage = (file, maxDim = 1280, quality = 0.8) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

export const reportLinkForRoom = (room) =>
  `${window.location.origin}/report/new?room=${encodeURIComponent(room)}`;

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
