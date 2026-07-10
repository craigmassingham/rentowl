"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rentowl/ui";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

const PasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const MagicLinkSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app/dashboard";

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = React.useState(false);

  const passwordForm = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { email: "", password: "" },
  });

  const magicForm = useForm<z.infer<typeof MagicLinkSchema>>({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: { email: "" },
  });

  async function onPasswordSubmit(values: z.infer<typeof PasswordSchema>) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        authErrorMessage(error, "Email or password is incorrect. Try again.")
      );
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function onMagicSubmit(values: z.infer<typeof MagicLinkSchema>) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setServerError(
        authErrorMessage(
          error,
          "We couldn't send the link. Check the email and try again."
        )
      );
      return;
    }

    setMagicLinkSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back to RentOwl.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password">
          <TabsList className="w-full">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="magic-link">Email me a link</TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="pt-2">
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="grid gap-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {serverError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {serverError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  {passwordForm.formState.isSubmitting
                    ? "Logging in…"
                    : "Log in"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="magic-link" className="pt-2">
            {magicLinkSent ? (
              <p className="py-4 text-sm text-muted-foreground">
                Check your email. We&apos;ve sent you a login link — it expires
                in 1 hour.
              </p>
            ) : (
              <Form {...magicForm}>
                <form
                  onSubmit={magicForm.handleSubmit(onMagicSubmit)}
                  className="grid gap-4"
                >
                  <FormField
                    control={magicForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {serverError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {serverError}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={magicForm.formState.isSubmitting}
                  >
                    {magicForm.formState.isSubmitting
                      ? "Sending…"
                      : "Send login link"}
                  </Button>
                </form>
              </Form>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to RentOwl?{" "}
          <Link href="/signup" className="underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
