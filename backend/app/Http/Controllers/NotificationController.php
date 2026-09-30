<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return Notification::where('user_id', $request->user()->id)
            ->with('ticket:id,location,status')
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();
    }

    public function unreadCount(Request $request)
    {
        return response()->json([
            'unread' => Notification::where('user_id', $request->user()->id)->where('is_read', false)->count(),
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $n = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $n->is_read = true;
        $n->save();
        return response()->json($n);
    }

    public function markAllRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)->where('is_read', false)->update(['is_read' => true]);
        return response()->json(['message' => 'Semua ditandai dibaca']);
    }
}
