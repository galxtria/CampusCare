<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            return Ticket::with('user')->get();
        }
        return $user->tickets()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'location' => 'required|string',
            'category' => 'required|string',
            'description' => 'required|string',
            'photo' => 'nullable|image|max:5120',
        ]);

        $photo_path = null;
        if ($request->hasFile('photo')) {
            $photo_path = $request->file('photo')->store('tickets', 'public');
        }

        $ticket = Ticket::create([
            'user_id' => $request->user()->id,
            'location' => $validated['location'],
            'category' => $validated['category'],
            'description' => $validated['description'],
            'photo_path' => $photo_path,
            'status' => 'pending',
        ]);

        return response()->json($ticket, 201);
    }

    public function show(Request $request, $id)
    {
        $ticket = Ticket::with('user')->findOrFail($id);
        $user = $request->user();
        if ($user->role !== 'admin' && $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Tidak berhak mengakses tiket ini'], 403);
        }
        return $ticket;
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
        ]);

        $ticket->update($validated);
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
