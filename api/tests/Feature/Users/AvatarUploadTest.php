<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

beforeEach(fn () => Storage::fake('public'));

function createWithAvatar(object $test, UploadedFile $file, array $extra = []): TestResponse
{
    return $test->post('/api/v1/users', array_merge([
        'name' => 'Pic User',
        'username' => 'picuser',
        'password' => 'Secret123',
        'role' => 'employee',
        'avatar' => $file,
    ], $extra), ['Accept' => 'application/json']);
}

it('stores a re-encoded 512x512 webp under a generated uuid name on the public disk', function () {
    $this->actingAsRole('owner');

    $response = createWithAvatar($this, UploadedFile::fake()->image('Original Name.jpg', 1200, 800))->assertCreated();

    $path = User::findByUsername('picuser')->avatar_path;

    expect($path)->toMatch('#^avatars/[0-9a-f-]{36}\.webp$#')
        ->and($path)->not->toContain('Original')
        ->and($response->json('data.avatar_url'))->toBe('/storage/'.$path);

    Storage::disk('public')->assertExists($path);

    $info = getimagesizefromstring(Storage::disk('public')->get($path));
    expect($info[0])->toBe(512)->and($info[1])->toBe(512)->and($info['mime'])->toBe('image/webp');
});

it('strips EXIF metadata', function () {
    $this->actingAsRole('owner');

    // A real JPEG with an EXIF (APP1) segment carrying a marker we can search for.
    $canvas = imagecreatetruecolor(300, 300);
    ob_start();
    imagejpeg($canvas);
    $jpeg = ob_get_clean();
    $payload = "Exif\0\0SECRET-GPS-DATA";
    $withExif = substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($payload) + 2).$payload.substr($jpeg, 2);
    expect($withExif)->toContain('SECRET-GPS-DATA');

    createWithAvatar($this, UploadedFile::fake()->createWithContent('exif.jpg', $withExif))->assertCreated();

    $stored = Storage::disk('public')->get(User::findByUsername('picuser')->avatar_path);
    expect($stored)->not->toContain('SECRET-GPS-DATA')->not->toContain('Exif');
});

it('accepts png and webp uploads', function () {
    $this->actingAsRole('owner');

    createWithAvatar($this, UploadedFile::fake()->image('a.png', 300, 300))->assertCreated();
    $first = User::findByUsername('picuser')->avatar_path;

    $this->post('/api/v1/users', [
        'name' => 'Webp User', 'username' => 'webpuser', 'password' => 'Secret123', 'role' => 'employee',
        'avatar' => UploadedFile::fake()->image('b.webp', 300, 300),
    ], ['Accept' => 'application/json'])->assertCreated();

    Storage::disk('public')->assertExists($first);
    Storage::disk('public')->assertExists(User::findByUsername('webpuser')->avatar_path);
});

it('rejects a non-image disguised with an image extension by content', function () {
    $this->actingAsRole('owner');
    $fake = UploadedFile::fake()->createWithContent('shell.png', '<?php system($_GET["c"]); ?>');

    createWithAvatar($this, $fake)->assertStatus(422)->assertJsonValidationErrors('avatar');

    expect(User::findByUsername('picuser'))->toBeNull()
        ->and(Storage::disk('public')->allFiles())->toBeEmpty();
});

it('rejects unsupported image types even with a valid extension', function () {
    $this->actingAsRole('owner');

    createWithAvatar($this, UploadedFile::fake()->image('anim.gif', 300, 300))
        ->assertStatus(422)->assertJsonValidationErrors('avatar');
});

it('rejects files over 2 MB', function () {
    $this->actingAsRole('owner');

    createWithAvatar($this, UploadedFile::fake()->image('big.jpg', 300, 300)->size(2049))
        ->assertStatus(422)->assertJsonValidationErrors('avatar');
});

it('rejects images that are too small or too large in pixels', function () {
    $this->actingAsRole('owner');

    createWithAvatar($this, UploadedFile::fake()->image('tiny.jpg', 32, 32))
        ->assertStatus(422)->assertJsonValidationErrors('avatar');

    createWithAvatar($this, UploadedFile::fake()->image('huge.jpg', 4500, 100)->size(100), ['username' => 'huge'])
        ->assertStatus(422)->assertJsonValidationErrors('avatar');
});

it('replaces an avatar and deletes the old file', function () {
    $this->actingAsRole('owner');
    createWithAvatar($this, UploadedFile::fake()->image('one.jpg', 400, 400))->assertCreated();
    $user = User::findByUsername('picuser');
    $old = $user->avatar_path;

    $this->post("/api/v1/users/{$user->id}", [
        '_method' => 'PUT',
        'avatar' => UploadedFile::fake()->image('two.jpg', 400, 400),
    ], ['Accept' => 'application/json'])->assertOk();

    $new = $user->fresh()->avatar_path;
    expect($new)->not->toBe($old);
    Storage::disk('public')->assertMissing($old);
    Storage::disk('public')->assertExists($new);
});

it('removes an avatar and deletes the file', function () {
    $this->actingAsRole('owner');
    createWithAvatar($this, UploadedFile::fake()->image('one.jpg', 400, 400))->assertCreated();
    $user = User::findByUsername('picuser');
    $old = $user->avatar_path;

    $this->putJson("/api/v1/users/{$user->id}", ['remove_avatar' => true])
        ->assertOk()->assertJsonPath('data.avatar_url', null);

    expect($user->fresh()->avatar_path)->toBeNull();
    Storage::disk('public')->assertMissing($old);
});

it('keeps the old avatar when a replacement fails validation', function () {
    $this->actingAsRole('owner');
    createWithAvatar($this, UploadedFile::fake()->image('one.jpg', 400, 400))->assertCreated();
    $user = User::findByUsername('picuser');
    $old = $user->avatar_path;

    $this->post("/api/v1/users/{$user->id}", [
        '_method' => 'PUT',
        'avatar' => UploadedFile::fake()->createWithContent('bad.jpg', 'not an image'),
    ], ['Accept' => 'application/json'])->assertStatus(422);

    expect($user->fresh()->avatar_path)->toBe($old);
    Storage::disk('public')->assertExists($old);
});

it('lets users change their own avatar through the profile endpoint', function () {
    $user = $this->actingAsRole('employee');

    $this->post('/api/v1/auth/profile', [
        '_method' => 'PATCH',
        'avatar' => UploadedFile::fake()->image('me.jpg', 300, 300),
    ], ['Accept' => 'application/json'])->assertOk();

    Storage::disk('public')->assertExists($user->fresh()->avatar_path);
});

it('does not leave the uploaded file behind when user creation fails', function () {
    $this->actingAsRole('owner');
    $this->makeUser('employee', ['username' => 'picuser']);

    createWithAvatar($this, UploadedFile::fake()->image('one.jpg', 400, 400))->assertStatus(422);

    expect(Storage::disk('public')->allFiles('avatars'))->toBeEmpty();
});
