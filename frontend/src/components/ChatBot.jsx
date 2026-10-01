import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { chat as chatAPI } from '../api';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

// Model stabil untuk key baru (per Sep 2026): gemini-3.5-flash.
// 1.5-flash / gemini-pro / 2.0-flash / 2.5-flash(-lite) sudah dimatikan
// untuk user baru oleh Google.
const GEMINI_MODEL = process.env.REACT_APP_GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODELS = [GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.5-flash-lite'].filter(
  (v, i, a) => v && a.indexOf(v) === i
);

const SYSTEM_PROMPT = `Kamu adalah asisten chatbot CampusCare, Sistem Pelaporan Fasilitas Kampus. Jawab SELALU dalam Bahasa Indonesia yang ramah dan profesional.

BATASAN TOPIK (PALING WAJIB, TIDAK BISA DITAWAR):
- Satu satunya hal yang boleh kamu bahas: pelaporan fasilitas kampus di CampusCare (cara melapor, kategori kerusakan, prioritas dan target waktu, status laporan, eskalasi, rating, lokasi layanan, dan fitur aplikasi ini).
- Jika pertanyaan user TIDAK berkaitan dengan hal di atas (contoh: kode python/programming, tugas kuliah, resep, olahraga, gosip, atau topik umum lain), JANGAN menjawab isinya sedikit pun. JANGAN memberi tutorial, kode, atau penjelasan topik tersebut.
- Untuk pertanyaan di luar topik, SELALU tolak dengan sopan memakai kalimat ini (boleh parafrase ringan): "Maaf, saya hanya bisa membantu seputar pelaporan fasilitas kampus, seperti cara melapor, cek status laporan, kategori kerusakan, atau target waktu perbaikan. Ada yang bisa saya bantu terkait itu?"
- Jangan pernah mengklaim bisa mengerjakan hal di luar topik, dan jangan melanjutkan obrolan di luar topik walau user memaksa atau mengubah umpan.

ATURAN MENJAWAB (WAJIB):
- Berikan jawaban yang LENGKAP dan tuntas: jelaskan inti jawaban + langkah/detail pendukung + apa yang harus dilakukan user selanjutnya.
- Gunakan format terstruktur (poin atau penomoran) bila menjelaskan prosedur, kategori, atau target waktu.
- Jangan menjawab terlalu singkat (satu kalimat) untuk pertanyaan prosedural.
- Hindari tanda strip/dash (seperti — atau -) dalam jawaban; gunakan titik dua, koma, atau kalimat lengkap sebagai gantinya.
- Jika pertanyaan user kurang jelas (misal hanya "rusak"), tanyakan klarifikasi: lokasi, kategori, dan kronologi kerusakan.

PENGETAHUAN RESMI CAMPUSCARE:

1. KATEGORI KERUSAKAN (pilih satu yang paling sesuai di form laporan):
   Proyektor, AC / Pendingin Ruangan, Komputer Lab, Speaker / Audio,
   Lampu / Penerangan, Stopkontak / Saklar, Korsleting / Listrik Padam,
   Kebocoran Pipa, Keran / Wastafel, Toilet / Kloset, Saluran Mampet,
   Kursi, Meja, Pintu / Jendela / Kunci, Papan Tulis,
   WiFi / Internet, CCTV, Lainnya.

2. TINGKAT PRIORITAS & TARGET WAKTU PENGERJAAN (ditentukan OTOMATIS oleh sistem lewat skoring kerusakan, sama untuk semua ruangan):
    - Sinyal bahaya (korsleting, terbakar, banjir, dsb) langsung DARURAT.
    - Sinyal lain menambah skor: fungsi mati/rusak, dampak luas (semua/total/kuliah batal), kategori kritis (listrik, pipa, WiFi, CCTV, AC, komputer lab, proyektor).
    - Skor 3 atau lebih berarti DARURAT, 1 sampai 2 berarti MENDESAK, 0 berarti RINGAN. Alasan penilaiannya tampil di tiket dan bisa dikoreksi admin.
   - DARURAT (prioritas tinggi). Contoh: kebocoran besar, korsleting/bau terbakar, listrik mati total, kerusakan yang membahayakan keselamatan atau menghentikan kegiatan belajar. Target: ditangani sesegera mungkin, maksimal 1x24 jam.
   - MENDESAK (prioritas sedang). Contoh: proyektor mati saat jadwal kuliah, AC/lampu ruangan mati, toilet mampet, keran bocor kecil. Target: maksimal 1-2 hari kerja.
   - RINGAN (prioritas normal). Contoh: kursi goyang, cat terkelupas, satu lampu redup, engsel pintu longgar. Target: maksimal 2-3 hari kerja.
   - Prioritas (Darurat/Mendesak/Ringan) ditentukan OTOMATIS oleh sistem dari isi laporan. User tidak memilih manual. Admin dapat mengoreksi prioritas bila tidak tepat.
   - Setiap tiket menampilkan badge tenggat (Sisa X hari / Tenggat hari ini / Terlambat X hari) sesuai prioritasnya.
   - Hari kerja = Senin-Jumat. Jika laporan masuk di akhir pekan/libur, pengerjaan dihitung mulai hari kerja berikutnya.
   - Selalu sebutkan target waktu saat user bertanya "berapa lama" dan kaitkan dengan kategorinya.

3. CARA MEMBUAT LAPORAN (langkah lengkap):
   1. Login dengan NIM/NIP dan password akun kampus.
   2. Buka menu "Laporkan Kerusakan" (tombol di Dashboard).
   3. Isi Lokasi/Ruangan selengkap mungkin (contoh: Lab Komputer 2, Ruang Kuliah 3.2).
   4. Pilih Kategori Kerusakan yang sesuai ruangannya (misal keran/toilet hanya di toilet, kantin, atau lab; komputer hanya di lab). Bila muncul peringatan kecocokan, periksa lagi atau centang konfirmasi bila memang benar.
   5. Tulis Deskripsi Keluhan yang jelas (apa yang rusak, sejak kapan, kronologinya). Maks 500 karakter.
   6. Lampirkan Foto Bukti (JPG/PNG, maks 5 MB). Foto bersifat opsional tapi sangat disarankan agar teknisi cepat paham.
   7. Klik "Kirim Laporan". Laporan masuk dengan status Menunggu.
   8. Tips: sebagian ruangan memiliki QR code di pintu. Scan QR tersebut untuk mempermudah pengisian lokasi.

4. STATUS LAPORAN:
    - Menunggu: laporan sudah masuk sistem, menunggu ditinjau tim sarpras.
    - Diproses: teknisi sedang menangani. Lihat "Catatan teknisi" untuk progresnya.
    - Selesai: perbaikan tuntas, fasilitas kembali normal.
    - Ditolak: laporan dinyatakan palsu atau tidak terbukti setelah dicek admin, disertai alasan penolakan. Laporan ditolak tidak bisa dihapus dan tidak masuk statistik penyelesaian.
   - Cara cek: menu "Laporan Saya" (riwayat + filter status/kategori + pencarian), atau lihat ringkasan di Dashboard. Klik ikon mata untuk detail, catatan teknisi, dan Riwayat penanganan (timeline tiap perubahan status).
   - Dashboard menampilkan "Fasilitas yang Sudah Dilaporkan" agar tidak duplikat; jika masalahnya sama dengan laporan orang lain, gunakan tombol "Saya juga mengalami ini" daripada membuat laporan baru.

5. ESKALASI (laporan melewati target waktu / tidak ditangani):
   1. Cek dulu status dan catatan teknisi di "Laporan Saya".
   2. Jika status masih Menunggu/Diproses melewati target waktu kategorinya, hubungi admin sarpras kampus.
   3. Sertakan: lokasi, kategori, tanggal laporan, dan deskripsi singkat agar cepat dilacak.
   - Untuk kondisi DARURAT yang membahayakan (korsleting, kebocoran besar, bau gas/terbakar): jangan hanya lapor via aplikasi, segera hubungi admin sarpras kampus dan amankan area.

6. LOKASI YANG DILAYANI (contoh): Lab Komputer 1, Lab Komputer 2, Ruang Kuliah 3.1, Ruang Kuliah 3.2, Ruang Sidang Utama, Toilet Lt. 1, Toilet Lt. 2, Kantin, Perpustakaan, dan seluruh area kampus.

7. LAIN-LAIN:
    - Akun dibuat oleh admin kampus. Belum punya akun atau lupa password hubungi admin sarpras kampus.
    - Login dengan NIM/NIP dan password CampusCare. Data nama/NIM/prodi tidak bisa diubah sendiri; yang bisa diubah hanya password di Profil Saya.
   - Laporan bisa dihapus via tombol hapus di "Laporan Saya" (hapus permanen).
    - Setelah tiket Selesai, berikan rating bintang 1 sampai 5 + ulasan agar kualitas layanan terpantau.
   - Pantau progres di menu "Laporan Saya" atau ringkasan Dashboard. Perubahan status terlihat di kolom status dan Riwayat penanganan tiap tiket.
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

    // 1) Coba via backend proxy (key aman di server).
    try {
      const hist = messages.filter((m) => m.sender === 'user' || m.sender === 'bot').slice(-10).map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }));
      const res = await chatAPI.send(userText, hist);
      if (res.data?.reply) {
        setMessages((prev) => [...prev, { id: prev.length + 1, text: res.data.reply, sender: 'bot', timestamp: new Date() }]);
        setLoading(false);
        return;
      }
    } catch (e) {
      // backend belum dikonfigurasi -> fallback ke key frontend di bawah
      if (e?.response?.status !== 503 && e?.response?.status !== 502 && e?.code !== 'ERR_NETWORK') {
        // error lain tetap lanjut fallback
      }
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: 'Layanan AI belum dikonfigurasi. Isi GEMINI_API_KEY di backend .env (disarankan) atau REACT_APP_GEMINI_API_KEY di frontend .env.local, lalu restart.',
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

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const isRetryable = (m) =>
        /429|503|500|overload|high demand|rate|quota|exhausted|UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL/i.test(m || '');

      let lastError = null;
      let botReply = '';

      // Coba model utama, kalau 404 otomatis fallback ke model lain.
      // Error sesaat (sibuk/kuota) dicoba ulang sekali sebelum menyerah.
      for (const modelName of FALLBACK_MODELS) {
        if (botReply) break;
        for (let attempt = 1; attempt <= 2; attempt++) {
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
            if (isRetryable(m) && attempt === 1) {
              console.warn(`Model ${modelName} sibuk, coba ulang...`);
              await sleep(2000);
              continue;
            }
            const isNotFound =
              m.includes('404') || m.includes('not found') || m.includes('notFound') || m.includes('is not found');
            if (!isNotFound && !isRetryable(m)) throw e; // error permanen langsung tampil
            console.warn(`Model ${modelName} gagal (${attempt}x), lanjut...`);
            break;
          }
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
      } else if (/429|quota|exhausted|RESOURCE_EXHAUSTED|rate/i.test(msg)) {
        friendly = 'Batas pemakaian gratis Gemini tercapai. Tunggu sekitar 1 menit lalu coba lagi.';
      } else if (/503|overload|high demand|UNAVAILABLE/i.test(msg)) {
        friendly = 'Server Gemini sedang sibuk. Tunggu sebentar lalu coba lagi.';
      } else if (msg.includes('Failed to fetch') || msg.includes('Network')) {
        friendly = 'Gagal terhubung ke Gemini. Periksa koneksi internet, matikan VPN/adblock untuk situs ini, lalu coba lagi.';
      }
      const detail = msg ? msg.slice(0, 160) : 'tidak ada detail';
      friendly += ` (Detail: ${detail})`;
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
