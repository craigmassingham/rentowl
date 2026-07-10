"use client";

import { Button } from "@rentowl/ui";

export default function PropertiesError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Properties didn&apos;t load
      </h1>
      <p className="mt-2 text-muted-foreground">
        Retry, or refresh the page. If it keeps happening, log out and back in.
      </p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </main>
  );
}
