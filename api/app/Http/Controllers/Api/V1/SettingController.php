<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateSettingRequest;
use App\Http\Resources\SettingResource;
use App\Models\Setting;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SettingController extends Controller
{
    public function __construct(private readonly SettingService $settings) {}

    /** Settings safe to show before login (store name, currency, timezone, formats). */
    public function public(): JsonResponse
    {
        $settings = $this->settings->public();

        return response()->json(['data' => $settings]);
    }

    /**
     * @param Request $request
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return SettingResource::collection($this->settings->index());
    }

    public function edit(Request $request, Setting $setting): JsonResponse
    {
        return response()->json(['data' => [
            'setting' => new SettingResource($setting)->resolve()
        ]]);
    }

    public function update(UpdateSettingRequest $request, Setting $setting): SettingResource
    {
        return new SettingResource($this->settings->update($setting, $request->validated()));
    }
}
