import Link from "next/link";
import { Button } from "@rentowl/ui";

export default function PropertyNotFound() {
  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Property not found
      </h1>
      <p className="mt-2 text-muted-foreground">
        It may have been deleted, or the link is wrong. Your properties are
        listed on the Properties page.
      </p>
      <Button className="mt-4" asChild>
        <Link href="/app/properties">Go to Properties</Link>
      </Button>
    </main>
  );
}
