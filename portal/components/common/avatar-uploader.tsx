"use client";

import { ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** First problem with a candidate avatar, or null. The API validates the real content again. */
export function avatarProblem(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type))
    return "Use a JPEG, PNG or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "The image must be 2 MB or smaller.";

  return null;
}

interface AvatarUploaderProps {
  name: string;
  /** Currently stored avatar (shown until a new file is chosen). */
  currentUrl?: string | null;
  file: File | null;
  removed: boolean;
  onFileChange: (file: File | null) => void;
  onRemovedChange: (removed: boolean) => void;
  error?: string;
}

/** Choose, preview and remove an avatar. Previews are local object URLs, released on change/unmount. */
export function AvatarUploader({
  name,
  currentUrl,
  file,
  removed,
  onFileChange,
  onRemovedChange,
  error,
}: AvatarUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  // The object URL is created when a file is chosen (an event), tied to that file, and released
  // when it is replaced or the component unmounts.
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const previewUrl = preview && preview.file === file ? preview.url : null;

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const shown = previewUrl ?? (removed ? null : (currentUrl ?? null));
  const message = localError ?? error;
  const hasImage = Boolean(shown);

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name || "?"} src={shown} className="size-20 text-lg" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            aria-describedby={message ? `${inputId}-error` : undefined}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              event.target.value = "";
              if (!chosen) return;

              const problem = avatarProblem(chosen);
              setLocalError(problem);
              if (problem) return;

              setPreview({ file: chosen, url: URL.createObjectURL(chosen) });
              onFileChange(chosen);
              onRemovedChange(false);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon aria-hidden /> {hasImage ? "Change photo" : "Upload photo"}
          </Button>
          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalError(null);
                onFileChange(null);
                onRemovedChange(Boolean(currentUrl));
              }}
            >
              <Trash2Icon aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG or WebP, up to 2 MB. It is cropped to a square.
        </p>
        {message && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-danger">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
