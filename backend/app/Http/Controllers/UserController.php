<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }

        return User::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nim_nip' => 'required|string|max:50|unique:users,nim_nip',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:user,admin',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'nim_nip' => $validated['nim_nip'],
            'email' => $validated['email'] ?? $validated['nim_nip'] . '@campuscare.local',
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }

        $target = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'nim_nip' => ['sometimes', 'string', 'max:50', Rule::unique('users')->ignore($target->id)],
            'role' => 'sometimes|in:user,admin',
            'password' => 'nullable|string|min:6',
        ]);

        if (array_key_exists('password', $validated) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Admin tidak bisa menurunkan perannya sendiri agar tidak terkunci.
        if ($target->id === $request->user()->id && ($validated['role'] ?? null) === 'user') {
            return response()->json(['message' => 'Tidak bisa menurunkan peran akun sendiri'], 422);
        }

        $target->update($validated);

        return response()->json($target);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Hanya admin'], 403);
        }

        $target = User::findOrFail($id);

        if ($target->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa menghapus akun sendiri'], 422);
        }

        $target->delete();

        return response()->json(null, 204);
    }
}
