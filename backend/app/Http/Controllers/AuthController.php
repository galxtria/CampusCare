<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'nim_nip' => 'required|string',
            'password' => 'required',
        ]);

        $user = User::where('nim_nip', $validated['nim_nip'])->first();
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'NIM/Password salah'], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Berhasil keluar']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        // Data mahasiswa dikelola admin dan tidak bisa diubah sendiri.
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Data akun hanya bisa diubah oleh admin'], 403);
        }
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
        ]);
        if (isset($validated['name'])) {
            $user->name = $validated['name'];
            $user->save();
        }
        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);
        $user = $request->user();
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Password lama salah'], 422);
        }
        $user->password = Hash::make($validated['password']);
        $user->save();
        return response()->json(['message' => 'Password berhasil diubah']);
    }
}
