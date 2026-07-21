"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  TENANCY_STATUSES,
  TENANCY_STATUS_LABELS,
  TenancyInputSchema,
  toISODate,
} from "@rentowl/shared";
import {
  Button,
  DatePicker,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rentowl/ui";
import type { TenancyActionState } from "./actions";

/**
 * Form values stay as strings (dates as ISO yyyy-mm-dd); TenancyInputSchema
 * preprocesses them, so client and server validate with the same schema.
 */
type TenancyFormValues = z.input<typeof TenancyInputSchema>;

export type TenancyFormDefaults = {
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  start_date: string;
  end_date: string;
  monthly_rent_sgd: number | null;
  deposit_sgd: number | null;
  payment_day: number | null;
  status?: (typeof TENANCY_STATUSES)[number];
};

const EMPTY_DEFAULTS: TenancyFormDefaults = {
  tenant_name: "",
  tenant_email: "",
  tenant_phone: "",
  start_date: "",
  end_date: "",
  monthly_rent_sgd: null,
  deposit_sgd: null,
  payment_day: null,
};

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => String(i + 1));

/** Parses yyyy-mm-dd into a local Date for the DatePicker. */
function fromISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

export function TenancyForm({
  action,
  defaults = EMPTY_DEFAULTS,
  submitLabel,
  cancelHref,
  cancelLabel = "Cancel",
  showStatus = false,
}: {
  action: (prev: TenancyActionState, formData: FormData) => Promise<TenancyActionState>;
  defaults?: TenancyFormDefaults;
  submitLabel: string;
  cancelHref: string;
  cancelLabel?: string;
  /** Status is only editable on existing tenancies — new ones start active. */
  showStatus?: boolean;
}) {
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<TenancyFormValues>({
    resolver: zodResolver(TenancyInputSchema),
    defaultValues: {
      tenant_name: defaults.tenant_name,
      tenant_email: defaults.tenant_email,
      tenant_phone: defaults.tenant_phone,
      start_date: defaults.start_date,
      end_date: defaults.end_date,
      monthly_rent_sgd: defaults.monthly_rent_sgd?.toString() ?? "",
      deposit_sgd: defaults.deposit_sgd?.toString() ?? "",
      payment_day: defaults.payment_day?.toString() ?? "",
      status: defaults.status,
    } as TenancyFormValues,
  });

  async function onSubmit(values: TenancyFormValues) {
    setFormError(null);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === "status" && !showStatus) continue;
      formData.append(key, value == null ? "" : String(value));
    }

    // Server action redirects on success; only validation/server errors return.
    const result = await action(null, formData);
    if (result?.errors) {
      for (const [field, message] of Object.entries(result.errors)) {
        if (field === "form") {
          setFormError(message);
        } else {
          form.setError(field as keyof TenancyFormValues, { message });
        }
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-4">
        <FormField
          control={form.control}
          name="tenant_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenant name</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tenant_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenant email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tenant_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenant phone</FormLabel>
                <FormControl>
                  <Input inputMode="tel" placeholder="+65 9123 4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={fromISODate(field.value as string)}
                    onChange={(date) => field.onChange(date ? toISODate(date) : "")}
                    placeholder="Start date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={fromISODate(field.value as string)}
                    onChange={(date) => field.onChange(date ? toISODate(date) : "")}
                    placeholder="End date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="monthly_rent_sgd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly rent (S$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step="0.01"
                    {...field}
                    value={(field.value as string) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deposit_sgd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit (S$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    value={(field.value as string) ?? ""}
                  />
                </FormControl>
                <FormDescription>Leave blank if none.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rent due on day</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={(field.value as string) ?? ""}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Of each month, 1–28.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {showStatus ? (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={(field.value as string) ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TENANCY_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {TENANCY_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : submitLabel}
          </Button>
          <Button variant="outline" asChild>
            <Link href={cancelHref}>{cancelLabel}</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
