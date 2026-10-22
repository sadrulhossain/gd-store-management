"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  /** Initial text. Remount with a new `key` to reset from outside. */
  defaultValue?: string;
  placeholder: string;
  label: string;
  /** Called with the trimmed text after the user pauses typing. */
  onSearch: (value: string) => void;
  delayMs?: number;
}

/** Search box that reports changes after a pause, so each keystroke does not fire a request. */
export function SearchInput({
  defaultValue = "",
  placeholder,
  label,
  onSearch,
  delayMs = 300,
}: SearchInputProps) {
  const [text, setText] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="relative flex-1 sm:max-w-sm">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(next.trim()), delayMs);
        }}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
    </div>
  );
}
