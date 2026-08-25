import "./globals.css";

export const metadata = {
  title: "Scout GK",
  description: "Scouting de jugadores con foco en arqueros",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
            <a href="/" className="min-w-fit">
              <div className="text-xl font-black">
                SCOUT GK
              </div>

              <div className="text-xs text-slate-400">
                Inteligencia de scouting
              </div>
            </a>

            <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm text-slate-300">
              <a
                href="/"
                className="transition hover:text-white"
              >
                Dashboard
              </a>

              <a
                href="/players"
                className="transition hover:text-white"
              >
                Jugadores
              </a>

              <a
                href="/compare"
                className="transition hover:text-white"
              >
                Comparar
              </a>

              <a
                href="/reports/new"
                className="transition hover:text-white"
              >
                Nuevo informe
              </a>

              <a
                href="/login"
                className="transition hover:text-white"
              >
                Acceso
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
