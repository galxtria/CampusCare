<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        $defaults = [
            'Lab Komputer 1',
            'Lab Komputer 2',
            'Ruang Kuliah 3.1',
            'Ruang Kuliah 3.2',
            'Ruang Sidang Utama',
            'Toilet Lt. 1',
            'Toilet Lt. 2',
            'Kantin',
            'Perpustakaan',
            'Kelas 412',
        ];
        foreach ($defaults as $name) {
            \App\Models\Room::firstOrCreate(['name' => $name]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
