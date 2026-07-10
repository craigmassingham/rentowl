"use client";

import * as React from "react";
import {
  toast,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
} from "@rentowl/ui";
import { formatSGD, formatDate } from "@rentowl/shared";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="border-b pb-2 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="space-y-1">
      <div className={`h-16 w-full rounded-md border ${className}`} />
      <p className="text-xs text-muted-foreground">{name}</p>
    </div>
  );
}

export function StyleGuide() {
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  return (
    <main className="mx-auto max-w-4xl space-y-12 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          RentOwl style guide
        </h1>
        <p className="text-muted-foreground">
          Every component in every variant. Dev and preview only. Light mode
          only in v1.
        </p>
      </header>

      <Section title="Palette">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          <Swatch name="primary (navy)" className="bg-primary" />
          <Swatch name="accent (sand)" className="bg-accent" />
          <Swatch name="success" className="bg-success" />
          <Swatch name="warning" className="bg-warning" />
          <Swatch name="destructive" className="bg-destructive" />
          <Swatch name="muted" className="bg-muted" />
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-2">
          <p className="text-4xl font-semibold">Heading 1 — 36px semibold</p>
          <p className="text-2xl font-semibold">Heading 2 — 24px semibold</p>
          <p className="text-xl font-medium">Heading 3 — 20px medium</p>
          <p className="text-base">
            Body — rent is due on {formatDate(new Date(2026, 3, 25))}, amount{" "}
            {formatSGD(3200)}.
          </p>
          <p className="text-sm text-muted-foreground">
            Muted — we&apos;ll remind Sarah on 25/04/2026 via WhatsApp.
          </p>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Input + Label">
        <div className="grid max-w-sm gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rent">Monthly rent (S$)</Label>
            <Input id="rent" type="number" placeholder="3,200" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="postal">Postal code</Label>
            <Input id="postal" inputMode="numeric" maxLength={6} placeholder="049483" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="disabled-input">Disabled</Label>
            <Input id="disabled-input" disabled placeholder="Not editable" />
          </div>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>2 of 3 rents received</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {formatSGD(6400)} received · {formatSGD(3200)} outstanding
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">
              View rent cycles
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Delete property</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this property?</DialogTitle>
              <DialogDescription>
                This removes the property and its tenancy history. This cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="destructive">Delete property</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toast.success("Rent marked as paid.")}
          >
            Success toast
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error(
                "Payment reminder didn't send. Retry, or check WhatsApp connection in Settings."
              )
            }
          >
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Select">
        <div className="max-w-sm">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Property type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hdb">HDB</SelectItem>
              <SelectItem value="condo">Condo</SelectItem>
              <SelectItem value="landed">Landed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="DatePicker">
        <div className="max-w-sm">
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Tenancy start date"
          />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="pending" className="max-w-md">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="late">Late</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="text-sm text-muted-foreground">
            All rent cycles.
          </TabsContent>
          <TabsContent
            value="pending"
            className="text-sm text-muted-foreground"
          >
            Cycles awaiting payment.
          </TabsContent>
          <TabsContent value="paid" className="text-sm text-muted-foreground">
            Paid cycles with references.
          </TabsContent>
          <TabsContent value="late" className="text-sm text-muted-foreground">
            Overdue cycles needing follow-up.
          </TabsContent>
        </Tabs>
      </Section>

      <Toaster position="bottom-right" />
    </main>
  );
}
