"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SubscriptionForm } from "./SubscriptionForm";
import { SubscriptionList } from "./SubscriptionList";
import { ManualRunButton } from "./ManualRunButton";
import type { Province } from "@/lib/provinces";

interface DashboardSubscription {
  id: string;
  email: string;
  province_slug: string;
  province_name: string;
  created_at: string;
  unsubscribe_token?: string;
  confirmed?: boolean;
}

interface DashboardClientProps {
  userEmail: string;
  existingSubscriptions: DashboardSubscription[];
  provinces: Province[];
}

export function DashboardClient({
  userEmail,
  existingSubscriptions,
  provinces,
}: DashboardClientProps) {
  const [subscriptions, setSubscriptions] = useState<DashboardSubscription[]>(
    existingSubscriptions
  );

  return (
    <>
      <Card>
        <CardHeader
          title="Nueva suscripción"
          subtitle="Elige la provincia sobre la que quieres recibir alertas por email cuando se detecten nuevos focos."
        />
        <SubscriptionForm
          userEmail={userEmail}
          provinces={provinces}
          existing={subscriptions}
          onCreated={(sub) => setSubscriptions((prev) => [sub, ...prev])}
        />
        <p className="mt-4 text-xs text-textSecondary">
          Las suscripciones son email-keyed: funcionan tanto si estás
          autenticado como si usas la pestaña «Suscribirse» desde la landing
          sin iniciar sesión.
        </p>
      </Card>

      <Card>
        <CardHeader
          title={`Mis suscripciones (${subscriptions.length})`}
          subtitle="Provincias a las que seguiré la pista"
        />
        <SubscriptionList
          subscriptions={subscriptions}
          onRemoved={(id) =>
            setSubscriptions((prev) => prev.filter((s) => s.id !== id))
          }
        />
      </Card>

      <ManualRunButton />
    </>
  );
}
