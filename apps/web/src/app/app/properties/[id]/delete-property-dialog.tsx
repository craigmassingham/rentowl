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
import { deleteProperty } from "../actions";

export function DeletePropertyDialog({
  propertyId,
  addressLine1,
}: {
  propertyId: string;
  addressLine1: string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isDeleting, startDelete] = React.useTransition();

  function onConfirm() {
    setError(null);
    startDelete(async () => {
      // Redirects to /app/properties on success; only errors return.
      const result = await deleteProperty(propertyId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this property?</DialogTitle>
          <DialogDescription>
            {addressLine1} will be permanently removed. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
