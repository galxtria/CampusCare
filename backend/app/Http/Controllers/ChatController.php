<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'nullable|string',
            'history.*.text' => 'nullable|string|max:2000',
        ]);

        $apiKey = env('GEMINI_API_KEY', '');
        if (!$apiKey) {
            return response()->json(['message' => 'GEMINI_API_KEY belum dikonfigurasi di backend (.env)'], 503);
        }

        $model = env('GEMINI_MODEL', 'gemini-3.5-flash');
        $system = file_get_contents(resource_path('prompts/campuscare.txt')) ?: 'Kamu asisten CampusCare. Jawab Bahasa Indonesia.';

        $contents = [];
        foreach (($validated['history'] ?? []) as $h) {
            $role = ($h['role'] ?? 'user') === 'model' ? 'model' : 'user';
            $contents[] = ['role' => $role, 'parts' => [['text' => (string) ($h['text'] ?? '')]]];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $validated['message']]]];

        $models = array_values(array_unique([$model, 'gemini-3.5-flash', 'gemini-3.5-flash-lite']));
        $lastError = 'unknown';
        foreach ($models as $m) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$m}:generateContent?key={$apiKey}";
            try {
                $res = Http::timeout(25)->post($url, [
                    'system_instruction' => ['parts' => [['text' => $system]]],
                    'contents' => $contents,
                    'generationConfig' => ['maxOutputTokens' => 1024, 'temperature' => 0.7],
                ]);
                if ($res->successful()) {
                    $text = data_get($res->json(), 'candidates.0.content.parts.0.text', '');
                    if ($text) return response()->json(['reply' => $text, 'model' => $m]);
                    $lastError = 'empty response';
                } else {
                    $lastError = substr($res->body(), 0, 300);
                    if (!str_contains($lastError, '404') && !str_contains($lastError, '429') && !str_contains($lastError, '503') && !str_contains($lastError, '500')) {
                        break;
                    }
                }
            } catch (\Throwable $e) {
                $lastError = substr($e->getMessage(), 0, 300);
            }
        }

        return response()->json(['message' => 'Gemini sibuk/tidak tersedia', 'detail' => $lastError], 502);
    }
}
