import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rentowl/ui";

export const metadata: Metadata = { title: "Verify your email — RentOwl" };

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Click it to activate your
            account — then you can log in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or{" "}
            <Link href="/signup" className="underline underline-offset-4">
              try signing up again
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
