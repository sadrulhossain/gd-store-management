"use client";

import { InboxIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { FormField } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { RoleBadge } from "@/components/common/role-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const COLORS = [
  "background",
  "foreground",
  "card",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "ring",
  "primary",
  "primary-foreground",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

interface Sample {
  id: number;
  name: string;
  role: string;
}

const SAMPLE_COLUMNS: Column<Sample>[] = [
  { key: "name", header: "Name", sortKey: "name", cell: (row) => row.name },
  { key: "role", header: "Role", cell: (row) => <RoleBadge role={row.role} /> },
];

const SAMPLE_ROWS: Sample[] = [
  { id: 1, name: "Amina Rahman", role: "owner" },
  { id: 2, name: "Tanvir Hasan", role: "manager" },
  { id: 3, name: "Nusrat Jahan", role: "employee" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function UiGallery() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <PageHeader
        title="UI kit"
        description="Design tokens and base components (development only). Toggle the theme to check both modes."
      />

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {COLORS.map((name) => (
            <div key={name} className="space-y-1.5">
              <div
                className="h-14 rounded-lg border shadow-sm"
                style={{ background: `var(--${name})` }}
              />
              <p className="text-xs font-medium">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography, radius and shadows">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">Heading 3xl</p>
              <p className="text-xl font-semibold">Heading xl</p>
              <p className="text-base">Body text in Inter with a system fallback.</p>
              <p className="text-sm text-muted-foreground">Muted small text</p>
              <code className="font-mono text-xs">font-mono · users.view</code>
            </CardContent>
          </Card>
          <div className="grid grid-cols-3 gap-3">
            {["shadow-sm", "shadow-md", "shadow-lg"].map((shadow) => (
              <div
                key={shadow}
                className={`flex h-24 items-center justify-center rounded-xl border bg-card text-xs ${shadow}`}
              >
                {shadow}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button size="default">default</Button>
          <Button size="lg">lg</Button>
          <Button size="icon" aria-label="Icon button">
            <InboxIcon aria-hidden />
          </Button>
          <Spinner />
        </div>
      </Section>

      <Section title="Form controls">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Input" htmlFor="ui-input" hint="Helper text">
              <Input id="ui-input" placeholder="Type here" />
            </FormField>
            <FormField label="Input with error" htmlFor="ui-error" error="This field is required.">
              <Input id="ui-error" aria-invalid aria-describedby="ui-error-message" />
            </FormField>
            <FormField label="Select" htmlFor="ui-select">
              <Select defaultValue="a">
                <SelectTrigger id="ui-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Option A</SelectItem>
                  <SelectItem value="b">Option B</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Textarea" htmlFor="ui-textarea">
              <Textarea id="ui-textarea" rows={3} />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Checkbox
            </label>
            <div className="flex items-center gap-2">
              <Switch id="ui-switch" defaultChecked />
              <Label htmlFor="ui-switch">Switch</Label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Badges and avatars">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
          <UserAvatar name="Amina Rahman" />
          <UserAvatar name="Tanvir" className="size-12" />
        </div>
      </Section>

      <Section title="Cards, tabs and loading">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Card description</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="one">
                <TabsList>
                  <TabsTrigger value="one">One</TabsTrigger>
                  <TabsTrigger value="two">Two</TabsTrigger>
                </TabsList>
                <TabsContent value="one" className="pt-3 text-sm">
                  First tab
                </TabsContent>
                <TabsContent value="two" className="pt-3 text-sm">
                  Second tab
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Overlays and feedback">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog</DialogTitle>
                <DialogDescription>Dialogs trap focus and close with Escape.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Delete this item?"
            description="This cannot be undone."
            confirmLabel="Delete"
            destructive
            loading={loading}
            onConfirm={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                setConfirmOpen(false);
                toast.success("Deleted.");
              }, 800);
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>First</DropdownMenuItem>
              <DropdownMenuItem>Second</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="secondary" onClick={() => toast.success("Saved.")}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Something failed.")}>
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Data table, empty state">
        <DataTable
          caption="Sample"
          columns={SAMPLE_COLUMNS}
          rows={SAMPLE_ROWS}
          rowKey={(row) => row.id}
          empty={null}
          sort="name"
          onSortChange={() => undefined}
          pagination={{
            page: 1,
            lastPage: 3,
            total: 3,
            from: 1,
            to: 3,
            onPageChange: () => undefined,
          }}
        />
        <Card>
          <EmptyState
            title="Nothing here yet"
            description="Empty states explain what to do next."
            action={<Button>Add something</Button>}
          />
        </Card>
      </Section>
    </>
  );
}
