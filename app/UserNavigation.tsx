"use client";

import {
  supabase,
} from "../lib/supabase";

import {
  roleLabel,
} from "../lib/permissions";

import {
  useCurrentUser,
} from "../lib/useCurrentUser";

/* =========================================================
   SCOUT GK
   MENÚ DE USUARIO
========================================================= */

export default function UserNavigation() {
  const {
    profile,
    loading,
    can,
  } =
    useCurrentUser();

  /* =======================================================
     CERRAR SESIÓN
  ======================================================= */

  async function logout() {
    await supabase.auth
      .signOut();

    window.location.href =
      "/login";
  }

  /* =======================================================
     CARGANDO
  ======================================================= */

  if (loading) {
    return (
      <div className="flex items-center">

        <span className="text-sm text-slate-500">
          ...
        </span>

      </div>
    );
  }

  /* =======================================================
     SIN SESIÓN
  ======================================================= */

  if (!profile) {
    return (
      <a
        href="/login"
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
      >
        Acceso
      </a>
    );
  }

  /* =======================================================
     USUARIO AUTENTICADO
  ======================================================= */

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* PERFIL */}

      <a
        href="/profile"
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:border-slate-500"
      >

        <span className="font-bold text-white">
          {profile.full_name}
        </span>

        <span className="text-xs text-slate-500">
          {roleLabel(
            profile.role
          )}
        </span>

      </a>

      {/* ADMINISTRACIÓN
          SOLO ADMIN
      */}

      {can(
        "users:manage"
      ) && (

        <a
          href="/admin/users"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-slate-500 hover:bg-slate-900"
        >
          Administración
        </a>

      )}

      {/* SALIR */}

      <button
        type="button"
        onClick={
          logout
        }
        className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-white"
      >
        Salir
      </button>

    </div>
  );
}
