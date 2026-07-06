# 🔥 Wildfire Alert System - Focos de Incendios con Alertas Personalizadas

## 📖 Descripción del Proyecto

Aplicación web para visualizar en tiempo real los focos de incendios activos utilizando la API de **NASA FIRMS** (Fire Information for Resource Management System). Los usuarios podrán suscribirse con su correo electrónico y seleccionar una provincia de interés para recibir alertas personalizadas cuando se detecten nuevos incendios en esa área.

## 🎯 Objetivos del Proyecto

- Visualizar en un mapa interactivo los focos de incendios activos usando datos de la NASA.
- Permitir a los usuarios registrarse y gestionar sus suscripciones por provincia.
- Enviar alertas por correo electrónico cuando se detecten nuevos incendios en las provincias suscritas.
- Ofrecer una experiencia de usuario rápida, moderna y escalable.

## 🏗️ Arquitectura Tecnológica

### Backend

- **Plataforma:** Supabase
  - Base de datos PostgreSQL con Row Level Security (RLS)
  - Autenticación de usuarios (email/password + OAuth)
  - Edge Functions para lógica de alertas
  - Almacenamiento de suscripciones y preferencias

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** TailwindCSS
- **Mapas:** Leaflet + React-Leaflet
- **Estado:** React Context + Supabase Hooks
- **Despliegue:** Vercel

### Servicios Externos

- **API de Datos:** NASA FIRMS API (MODIS y VIIRS)
- **Email:** Gmail SMTP con App Password (2-Step Verification + 16-char app password) para envío de alertas desde una cuenta propia
- **Cron Jobs:** pg_cron en Supabase para programar verificaciones

## 📊 Estructura de Base de Datos (Supabase)

### Tablas Principales

```sql
-- Usuarios (gestionado por Supabase Auth)
auth.users

-- Suscripciones de usuarios
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  province VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, province)
);

-- Historial de alertas enviadas
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  fire_id VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW()
);

src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── api/
│   │   └── fires/
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Map/
│   │   ├── FireMap.tsx
│   │   └── FireMarker.tsx
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   └── AuthButtons.tsx
│   ├── Subscriptions/
│   │   ├── SubscriptionForm.tsx
│   │   └── SubscriptionList.tsx
│   └── UI/
│       ├── Button.tsx
│       └── Card.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── firms/
│   │   └── api.ts
│   └── utils/
├── types/
│   └── index.ts
└── styles/
    └── globals.css
```
