"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES, PropertyInputSchema } from "@rentowl/shared";
import {
  Button,
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
import type { PropertyActionState } from "./actions";

/**
 * Form values stay as strings (native input behaviour); PropertyInputSchema
 * preprocesses them, so client and server validate with the same schema.
 */
type PropertyFormValues = z.input<typeof PropertyInputSchema>;

export type PropertyFormDefaults = {
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
  property_type: (typeof PROPERTY_TYPES)[number] | "";
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area_sqft: number | null;
  notes: string | null;
};

const EMPTY_DEFAULTS: PropertyFormDefaults = {
  address_line_1: "",
  address_line_2: null,
  postal_code: "",
  property_type: "",
  bedrooms: null,
  bathrooms: null,
  floor_area_sqft: null,
  notes: null,
};

export function PropertyForm({
  action,
  defaults = EMPTY_DEFAULTS,
  submitLabel,
  cancelHref,
}: {
  action: (prev: PropertyActionState, formData: FormData) => Promise<PropertyActionState>;
  defaults?: PropertyFormDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertyInputSchema),
    defaultValues: {
      address_line_1: defaults.address_line_1,
      address_line_2: defaults.address_line_2 ?? "",
      postal_code: defaults.postal_code,
      property_type: defaults.property_type || undefined,
      bedrooms: defaults.bedrooms?.toString() ?? "",
      bathrooms: defaults.bathrooms?.toString() ?? "",
      floor_area_sqft: defaults.floor_area_sqft?.toString() ?? "",
      notes: defaults.notes ?? "",
    } as PropertyFormValues,
  });

  async function onSubmit(values: PropertyFormValues) {
    setFormError(null);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.append(key, value == null ? "" : String(value));
    }

    // Server action redirects on success; only validation/server errors return.
    const result = await action(null, formData);
    if (result?.errors) {
      for (const [field, message] of Object.entries(result.errors)) {
        if (field === "form") {
          setFormError(message);
        } else {
          form.setError(field as keyof PropertyFormValues, { message });
        }
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-4">
        <FormField
          control={form.control}
          name="address_line_1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Block and street</FormLabel>
              <FormControl>
                <Input placeholder="Blk 123 Bishan Street 13" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address_line_2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input placeholder="#08-123" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>Optional for landed property.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal code</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" maxLength={6} placeholder="570123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="property_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property type</FormLabel>
                <Select onValueChange={field.onChange} value={(field.value as string) ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bathrooms</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="floor_area_sqft"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Floor area (sqft)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} value={(field.value as string) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Anything worth remembering about this property" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
