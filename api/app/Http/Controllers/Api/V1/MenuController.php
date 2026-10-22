<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menus\ReorderMenusRequest;
use App\Http\Requests\Menus\StoreMenuRequest;
use App\Http\Requests\Menus\UpdateMenuRequest;
use App\Http\Resources\MenuResource;
use App\Models\Menu;
use App\Services\MenuService;
use App\Support\MenuIcons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MenuController extends Controller
{
    public function __construct(private readonly MenuService $menus) {}

    /** Administration view: every item, nested, including inactive ones. */
    public function index(): AnonymousResourceCollection
    {
        return MenuResource::collection($this->menus->adminTree());
    }

    /** The menu the signed-in user may see. */
    public function my(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->menus->treeFor($request->user())]);
    }

    public function icons(): JsonResponse
    {
        return response()->json(['data' => MenuIcons::all()]);
    }

    public function store(StoreMenuRequest $request): JsonResponse
    {
        $menu = $this->menus->create($request->validated());

        return (new MenuResource($menu))->response()->setStatusCode(201);
    }

    public function update(UpdateMenuRequest $request, Menu $menu): MenuResource
    {
        return new MenuResource($this->menus->update($menu, $request->validated()));
    }

    public function destroy(Menu $menu): JsonResponse
    {
        $this->menus->delete($menu);

        return response()->json(['data' => ['message' => 'Menu deleted.']]);
    }

    public function reorder(ReorderMenusRequest $request): JsonResponse
    {
        $this->menus->reorder($request->validated('items'));

        return response()->json(['data' => MenuResource::collection($this->menus->adminTree())]);
    }
}
