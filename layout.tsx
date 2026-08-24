import "./globals.css";

export const metadata = {
  title: "Scout GK",
  description: "Scouting de jugadores con foco en arqueros"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <div className="text-xl font-black">SCOUT GK</div>
              <div className="text-xs text-slate-400">Inteligencia de scouting</div>
            </div>
            <nav className="flex gap-5 text-sm text-slate-300">
              <a href="/">Dashboard</a>
              <a href="/players">Jugadores</a>
              <a href="/reports/new">Nuevo informe</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
