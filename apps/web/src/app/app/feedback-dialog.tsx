"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rentowl/ui";

const FEEDBACK_EMAIL =
  process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? "feedback@rentowl.sg";

/**
 * Pilot feedback (M1-W4-03): captures a short note and opens the landlord's
 * email client addressed to the team, with the current page attached for
 * context. Deliberately mailto-based — no backend, no new table, and it works
 * before transactional email (Resend) is wired in M4.
 */
export function FeedbackDialog() {
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);

  function send() {
    const trimmed = message.trim();
    if (!trimmed) return;
    const page =
      typeof window !== "undefined" ? window.location.pathname : "";
    const subject = encodeURIComponent("RentOwl pilot feedback");
    const body = encodeURIComponent(`${trimmed}\n\n---\nSent from: ${page}`);
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    setMessage("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            What&apos;s working, what&apos;s confusing, what&apos;s missing? This
            opens your email app — the page you&apos;re on is added automatically.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Tell us what you think…"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Your feedback"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={send} disabled={!message.trim()}>
            Open email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
