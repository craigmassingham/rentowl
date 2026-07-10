import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up — RentOwl" };

export default function SignupPage() {
  return <SignupForm />;
}
