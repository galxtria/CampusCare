<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\TicketSupport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    public const PRIORITIES = ['ringan', 'mendesak', 'darurat'];

    /** Target penyelesaian (hari) per prioritas. */
    public const PRIORITY_SLA_DAYS = [
        'darurat' => 1,
        'mendesak' => 2,
        'ringan' => 3,
    ];

    /**
     * Tebak prioritas dari teks laporan bila user tidak memilih manual.
     */
    public static function detectPriority(string $text): string
    {
        $t = mb_strtolower($text);

        $darurat = ['korsleting', 'terbakar', 'kebakaran', 'bau gas', 'gas bocor', 'banjir', 'runtuh', 'ambruk', 'roboh', 'mati total', 'padam total', 'tersengat', 'kesetrum', 'kaca pecah', 'bocor besar', 'pipa pecah', 'jebol'];
        foreach ($darurat as $k) {
            if (str_contains($t, $k)) {
                return 'darurat';
            }
        }

        $mendesak = ['mati', 'rusak', 'bocor', 'mampet', 'mampat', 'tersumbat', 'tidak menyala', 'tidak dingin', 'tidak bisa', 'patah', 'pecah', 'jatuh', 'macet', 'padam', 'rembes'];
        foreach ($mendesak as $k) {
            if (str_contains($t, $k)) {
                return 'mendesak';
            }
        }

        return 'ringan';
    }

    protected function logHistory(Ticket $ticket, $actorId, $from, $to, $note = null): void
    {
        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'actor_id' => $actorId,
            'from_status' => $from,
            'to_status' => $to,
            'note' => $note,
        ]);
    }

    /** Samakan format lokasi agar "Kelas 412" == "Ruang 412". */
    public static function normalizeLocation(string $value): string
    {
        $t = mb_strtolower($value);
        $t = preg_replace('/^(ruang|ruangan|kelas|room|r\.?)\s+/u', '', $t);
        $t = preg_replace('/[^a-z0-9]+/u', ' ', $t);
        return trim($t);
    }

    /** Kategori lama disetarakan ke kategori rinci (untuk data lama saja). */
    protected static array $legacyCategoryEquivalents = [
        'Elektronik / Proyektor' => ['Proyektor'],
        'Kelistrikan' => ['Lampu / Penerangan', 'Stopkontak / Saklar', 'Korsleting / Listrik Padam'],
        'Pipa / Air' => ['Kebocoran Pipa', 'Keran / Wastafel', 'Toilet / Kloset', 'Saluran Mampet'],
        'Furniture / Meubeler' => ['Kursi', 'Meja', 'Pintu / Jendela / Kunci', 'Papan Tulis'],
    ];

    public static function isSameCategory(string $a, string $b): bool
    {
        if ($a === $b) {
            return true;
        }
        return in_array($b, self::$legacyCategoryEquivalents[$a] ?? [])
            || in_array($a, self::$legacyCategoryEquivalents[$b] ?? []);
    }

    /**
     * Terapkan perubahan status ke laporan identik lain yang masih aktif
     * (lokasi + kategori persis sama). Mengembalikan jumlah tiket yang ikut.
     */
    protected function cascadeIdentical(Ticket $ticket, string $status, $actorId, ?string $notes, array $excludeIds = []): int
    {
        $siblings = Ticket::where('id', '!=', $ticket->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->whereNotIn('id', $excludeIds)
            ->get()
            ->filter(fn ($t) =>
                self::normalizeLocation($t->location) === self::normalizeLocation($ticket->location)
                && self::isSameCategory($t->category, $ticket->category)
            );

        foreach ($siblings as $sibling) {
            $old = $sibling->status;
            $sibling->status = $status;
            if ($notes !== null) {
                $sibling->admin_notes = $notes;
            }
            $sibling->save();
            $this->logHistory(
                $sibling,
                $actorId,
                $old,
                $status,
                "Otomatis mengikuti tiket #{$ticket->id} (laporan identik)"
            );
        }

        return $siblings->count();
    }
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            return Ticket::with('user')->withCount('supports')->get();
        }
        return $user->tickets()->withCount('supports')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'location' => 'required|string',
            'category' => 'required|string',
            'description' => 'required|string',
            'photo' => 'nullable|image|max:5120',
            'priority' => 'nullable|in:ringan,mendesak,darurat',
        ]);

        $photo_path = null;
        if ($request->hasFile('photo')) {
            $photo_path = $request->file('photo')->store('tickets', 'public');
        }

        $priority = $validated['priority']
            ?? self::detectPriority($validated['location'] . ' ' . $validated['description']);

        $ticket = Ticket::create([
            'user_id' => $request->user()->id,
            'location' => $validated['location'],
            'category' => $validated['category'],
            'description' => $validated['description'],
            'photo_path' => $photo_path,
            'status' => 'pending',
            'priority' => $priority,
        ]);

        $this->logHistory($ticket, $request->user()->id, null, 'pending', 'Laporan dibuat');

        return response()->json($ticket, 201);
    }

    public function show(Request $request, $id)
    {
        $ticket = Ticket::with(['user', 'histories.actor', 'comments.user'])
            ->withCount('supports')
            ->findOrFail($id);
        $user = $request->user();
        if ($user->role !== 'admin' && $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Tidak berhak mengakses tiket ini'], 403);
        }
        return $ticket;
    }

    /**
     * Ringkasan laporan AKTIF (pending/in_progress) untuk semua user
     * yang sudah login. Dipakai mahasiswa untuk cek duplikat sebelum
     * melapor dan untuk dashboard "fasilitas yang sedang dilaporkan".
     * Data identitas pelapor sengaja tidak disertakan.
     */
    public function active(Request $request)
    {
        $user = $request->user();

        $tickets = Ticket::whereIn('status', ['pending', 'in_progress'])
            ->withCount([
                'supports',
                'supports as supported_by_me' => function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                },
            ])
            ->orderByDesc('supports_count')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($t) use ($user) {
                return [
                    'id' => $t->id,
                    'location' => $t->location,
                    'category' => $t->category,
                    'description' => $t->description,
                    'status' => $t->status,
                    'admin_notes' => $t->admin_notes,
                    'created_at' => $t->created_at,
                    'supports_count' => $t->supports_count,
                    'supported_by_me' => $t->supported_by_me > 0,
                    'is_mine' => $t->user_id === $user->id,
                ];
            });

        return response()->json($tickets);
    }

    /** "Saya juga mengalami ini" — dukung laporan orang lain. */
    public function support(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = $request->user();

        if (!in_array($ticket->status, ['pending', 'in_progress'])) {
            return response()->json(['message' => 'Hanya laporan aktif yang bisa didukung'], 422);
        }
        if ($ticket->user_id === $user->id) {
            return response()->json(['message' => 'Ini laporan Anda sendiri'], 422);
        }

        TicketSupport::firstOrCreate([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'supports_count' => $ticket->supports()->count(),
        ]);
    }

    /** Batalkan dukungan. */
    public function unsupport(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);

        TicketSupport::where('ticket_id', $ticket->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'supports_count' => $ticket->supports()->count(),
        ]);
    }

    /** Daftar komentar tiket (pemilik atau admin). */
    public function comments(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = $request->user();
        if ($user->role !== 'admin' && $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Tidak berhak melihat komentar ini'], 403);
        }

        return $ticket->comments()->with('user:id,name,role')->get();
    }

    /** Tambah komentar ke tiket (pemilik atau admin). */
    public function addComment(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = $request->user();
        if ($user->role !== 'admin' && $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Tidak berhak berkomentar di tiket ini'], 403);
        }

        $validated = $request->validate([
            'body' => 'required|string|max:1000',
        ]);

        $comment = $ticket->comments()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        return response()->json($comment->load('user:id,name,role'), 201);
    }

    /** Beri rating kepuasan (pemilik, tiket harus sudah selesai). */
    public function rate(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = $request->user();

        if ($ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Hanya pelapor yang bisa memberi rating'], 403);
        }
        if ($ticket->status !== 'resolved') {
            return response()->json(['message' => 'Rating hanya untuk tiket yang sudah selesai'], 422);
        }

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'rating_review' => 'nullable|string|max:500',
        ]);

        $ticket->rating = $validated['rating'];
        $ticket->rating_review = $validated['rating_review'] ?? null;
        $ticket->save();

        return response()->json($ticket);
    }

    /**
     * Insight operasional untuk admin: sebaran status/kategori/prioritas,
     * rata-rata waktu penyelesaian, laporan terlambat, lokasi teratas,
     * dan tren 14 hari terakhir.
     */
    public function stats(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }

        $byStatus = Ticket::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')->pluck('total', 'status');
        $byCategory = Ticket::select('category', DB::raw('count(*) as total'))
            ->groupBy('category')->orderByDesc('total')->get();
        $byPriority = Ticket::select('priority', DB::raw('count(*) as total'))
            ->groupBy('priority')->pluck('total', 'priority');

        $resolved = Ticket::where('status', 'resolved')->get(['created_at', 'updated_at']);
        $avgHours = $resolved->isNotEmpty()
            ? round($resolved->avg(fn ($t) => $t->created_at->diffInMinutes($t->updated_at) / 60), 1)
            : 0;

        $now = Carbon::now();
        $overdue = Ticket::whereIn('status', ['pending', 'in_progress'])->get()
            ->filter(function ($t) use ($now) {
                $days = self::PRIORITY_SLA_DAYS[$t->priority] ?? 3;
                return $now->greaterThan($t->created_at->copy()->addDays($days)->endOfDay());
            })->count();

        $topLocations = Ticket::select('location', DB::raw('count(*) as total'))
            ->groupBy('location')->orderByDesc('total')->limit(5)->get();

        $trend = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = Carbon::today()->subDays($i);
            $trend[] = [
                'date' => $day->format('d M'),
                'total' => Ticket::whereDate('created_at', $day)->count(),
            ];
        }

        return response()->json([
            'total' => Ticket::count(),
            'by_status' => $byStatus,
            'by_category' => $byCategory,
            'by_priority' => $byPriority,
            'avg_resolution_hours' => $avgHours,
            'avg_rating' => round(Ticket::whereNotNull('rating')->avg('rating') ?? 0, 1),
            'rating_count' => Ticket::whereNotNull('rating')->count(),
            'overdue' => $overdue,
            'top_locations' => $topLocations,
            'trend' => $trend,
        ]);
    }

    /**
     * Ubah banyak tiket sekaligus (khusus admin). Dipakai misal untuk
     * menyelesaikan beberapa laporan identik secara berbarengan.
     */
    public function bulkUpdate(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer|exists:tickets,id',
            'status' => 'sometimes|in:pending,in_progress,resolved',
            'admin_notes' => 'nullable|string',
            'priority' => 'sometimes|in:ringan,mendesak,darurat',
        ]);

        $changes = collect($validated)->only(['status', 'admin_notes', 'priority'])->toArray();
        if (empty($changes)) {
            return response()->json(['message' => 'Tidak ada perubahan yang diminta'], 422);
        }

        $updated = 0;
        $tickets = Ticket::whereIn('id', $validated['ids'])->get();
        foreach ($tickets as $ticket) {
            $oldStatus = $ticket->status;
            $ticket->update($changes);
            if (($changes['status'] ?? null) && $changes['status'] !== $oldStatus) {
                $this->logHistory(
                    $ticket,
                    $request->user()->id,
                    $oldStatus,
                    $changes['status'],
                    $changes['admin_notes'] ?? null
                );
                // Laporan identik di luar pilihan ikut berubah otomatis.
                $updated += $this->cascadeIdentical(
                    $ticket,
                    $changes['status'],
                    $request->user()->id,
                    $changes['admin_notes'] ?? null,
                    $validated['ids']
                );
            }
            $updated++;
        }

        return response()->json(['updated' => $updated]);
    }

    public function update(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = $request->user();
        if ($user->role !== 'admin' && $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Tidak berhak mengubah tiket ini'], 403);
        }
        $validated = $request->validate([
            'status' => 'sometimes|in:pending,in_progress,resolved',
            'admin_notes' => 'nullable|string',
            'priority' => 'sometimes|in:ringan,mendesak,darurat',
        ]);

        $oldStatus = $ticket->status;
        $ticket->update($validated);

        if (($validated['status'] ?? null) && $validated['status'] !== $oldStatus) {
            $this->logHistory(
                $ticket,
                $user->id,
                $oldStatus,
                $validated['status'],
                $validated['admin_notes'] ?? null
            );

            // Laporan identik lain yang masih aktif ikut berubah otomatis.
            $followed = $this->cascadeIdentical(
                $ticket,
                $validated['status'],
                $user->id,
                $validated['admin_notes'] ?? null
            );

            return response()->json(array_merge(
                $ticket->toArray(),
                ['auto_followed' => $followed]
            ));
        }

        return response()->json($ticket);
    }

    public function destroy(Request $request, $id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = $request->user();
        if ($user->role !== 'admin' && $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Tidak berhak menghapus tiket ini'], 403);
        }
        $ticket->delete();
        return response()->json(null, 204);
    }
}
