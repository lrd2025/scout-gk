import type {
  Metadata,
} from "next";

import "./globals.css";

import UserNavigation from "./UserNavigation";

/* =========================================================
   METADATA
========================================================= */

export const metadata: Metadata = {
  title:
    "Scout GK",

  description:
    "Plataforma de scouting y evaluación de arqueros",
};

/* =========================================================
   ROOT LAYOUT
========================================================= */

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="border-b border-slate-800 bg-slate-950">

          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">

            {/* MARCA */}

            <a
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-black">
                GK
              </div>

              <div>
                <div className="text-lg font-black tracking-tight">
                  Scout GK
                </div>

                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Athlon Base Scouting
                </div>
              </div>
            </a>

            {/* NAVEGACIÓN PRINCIPAL */}

            <nav className="flex flex-wrap items-center gap-2 text-sm">

              <a
                href="/"
                className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Dashboard
              </a>

              <a
                href="/players"
                className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Jugadores
              </a>

              <a
                href="/compare"
                className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Comparar
              </a>

              <a
                href="/videos"
                className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Videos
              </a>

              <a
                href="/reports/new"
                className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Nuevo informe
              </a>

              <a
                href="/profile"
                className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                Perfil
              </a>

            </nav>

            {/* USUARIO / ROL / ADMINISTRACIÓN */}

            <UserNavigation />

          </div>

        </header>

        {/* =================================================
            CONTENIDO PRINCIPAL
        ================================================= */}

        <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
          {children}
        </main>

      </body>
    </html>
  );
}
