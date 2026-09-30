export const API_BASE_URL = 'http://localhost:8001';

export const STORAGE_URL = `${API_BASE_URL}/storage`;

/** Daftar kategori rinci, satu-per-satu (tanpa pengelompokan). */
export const CATEGORIES = [
  'Proyektor',
  'AC / Pendingin Ruangan',
  'Komputer Lab',
  'Speaker / Audio',
  'Lampu / Penerangan',
  'Stopkontak / Saklar',
  'Korsleting / Listrik Padam',
  'Kebocoran Pipa',
  'Keran / Wastafel',
  'Toilet / Kloset',
  'Saluran Mampet',
  'Kursi',
  'Meja',
  'Pintu / Jendela / Kunci',
  'Papan Tulis',
  'WiFi / Internet',
  'CCTV',
  'Lainnya',
];

/**
 * Nilai kategori lama (sebelum perincian) disetarakan ke kategori rinci
 * agar laporan lama tetap ikut tersaring. Hanya berlaku untuk data lama —
 * laporan baru selalu menyimpan nilai persis dari daftar di atas.
 */
const LEGACY_CATEGORY_EQUIVALENTS = {
  'Elektronik / Proyektor': ['Proyektor'],
  Kelistrikan: ['Lampu / Penerangan', 'Stopkontak / Saklar', 'Korsleting / Listrik Padam'],
  'Pipa / Air': ['Kebocoran Pipa', 'Keran / Wastafel', 'Toilet / Kloset', 'Saluran Mampet'],
  'Furniture / Meubeler': ['Kursi', 'Meja', 'Pintu / Jendela / Kunci', 'Papan Tulis'],
};

/** Dua nilai kategori dianggap sama (persis, atau setara via data lama). */
export const isSameCategory = (a = '', b = '') => {
  if (!a || !b || a === b) return a === b && !!a;
  return (
    (LEGACY_CATEGORY_EQUIVALENTS[a] || []).includes(b) ||
    (LEGACY_CATEGORY_EQUIVALENTS[b] || []).includes(a)
  );
};

export const ROOMS = [
  'Lab Komputer 1',
  'Lab Komputer 2',
  'Ruang Kuliah 3.1',
  'Ruang Kuliah 3.2',
  'Ruang Sidang Utama',
  'Toilet Lt. 1',
  'Toilet Lt. 2',
  'Kantin',
  'Perpustakaan',
  'Kelas 412',
];

export const OTHER_LOCATION = 'Lainnya (tulis manual)';

/** Tipe ruangan dari kata kunci nama (ruangan custom yang tak dikenali = 'other', selalu lolos). */
export const ROOM_TYPE_KEYWORDS = {
  toilet: ['toilet', 'wc', 'kamar mandi'],
  lab: ['lab', 'laboratorium'],
  kelas: ['kelas', 'kuliah', 'ruang belajar'],
  kantin: ['kantin'],
  perpus: ['perpus'],
  sidang: ['sidang', 'rapat', 'aula'],
};

/** Kategori yang hanya wajar di tipe ruangan tertentu (selain ini bebas di mana saja). */
export const CATEGORY_ROOM_TYPES = {
  'Proyektor': ['lab', 'kelas', 'sidang', 'perpus'],
  'Komputer Lab': ['lab'],
  'Papan Tulis': ['lab', 'kelas', 'sidang'],
  'Speaker / Audio': ['lab', 'kelas', 'sidang', 'kantin', 'perpus'],
  'Keran / Wastafel': ['toilet', 'kantin'],
  'Toilet / Kloset': ['toilet'],
  'Saluran Mampet': ['toilet', 'kantin'],
  'AC / Pendingin Ruangan': ['lab', 'kelas', 'sidang', 'perpus', 'kantin'],
};

export const STATUS_LABELS = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export const PRIORITY_LABELS = {
  ringan: 'Ringan',
  mendesak: 'Mendesak',
  darurat: 'Darurat',
};

/** Target penyelesaian (hari) per prioritas. */
export const PRIORITY_SLA_DAYS = {
  darurat: 1,
  mendesak: 2,
  ringan: 3,
};

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
