import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scout GK",
  description: "Inteligencia de scouting y valoración longitudinal de jugadores",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header
          style={{
            background: "#020617",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              maxWidth: "1180px",
              margin: "0 auto",
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
            }}
          >
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#ffffff",
                }}
              >
                SCOUT GK
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "12px",
                  color: "#93c5fd",
                }}
              >
                Inteligencia de scouting
              </div>
            </Link>

            <nav
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: "20px",
                fontSize: "14px",
              }}
            >
              <Link href="/">Dashboard</Link>

              <Link href="/players">
                Jugadores
              </Link>

              <Link href="/compare">
                Comparar
              </Link>

              <Link href="/reports/new">
                Nuevo informe
              </Link>

              <Link href="/login">
                Acceso
              </Link>
            </nav>
          </div>
        </header>

        <main
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "32px 24px",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
