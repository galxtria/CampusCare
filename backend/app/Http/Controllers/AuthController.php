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
}
