"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SubscriptionForm } from "./SubscriptionForm";
import { SubscriptionList } from "./SubscriptionList";
import type { Province, Subscription } from "@/types";
import { AlertBanner } from "@/components/AlertBanner";

interface DashboardClientProps {
  userEmail: string;
  userId: string;
  existingSubscriptions: Subscription[];
  provinces: Province[];
}

export function DashboardClient({
  userEmail,
  userId,
  existingSubscriptions,
  provinces,
}: DashboardClientProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(
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
          userId={userId}
          userEmail={userEmail}
          provinces={provinces}
          existing={subscriptions}
          onCreated={(sub) => setSubscriptions((prev) => [sub, ...prev])}
        />
        <p className="mt-4 text-xs text-zinc-500">
          Las suscripciones están protegidas por Row Level Security: solo tú
          puedes ver y modificar las tuyas.
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

      <AlertBanner tone="info" title="Próximamente">
        Cuando el detector (cron + Edge Function) entre en producción,
        aparecerán aquí las alertas enviadas a tu correo.
      </AlertBanner>
    </>
  );
}
