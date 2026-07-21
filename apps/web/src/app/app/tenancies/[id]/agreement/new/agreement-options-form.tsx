"use client";

import * as React from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Button, Input, Label } from "@rentowl/ui";
import type { AgreementActionState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Generating…" : "Generate agreement"}
    </Button>
  );
}

function PendingNote() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <p className="text-sm text-muted-foreground" role="status">
      Assembling clauses and rendering the PDF — this can take up to 20 seconds.
    </p>
  );
}

export function AgreementOptionsForm({
  action,
  diplomaticApplicable,
  cancelHref,
  cancelLabel = "Cancel",
}: {
  action: (
    prev: AgreementActionState,
    formData: FormData
  ) => Promise<AgreementActionState>;
  diplomaticApplicable: boolean;
  cancelHref: string;
  cancelLabel?: string;
}) {
  const [state, formAction] = React.useActionState<AgreementActionState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="grid gap-6">
      <fieldset className="grid gap-4">
        <legend className="text-sm font-medium text-muted-foreground">
          Options
        </legend>

        {diplomaticApplicable ? (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="include_diplomatic"
              className="mt-1 size-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">Include the diplomatic clause</span>
              <span className="block text-muted-foreground">
                Lets an expat tenant end the tenancy early if they leave
                Singapore. Common for condo and landed rentals.
              </span>
            </span>
          </label>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="minor_repair_threshold_sgd">
            Minor repair threshold (S$)
          </Label>
          <Input
            id="minor_repair_threshold_sgd"
            name="minor_repair_threshold_sgd"
            type="number"
            min={1}
            step="1"
            defaultValue={200}
            className="max-w-[160px]"
          />
          <p className="text-xs text-muted-foreground">
            The tenant covers repairs up to this amount per item. Standard is
            S$200.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="room_rental"
            className="mt-1 size-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">This is a room rental</span>
            <span className="block text-muted-foreground">
              Only part of the unit is let. We&apos;ll flag the clauses that
              assume the whole property so you can add a special condition.
            </span>
          </span>
        </label>
      </fieldset>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Button variant="outline" asChild>
          <Link href={cancelHref}>{cancelLabel}</Link>
        </Button>
        <PendingNote />
      </div>
    </form>
  );
}
