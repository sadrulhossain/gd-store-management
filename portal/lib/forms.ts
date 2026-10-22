import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api/client";

/**
 * Map a Laravel 422 response onto react-hook-form fields.
 * Errors for keys the form does not have are returned so the caller can show them as a form-level message.
 *
 * @returns messages that could not be attached to a field (empty when everything mapped).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  /** API field name -> form field name, for fields named differently. */
  aliases: Record<string, string> = {},
): string[] {
  if (!isApiError(error) || !error.isValidation) return [];

  const unmapped: string[] = [];

  for (const [apiField, messages] of Object.entries(error.errors)) {
    const field = aliases[apiField] ?? apiField;
    const message = messages[0] ?? error.message;

    if (knownFields.includes(field)) {
      setError(field as FieldPath<T>, { type: "server", message });
    } else {
      unmapped.push(message);
    }
  }

  return unmapped;
}

/** Empty strings from text inputs mean "not provided" for the API. */
export function blankToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
