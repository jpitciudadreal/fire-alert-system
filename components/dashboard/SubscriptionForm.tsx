"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabase, useToast } from "@/components/Providers";
import { Field, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  subscriptionSchema,
  type SubscriptionInput,
  type Subscription,
  type Province,
} from "@/types";
import { findProvinceBySlug } from "@/lib/data/provinces";

interface SubscriptionFormProps {
  userId: string;
  userEmail: string;
  provinces: Province[];
  existing: Subscription[];
  onCreated: (subscription: Subscription) => void;
}

export function SubscriptionForm({
  userId,
  userEmail,
  provinces,
  existing,
  onCreated,
}: SubscriptionFormProps) {
  const supabase = useSupabase();
  const toast = useToast();

  const availableProvinces = provinces.filter(
    (p) => !existing.some((e) => e.province_slug === p.slug)
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      province_slug: availableProvinces[0]?.slug ?? "",
    },
  });

  const onSubmit = async (data: SubscriptionInput) => {
    const province = findProvinceBySlug(data.province_slug);
    if (!province) {
      toast.push("Provincia no encontrada", "error");
      return;
    }

    const payload = {
      user_id: userId,
      province_slug: province.slug,
      province_name: province.name,
      email: userEmail,
    };

    const { data: inserted, error } = await supabase
      .from("subscriptions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      toast.push(error.message || "No se pudo crear la suscripción", "error");
      return;
    }

    const newSub: Subscription = {
      id: String((inserted as { id?: string } | null)?.id ?? cryptoId()),
      user_id: payload.user_id,
      province_slug: payload.province_slug,
      province_name: payload.province_name,
      email: payload.email,
      created_at: new Date().toISOString(),
    };

    onCreated(newSub);
    toast.push(`Suscrito a ${province.name}`, "success");
    reset({ province_slug: "" });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
      <Field
        label="Añadir provincia"
        htmlFor="province_slug"
        error={errors.province_slug}
        className="flex-1"
      >
        <Select
          id="province_slug"
          invalid={Boolean(errors.province_slug)}
          disabled={availableProvinces.length === 0}
          {...register("province_slug")}
        >
          {availableProvinces.length === 0 ? (
            <option value="">— Ya estás suscrito a todas —</option>
          ) : (
            <>
              <option value="" disabled>
                Selecciona una provincia…
              </option>
              {availableProvinces.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </>
          )}
        </Select>
      </Field>

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={availableProvinces.length === 0}
        className="sm:self-end"
      >
        Suscribirme
      </Button>
    </form>
  );
}

// Stable client-safe fallback id used when Supabase returns no id (e.g. mock)
function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
