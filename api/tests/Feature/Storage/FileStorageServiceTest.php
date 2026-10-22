<?php

use App\Services\FileStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Storage::fake('public');
    Storage::fake('private');
    $this->files = app(FileStorageService::class);
});

it('stores a document on the private disk with a generated name and sniffed extension', function () {
    $pdf = UploadedFile::fake()->createWithContent('Quarterly Report.exe', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

    $path = $this->files->storeDocument($pdf, 'documents', ['application/pdf' => 'pdf'], 1024);

    expect($path)->toMatch('#^documents/[0-9a-f-]{36}\.pdf$#');
    Storage::disk('private')->assertExists($path);
    Storage::disk('public')->assertMissing($path);
});

it('rejects documents whose content type is not allowed', function () {
    $text = UploadedFile::fake()->createWithContent('invoice.pdf', 'plain text pretending to be a pdf');

    $this->files->storeDocument($text, 'documents', ['application/pdf' => 'pdf'], 1024);
})->throws(ValidationException::class);

it('rejects documents over the size limit', function () {
    $pdf = UploadedFile::fake()->create('big.pdf', 600, 'application/pdf');

    $this->files->storeDocument($pdf, 'documents', ['application/pdf' => 'pdf'], 500);
})->throws(ValidationException::class);

it('refuses unknown disks', function () {
    $this->files->disk('s3');
})->throws(InvalidArgumentException::class);

it('deletes files and ignores empty paths', function () {
    Storage::disk('public')->put('avatars/x.webp', 'data');

    $this->files->delete('public', 'avatars/x.webp');
    $this->files->delete('public', null);

    Storage::disk('public')->assertMissing('avatars/x.webp');
});

it('re-encodes images to the requested square size', function () {
    $path = $this->files->storeSquareImage(UploadedFile::fake()->image('w.jpg', 900, 300), 'avatars', 256, 2048, 64, 4000);

    $info = getimagesizefromstring(Storage::disk('public')->get($path));
    expect([$info[0], $info[1], $info['mime']])->toBe([256, 256, 'image/webp']);
});

it('never serves private files from the public disk', function () {
    $pdf = UploadedFile::fake()->createWithContent('a.pdf', "%PDF-1.4\n%%EOF");
    $path = $this->files->storeDocument($pdf, 'documents', ['application/pdf' => 'pdf'], 1024);

    expect(Storage::disk('public')->exists($path))->toBeFalse()
        ->and($this->files->downloadPrivate($path)->getStatusCode())->toBe(200);
});
