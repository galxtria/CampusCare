export const API_BASE_URL = 'http://localhost:8001';

export const STORAGE_URL = `${API_BASE_URL}/storage`;

export const CATEGORIES = [
  'Elektronik / Proyektor',
  'Kelistrikan',
  'Pipa / Air',
  'Furniture / Meubeler',
];

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
