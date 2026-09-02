# TensioCare

Aplicación web mobile-first para registrar, consultar y exportar mediciones de presión arterial.

## Inicio local

1. Copia `.env.example` a `.env.local` y cambia `AUTH_SECRET`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre `http://localhost:3000`.

La base SQLite se crea automáticamente en `data/tensiometro.db`. Cada fecha admite una medición por combinación de turno y brazo; guardar otra en la misma posición actualiza la anterior.

## Comprobaciones

- `npm test`
- `npm run lint`
- `npm run build`

SQLite embebido requiere un servidor con disco persistente. En plataformas serverless, adapta `src/lib/db.ts` a Turso/libSQL u otra base gestionada.
