import type {
  Metadata,
} from "next";

import "./globals.css";

import MainNavigation from "./MainNavigation";

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

            {/* =============================================
                MARCA
            ============================================= */}

            <a
              href="/"
              className="flex shrink-0 items-center gap-3"
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

            {/* =============================================
                NAVEGACIÓN PRINCIPAL SEGÚN ROL
            ============================================= */}

            <div className="flex flex-1 justify-center">

              <MainNavigation />

            </div>

            {/* =============================================
                USUARIO
            ============================================= */}

            <UserNavigation />

          </div>

        </header>

        {/* =================================================
            CONTENIDO
        ================================================= */}

        <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">

          {children}

        </main>

      </body>

    </html>
  );
}
