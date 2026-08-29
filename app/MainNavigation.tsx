"use client";

import {
  useCurrentUser,
} from "../lib/useCurrentUser";

/* =========================================================
   SCOUT GK
   NAVEGACIÓN PRINCIPAL SEGÚN ROL
========================================================= */

export default function MainNavigation() {
  const {
    profile,
    loading,
    can,
  } =
    useCurrentUser();

  /* =======================================================
     MIENTRAS SE CARGA EL PERFIL

     Mostramos solo las opciones públicas/de consulta.
  ======================================================= */

  if (loading) {
    return (
      <nav className="flex flex-wrap items-center gap-2 text-sm">

        <NavLink
          href="/"
          label="Dashboard"
        />

        <NavLink
          href="/players"
          label="Jugadores"
        />

        <NavLink
          href="/compare"
          label="Comparar"
        />

        <NavLink
          href="/videos"
          label="Videos"
        />

      </nav>
    );
  }

  /* =======================================================
     USUARIO NO AUTENTICADO
  ======================================================= */

  if (!profile) {
    return (
      <nav className="flex flex-wrap items-center gap-2 text-sm">

        <NavLink
          href="/"
          label="Dashboard"
        />

        <NavLink
          href="/players"
          label="Jugadores"
        />

        <NavLink
          href="/compare"
          label="Comparar"
        />

        <NavLink
          href="/videos"
          label="Videos"
        />

      </nav>
    );
  }

  /* =======================================================
     USUARIO AUTENTICADO
  ======================================================= */

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">

      {/* DASHBOARD */}

      {can(
        "dashboard:view"
      ) && (
        <NavLink
          href="/"
          label="Dashboard"
        />
      )}

      {/* JUGADORES */}

      {can(
        "players:view"
      ) && (
        <NavLink
          href="/players"
          label="Jugadores"
        />
      )}

      {/* COMPARAR */}

      {can(
        "compare:view"
      ) && (
        <NavLink
          href="/compare"
          label="Comparar"
        />
      )}

      {/* VIDEOS */}

      {can(
        "videos:view"
      ) && (
        <NavLink
          href="/videos"
          label="Videos"
        />
      )}

      {/* NUEVO INFORME
          ADMIN + SCOUT
          VIEWER NO LO VE
      */}

      {can(
        "reports:create"
      ) && (
        <NavLink
          href="/reports/new"
          label="Nuevo informe"
        />
      )}

      {/* PERFIL */}

      {can(
        "profile:view"
      ) && (
        <NavLink
          href="/profile"
          label="Perfil"
        />
      )}

    </nav>
  );
}

/* =========================================================
   LINK
========================================================= */

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg px-3 py-2 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
    >
      {label}
    </a>
  );
}
