<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Safe handling of uploads: disk selection, content sniffing, size limits and
 * generated file names. Original names are never used or trusted.
 *
 * - "public" disk: images served directly by the gateway at /storage/.
 * - "private" disk: documents, only ever served through an authorised endpoint.
 */
class FileStorageService
{
    public const PUBLIC_DISK = 'public';

    public const PRIVATE_DISK = 'private';

    /** Real content types accepted for images, mapped to the extension we report. */
    private const IMAGE_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function disk(string $name): Filesystem
    {
        if (! in_array($name, [self::PUBLIC_DISK, self::PRIVATE_DISK], true)) {
            throw new \InvalidArgumentException("Unsupported storage disk [{$name}].");
        }

        return Storage::disk($name);
    }

    /**
     * Validate an uploaded image by its content, re-encode it as a square WebP
     * (dropping EXIF/metadata) and store it on the public disk under a UUID name.
     *
     * @return string Path relative to the public disk, e.g. "avatars/<uuid>.webp".
     *
     * @throws ValidationException
     */
    public function storeSquareImage(
        UploadedFile $file,
        string $directory,
        int $size,
        int $maxKilobytes,
        int $minPixels,
        int $maxPixels,
        string $field = 'avatar',
    ): string {
        $this->assertUploadedAndSized($file, $maxKilobytes, $field);
        $this->assertImageContent($file, $minPixels, $maxPixels, $field);

        try {
            $encoded = ImageManager::usingDriver(GdDriver::class)
                ->decodePath($file->getRealPath())
                ->orient()
                ->cover($size, $size)
                ->encode(new WebpEncoder(quality: 85, strip: true))
                ->toString();
        } catch (Throwable) {
            throw $this->invalid($field, 'The file could not be processed as an image.');
        }

        $path = trim($directory, '/').'/'.Str::uuid()->toString().'.webp';
        $this->disk(self::PUBLIC_DISK)->put($path, $encoded, 'public');

        return $path;
    }

    /**
     * Store a document on the private disk. The extension comes from the sniffed
     * content type, never from the client-supplied name.
     *
     * @param  array<string, string>  $allowedTypes  content type => extension
     * @return string Path relative to the private disk.
     *
     * @throws ValidationException
     */
    public function storeDocument(
        UploadedFile $file,
        string $directory,
        array $allowedTypes,
        int $maxKilobytes,
        string $field = 'file',
    ): string {
        $this->assertUploadedAndSized($file, $maxKilobytes, $field);

        $type = $this->sniffMimeType($file);

        if ($type === null || ! isset($allowedTypes[$type])) {
            throw $this->invalid($field, 'The file type is not allowed.');
        }

        $path = trim($directory, '/').'/'.Str::uuid()->toString().'.'.$allowedTypes[$type];
        $stream = fopen($file->getRealPath(), 'rb');

        try {
            $this->disk(self::PRIVATE_DISK)->put($path, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        return $path;
    }

    /** Stream a private document. Callers must authorise the request first. */
    public function downloadPrivate(string $path, ?string $downloadName = null): StreamedResponse
    {
        return Storage::disk(self::PRIVATE_DISK)->download($path, $downloadName);
    }

    public function delete(string $disk, ?string $path): void
    {
        if ($path !== null && $path !== '') {
            $this->disk($disk)->delete($path);
        }
    }

    private function assertUploadedAndSized(UploadedFile $file, int $maxKilobytes, string $field): void
    {
        if (! $file->isValid() || $file->getRealPath() === false) {
            throw $this->invalid($field, 'The file failed to upload.');
        }

        if ($file->getSize() > $maxKilobytes * 1024) {
            throw $this->invalid($field, "The file may not be larger than {$maxKilobytes} kilobytes.");
        }
    }

    private function assertImageContent(UploadedFile $file, int $minPixels, int $maxPixels, string $field): void
    {
        $type = $this->sniffMimeType($file);
        $dimensions = @getimagesize($file->getRealPath());

        if ($type === null || ! isset(self::IMAGE_TYPES[$type]) || $dimensions === false
            || $dimensions['mime'] !== $type) {
            throw $this->invalid($field, 'The file must be a JPEG, PNG or WebP image.');
        }

        [$width, $height] = $dimensions;

        if ($width < $minPixels || $height < $minPixels) {
            throw $this->invalid($field, "The image must be at least {$minPixels}x{$minPixels} pixels.");
        }

        if ($width > $maxPixels || $height > $maxPixels) {
            throw $this->invalid($field, "The image may not be larger than {$maxPixels}x{$maxPixels} pixels.");
        }
    }

    private function sniffMimeType(UploadedFile $file): ?string
    {
        $type = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());

        return $type === false ? null : $type;
    }

    private function invalid(string $field, string $message): ValidationException
    {
        return ValidationException::withMessages([$field => [$message]]);
    }
}
