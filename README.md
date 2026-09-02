# TensioCare

Aplicación web mobile-first para registrar, consultar y exportar mediciones de presión arterial.

## Inicio local

1. Copia `.env.example` a `.env.local` y cambia `AUTH_SECRET`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre `http://localhost:3000`.

Sin variables de Turso, la base SQLite se crea automáticamente en `data/tensiometro.db`. Cada fecha admite una medición por combinación de turno y brazo; guardar otra en la misma posición actualiza la anterior.

Para Vercel configura `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y `AUTH_SECRET`. En ese entorno no configures `DATABASE_PATH`.

## Comprobaciones

- `npm test`
- `npm run lint`
- `npm run build`

La aplicación utiliza Turso/libSQL cuando encuentra sus variables y conserva SQLite local como alternativa de desarrollo.
