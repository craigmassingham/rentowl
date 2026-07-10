import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in — RentOwl" };

export default function LoginPage() {
  // Suspense boundary required: LoginForm reads useSearchParams for ?next=.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
