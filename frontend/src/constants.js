export const API_BASE_URL = 'http://localhost:8001';

export const STORAGE_URL = `${API_BASE_URL}/storage`;

export const CATEGORIES = [
  'Elektronik / Proyektor',
  'Kelistrikan',
  'Pipa / Air',
  'Furniture / Meubeler',
];

export const STATUS_LABELS = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
