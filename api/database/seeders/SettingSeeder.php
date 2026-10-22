<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /** @var array<string, string> */
    private const DEFAULTS = [
        'store_name' => 'My Store',
        'currency_code' => 'BDT',
        'currency_symbol' => '৳',
        'timezone' => 'Asia/Dhaka',
        'date_format' => 'DD/MM/YYYY',
    ];

    public function run(): void
    {
        // Existing values are kept: later edits must survive re-seeding.
        foreach (self::DEFAULTS as $key => $value) {
            Setting::query()->firstOrCreate(['key' => $key], ['value' => $value, 'is_public' => true]);
        }
    }
}
