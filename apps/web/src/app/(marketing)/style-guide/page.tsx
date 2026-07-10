import { notFound } from "next/navigation";
import { StyleGuide } from "./style-guide";

export const metadata = { title: "Style guide — RentOwl" };

export default function StyleGuidePage() {
  // Dev and preview only — never in production.
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }
  return <StyleGuide />;
}
