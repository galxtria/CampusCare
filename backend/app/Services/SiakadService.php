<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * PROTOTYPE: sumber data mahasiswa adalah "Sistem Akademik" eksternal.
 *
 * Mode mock (default): baca database/data/siakad_mahasiswa.json.
 * Mode api (nanti saat SIAKAD asli tersedia): set di .env
 *   SIAKAD_MODE=api
 *   SIAKAD_API_URL=https://siakad.kampus.ac.id/api
 *   SIAKAD_API_KEY=xxxx
 * lalu implementasikan panggilan HTTP di method apiFind() di bawah.
 */
class SiakadService
{
    public static function findByNim(string $nim): ?array
    {
        $nim = trim($nim);

        if (env('SIAKAD_MODE', 'mock') === 'api') {
            return self::apiFind($nim);
        }

        $path = database_path('data/siakad_mahasiswa.json');
        if (!is_file($path)) return null;

        $rows = json_decode(file_get_contents($path), true) ?: [];
        foreach ($rows as $r) {
            if (($r['nim'] ?? null) === $nim) {
                return [
                    'nim' => $r['nim'],
                    'nama' => $r['nama'],
                    'prodi' => $r['prodi'] ?? null,
                    'angkatan' => $r['angkatan'] ?? null,
                ];
            }
        }
        return null;
    }

    /** Daftar semua mahasiswa mock (untuk halaman sinkronisasi admin). */
    public static function all(): array
    {
        if (env('SIAKAD_MODE', 'mock') === 'api') {
            return [];
        }
        $path = database_path('data/siakad_mahasiswa.json');
        if (!is_file($path)) return [];
        return json_decode(file_get_contents($path), true) ?: [];
    }

    protected static function apiFind(string $nim): ?array
    {
        // TODO: ganti dengan kontrak API SIAKAD asli saat tersedia.
        // Contoh:
        // $res = Http::withToken(env('SIAKAD_API_KEY'))->get(env('SIAKAD_API_URL') . '/mahasiswa/' . $nim);
        // if (!$res->successful()) return null;
        // $j = $res->json();
        // return ['nim' => $j['nim'], 'nama' => $j['nama'], 'prodi' => $j['prodi'] ?? null, 'angkatan' => $j['angkatan'] ?? null];
        return null;
    }
}
