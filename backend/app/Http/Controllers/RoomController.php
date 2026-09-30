<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoomController extends Controller
{
    /** Daftar ruangan untuk semua user login (dipakai form laporan & QR). */
    public function index(Request $request)
    {
        $rooms = Room::orderBy('name')->get();
        if ($request->get('with_counts')) {
            $rooms->each(fn ($r) => $r->tickets_count = Ticket::where('location', $r->name)->count());
        }
        return $rooms;
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:rooms,name',
        ]);
        return response()->json(Room::create($validated), 201);
    }

    public function update(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }
        $room = Room::findOrFail($id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('rooms')->ignore($room->id)],
        ]);
        $room->update($validated);
        return response()->json($room);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }
        $room = Room::findOrFail($id);
        $used = Ticket::where('location', $room->name)->count();
        if ($used > 0) {
            return response()->json(['message' => "Ruangan dipakai {$used} laporan. Riwayat laporan tetap tersimpan, QR lama jadi tidak auto-fill."], 422);
        }
        $room->delete();
        return response()->json(null, 204);
    }
}
