import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

// Model stabil untuk key baru (per Sep 2026): gemini-3.5-flash.
// 1.5-flash / gemini-pro / 2.0-flash / 2.5-flash(-lite) sudah dimatikan
// untuk user baru oleh Google.
const GEMINI_MODEL = process.env.REACT_APP_GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODELS = [GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.5-flash-lite'].filter(
  (v, i, a) => v && a.indexOf(v) === i
);

const SYSTEM_PROMPT = `Kamu adalah asisten chatbot CampusCare, Sistem Pelaporan Fasilitas Kampus. Jawab SELALU dalam Bahasa Indonesia yang ramah dan profesional.

ATURAN MENJAWAB (WAJIB):
- Berikan jawaban yang LENGKAP dan tuntas: jelaskan inti jawaban + langkah/detail pendukung + apa yang harus dilakukan user selanjutnya.
- Gunakan format terstruktur (poin atau penomoran) bila menjelaskan prosedur, kategori, atau target waktu.
- Jangan menjawab terlalu singkat (satu kalimat) untuk pertanyaan prosedural.
- Jika pertanyaan user kurang jelas (misal hanya "rusak"), tanyakan klarifikasi: lokasi, kategori, dan kronologi kerusakan.
- Jika ditanya hal di luar topik CampusCare/fasilitas kampus, jawab singkat lalu arahkan kembali ke topik pelaporan fasilitas.

PENGETAHUAN RESMI CAMPUSCARE:

1. KATEGORI KERUSAKAN (sesuai form laporan):
   - Elektronik / Proyektor (contoh: proyektor mati, tidak tampil, remote hilang, speaker mati)
   - Kelistrikan (contoh: lampu mati, stopkontak rusak, korsleting, listrik padam sebagian)
   - Pipa / Air (contoh: kebocoran, keran rusak, toilet mampet, wastafel tersumbat)
   - Furniture / Meubeler (contoh: kursi patah, meja goyang, pintu rusak, jendela pecah)

2. TINGKAT PRIORITAS & TARGET WAKTU PENGERJAAN (bawaan sistem, paling lama 2-3 hari):
   - DARURAT (prioritas tinggi) — contoh: kebocoran besar, korsleting/bau terbakar, listrik mati total, kerusakan yang membahayakan keselamatan atau menghentikan kegiatan belajar. Target: ditangani sesegera mungkin, maksimal 1x24 jam.
   - MENDESAK (prioritas sedang) — contoh: proyektor mati saat jadwal kuliah, AC/lampu ruangan mati, toilet mampet, keran bocor kecil. Target: maksimal 1-2 hari kerja.
   - RINGAN (prioritas normal) — contoh: kursi goyang, cat terkelupas, satu lampu redup, engsel pintu longgar. Target: maksimal 2-3 hari kerja.
   - Hari kerja = Senin-Jumat. Jika laporan masuk di akhir pekan/libur, pengerjaan dihitung mulai hari kerja berikutnya.
   - Selalu sebutkan target waktu saat user bertanya "berapa lama" dan kaitkan dengan kategorinya.

3. CARA MEMBUAT LAPORAN (langkah lengkap):
   1. Login dengan NIM/NIP dan password akun kampus.
   2. Buka menu "Laporkan Kerusakan" (tombol di Dashboard).
   3. Isi Lokasi/Ruangan selengkap mungkin (contoh: Lab Komputer 2, Ruang Kuliah 3.2).
   4. Pilih Kategori Kerusakan.
   5. Tulis Deskripsi Keluhan yang jelas (apa yang rusak, sejak kapan, kronologinya). Maks 500 karakter.
   6. Lampirkan Foto Bukti (JPG/PNG, maks 5 MB) — opsional tapi sangat disarankan agar teknisi cepat paham.
   7. Klik "Kirim Laporan". Laporan masuk dengan status Menunggu.
   8. Tips: sebagian ruangan memiliki QR code di pintu — scan untuk mempermudah pengisian lokasi.

4. STATUS LAPORAN:
   - Menunggu: laporan sudah masuk sistem, menunggu ditinjau tim sarpras.
   - Diproses: teknisi sedang menangani. Lihat "Catatan teknisi" untuk progresnya.
   - Selesai: perbaikan tuntas, fasilitas kembali normal.
   - Cara cek: menu "Laporan Saya" (riwayat + filter status/kategori + pencarian), atau lihat ringkasan di Dashboard. Klik ikon mata untuk detail dan catatan teknisi.

5. ESKALASI (laporan melewati target waktu / tidak ditangani):
   1. Cek dulu status dan catatan teknisi di "Laporan Saya".
   2. Jika status masih Menunggu/Diproses melewati target waktu kategorinya, hubungi admin sarpras kampus.
   3. Sertakan: lokasi, kategori, tanggal laporan, dan deskripsi singkat agar cepat dilacak.
   - Untuk kondisi DARURAT yang membahayakan (korsleting, kebocoran besar, bau gas/terbakar): jangan hanya lapor via aplikasi, segera hubungi admin sarpras kampus dan amankan area.

6. LOKASI YANG DILAYANI (contoh): Lab Komputer 1, Lab Komputer 2, Ruang Kuliah 3.1, Ruang Kuliah 3.2, Ruang Sidang Utama, Toilet Lt. 1, Toilet Lt. 2, Kantin, Perpustakaan, dan seluruh area kampus.

7. LAIN-LAIN:
   - Belum punya akun / lupa password: hubungi admin sarpras kampus untuk bantuan (akun dibuat oleh admin, tidak ada registrasi mandiri).
   - Laporan bisa dihapus via tombol hapus di "Laporan Saya" (hapus permanen).
   - Notifikasi: aktifkan izin notifikasi browser di menu Notifikasi agar dapat update saat status berubah (Menunggu → Diproses → Selesai).
   - Export rekap PDF dan QR code ruangan adalah fitur khusus admin.`;

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Halo! 👋 Saya asisten CampusCare. Ada yang bisa saya bantu tentang pelaporan fasilitas kampus?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;

    const userMessage = {
      id: messages.length + 1,
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: 'API key Gemini belum dikonfigurasi. Isi REACT_APP_GEMINI_API_KEY di file .env.local dengan key valid (diawali AIza...), lalu restart npm start.',
          sender: 'error',
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      const history = messages
        .filter((m) => m.sender === 'user' || m.sender === 'bot')
        .filter((m, i, arr) => i > 0 || m.sender === 'user')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      let lastError = null;
      let botReply = '';

      // Coba model utama, kalau 404 otomatis fallback ke model lain
      for (const modelName of FALLBACK_MODELS) {
        try {
          // systemInstruction dipasang di getGenerativeModel (bukan di startChat)
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_PROMPT,
          });

          const chat = model.startChat({
            history,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
          });

          const result = await chat.sendMessage(userText);
          botReply = result.response.text();
          break;
        } catch (e) {
          lastError = e;
          const m = e?.message || '';
          const isNotFound =
            m.includes('404') || m.includes('not found') || m.includes('notFound') || m.includes('is not found');
          if (!isNotFound) throw e; // error selain model-not-found langsung tampil
          console.warn(`Model ${modelName} tidak tersedia, coba fallback...`);
        }
      }

      if (!botReply) throw lastError || new Error('Semua model Gemini tidak tersedia');

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: botReply,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Chatbot error:', err);
      let friendly = 'Maaf, terjadi kesalahan. Coba lagi nanti atau hubungi admin.';
      const msg = err?.message || '';
      if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
        friendly = 'API key Gemini tidak valid. Ganti REACT_APP_GEMINI_API_KEY di .env.local dengan key dari https://aistudio.google.com/apikey lalu restart npm start.';
      } else if (msg.includes('404') || msg.includes('not found') || msg.includes('notFound')) {
        friendly = `Semua model (${FALLBACK_MODELS.join(', ')}) tidak ditemukan. Coba REACT_APP_GEMINI_MODEL=gemini-3.5-flash-lite lalu restart npm start.`;
      } else if (msg.includes('Failed to fetch') || msg.includes('Network')) {
        friendly = 'Gagal terhubung ke Gemini. Periksa koneksi internet / VPN / adblock.';
      }
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: friendly,
          sender: 'error',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 hover:scale-110"
          title="Buka chatbot"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-96 w-80 flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-white" />
              <h3 className="font-bold text-white">CampusCare Assistant</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-red-100 transition hover:bg-red-600/50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-red-600 text-white'
                      : msg.sender === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2 text-gray-900">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">Mengetik...</span>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          <div className="border-t border-gray-200 bg-gray-50 p-3 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                placeholder="Tanya sesuatu..."
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
