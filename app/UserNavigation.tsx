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
   NAVEGACIÓN DE USUARIO
========================================================= */

export default function UserNavigation() {
  const {
    profile,
    loading,
    can,
  } =
    useCurrentUser();

  async function logout() {
    await supabase.auth
      .signOut();

    window.location.href =
      "/login";
  }

  if (loading) {
    return (
      <span className="text-sm text-slate-500">
        ...
      </span>
    );
  }

  if (!profile) {
    return (
      <a
        href="/login"
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold"
      >
        Acceso
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">

      <a
        href="/profile"
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:border-slate-500"
      >

        <span className="font-bold">
          {profile.full_name}
        </span>

        <span className="ml-2 text-xs text-slate-500">
          {roleLabel(
            profile.role
          )}
        </span>

      </a>

      {can(
        "users:manage"
      ) && (

        <a
          href="/admin/users"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold"
        >
          Administración
        </a>

      )}

      <button
        type="button"
        onClick={
          logout
        }
        className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-white"
      >
        Salir
      </button>

    </div>
  );
}
