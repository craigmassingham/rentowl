"use client";

import * as React from "react";

const STORAGE_KEY = "rentowl.dashboard.firstRunTipDismissed";

/**
 * Dismissible first-run tip. Dismissal persists in localStorage so it never
 * reappears (M1-W4-01). Renders nothing until mounted, so dismissed users see
 * no flash and there's no hydration mismatch.
 */
export function FirstRunTip() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border bg-accent/40 p-4">
      <div>
        <p className="text-sm font-medium">You&apos;re set up.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a property to see its tenancy, or generate a new agreement from
          the tenancy page. Rent reminders and tenant invites arrive in a later
          update.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Got it
      </button>
    </div>
  );
}
