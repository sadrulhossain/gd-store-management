"use client";

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** API sort field. Makes the header a sort button. */
  sortKey?: string;
}

export interface PaginationState {
  page: number;
  lastPage: number;
  total: number;
  from: number | null;
  to: number | null;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  /** Screen-reader description of the table. */
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  /** Rendered instead of the table body when there are no rows (and not loading). */
  empty: ReactNode;
  /** Rendered instead of the table when the request failed. */
  error?: ReactNode;
  /** Current sort in API form: "name" ascending, "-name" descending. */
  sort?: string;
  onSortChange?: (sort: string) => void;
  pagination?: PaginationState;
  skeletonRows?: number;
}

export function nextSort(current: string | undefined, key: string): string {
  if (current === key) return `-${key}`;
  if (current === `-${key}`) return key;
  return key;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  isLoading,
  empty,
  error,
  sort,
  onSortChange,
  pagination,
  skeletonRows = 6,
}: DataTableProps<T>) {
  if (error) return <div className="rounded-xl border bg-card">{error}</div>;

  const showEmpty = !isLoading && rows !== undefined && rows.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.className}
                  aria-sort={
                    column.sortKey && sort === column.sortKey
                      ? "ascending"
                      : column.sortKey && sort === `-${column.sortKey}`
                        ? "descending"
                        : undefined
                  }
                >
                  {column.sortKey && onSortChange ? (
                    <SortButton
                      active={
                        sort === column.sortKey
                          ? "asc"
                          : sort === `-${column.sortKey}`
                            ? "desc"
                            : null
                      }
                      onClick={() => onSortChange(nextSort(sort, column.sortKey as string))}
                    >
                      {column.header}
                    </SortButton>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: skeletonRows }, (_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        <Skeleton className="h-5 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows?.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {showEmpty && empty}

      {pagination && pagination.total > 0 && <PaginationBar {...pagination} />}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: "asc" | "desc" | null;
  onClick: () => void;
  children: ReactNode;
}) {
  const Icon = active === "asc" ? ArrowUpIcon : active === "desc" ? ArrowDownIcon : ArrowUpDownIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

function PaginationBar({ page, lastPage, total, from, to, onPageChange }: PaginationState) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:flex-row">
      <p className="text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{from ?? 0}</span>–
        <span className="font-medium text-foreground">{to ?? 0}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <nav className="flex items-center gap-2" aria-label="Pagination">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeftIcon aria-hidden /> Previous
        </Button>
        <span className="min-w-20 text-center text-muted-foreground">
          Page {page} of {lastPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
        >
          Next <ChevronRightIcon aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
