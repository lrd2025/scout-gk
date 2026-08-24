# Scout GK V1

Demo inicial gratuita para scouting de jugadores con foco en arqueros.

## Stack
- Next.js
- Vercel
- Supabase
- PostgreSQL
- Tailwind CSS

## Inicio local

1. Instalar Node.js 20+
2. Ejecutar:
   npm install
3. Copiar `.env.example` a `.env.local`
4. Crear proyecto gratuito en Supabase.
5. Ejecutar `supabase/schema.sql` en SQL Editor.
6. Copiar URL y anon key a `.env.local`
7. Ejecutar:
   npm run dev

## V1 incluida
- Dashboard inicial
- Pantalla de jugadores
- Formulario de informe de arquero
- Evaluación 1–10
- Score global automático
- Estructura SQL para jugadores, partidos, informes, scores, videos y seguimiento

## Próximo paso
Conectar el formulario y listado de jugadores con Supabase y agregar autenticación.
