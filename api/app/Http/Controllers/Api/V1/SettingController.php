<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /** Settings safe to show before login (store name, currency, timezone, formats). */
    public function public(): JsonResponse
    {
        $settings = Setting::query()->where('is_public', true)->orderBy('key')->pluck('value', 'key');

        return response()->json(['data' => $settings]);
    }
}
