<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class SettingService
{
    /**
     * @return Collection
     */
    public function public(): Collection
    {
        return Setting::query()->public()->orderBy('key')->pluck('value', 'key');
    }

    /**
     * @return EloquentCollection
     */
    public function index(): EloquentCollection
    {
        return Setting::query()->orderBy('key')->get();
    }

    /**
     * @param Setting $setting
     * @param array $data
     * @return Setting
     */
    public function update(Setting $setting, array $data): Setting
    {
        $setting->update($data);
        return $setting->refresh();
    }
}
