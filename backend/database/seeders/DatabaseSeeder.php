<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Budi Santoso',
            'email' => 'budi@kampus.ac.id',
            'password' => bcrypt('password123'),
            'role' => 'user',
            'nim_nip' => '2024001',
        ]);

        User::create([
            'name' => 'Siti Nurhaliza',
            'email' => 'siti@kampus.ac.id',
            'password' => bcrypt('password123'),
            'role' => 'user',
            'nim_nip' => '2024002',
        ]);

        User::create([
            'name' => 'I Made Mahendra',
            'email' => 'imade@kampus.ac.id',
            'password' => bcrypt('123456'),
            'role' => 'user',
            'nim_nip' => '2401010101',
        ]);

        User::create([
            'name' => 'Admin Sarpras',
            'email' => 'admin@kampus.ac.id',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
            'nim_nip' => 'ADM001',
        ]);
    }
}
