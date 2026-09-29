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
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            return Ticket::with(['user', 'duplicateOf'])->withCount('supports')->get();
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
        $ticket = Ticket::with(['user', 'duplicateOf', 'histories.actor'])
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

    /**
     * Tandai tiket sebagai duplikat dari tiket utama (khusus admin).
     * Tiket duplikat ikut selesai saat tiket utama diselesaikan.
     */
    public function markDuplicate(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang bisa menggabung duplikat'], 403);
        }

        $validated = $request->validate([
            'duplicate_of' => 'required|integer|exists:tickets,id',
        ]);

        $ticket = Ticket::findOrFail($id);
        $parent = Ticket::findOrFail($validated['duplicate_of']);

        if ($parent->id === $ticket->id) {
            return response()->json(['message' => 'Tidak bisa duplikat dari tiket itu sendiri'], 422);
        }
        // Hindari rantai: selalu tautkan ke tiket utama (root).
        while ($parent->duplicate_of) {
            $parent = Ticket::findOrFail($parent->duplicate_of);
            if ($parent->id === $ticket->id) {
                return response()->json(['message' => 'Terjadi rantai duplikat'], 422);
            }
        }

        $ticket->duplicate_of = $parent->id;
        $ticket->status = 'resolved';
        $note = "Duplikat dari tiket #{$parent->id} ({$parent->location}).";
        $ticket->admin_notes = $ticket->admin_notes
            ? $ticket->admin_notes . "\n" . $note
            : $note;
        $ticket->save();

        $this->logHistory($ticket, $user->id, $ticket->getOriginal('status'), 'resolved', "Digabung sebagai duplikat #{$parent->id}");

        return response()->json($ticket->load('duplicateOf'));
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
            'overdue' => $overdue,
            'top_locations' => $topLocations,
            'trend' => $trend,
        ]);
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
        }

        // Tiket duplikat ikut selesai saat tiket utama diselesaikan.
        if (($validated['status'] ?? null) === 'resolved') {
            Ticket::where('duplicate_of', $ticket->id)
                ->where('status', '!=', 'resolved')
                ->update(['status' => 'resolved']);
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
