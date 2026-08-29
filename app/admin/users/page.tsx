"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

import {
  roleLabel,
  UserRole,
} from "../../../lib/permissions";

import { useCurrentUser } from "../../../lib/useCurrentUser";

/* =========================================================
   TIPOS
========================================================= */

type PlatformUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at?: string;
  last_login_at: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "Sin registro";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin registro";
  }

  return date.toLocaleString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   PÁGINA
========================================================= */

export default function AdminUsersPage() {
  const {
    profile,
    loading: profileLoading,
  } = useCurrentUser();

  const [users, setUsers] =
    useState<PlatformUser[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [initialized, setInitialized] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [savingId, setSavingId] =
    useState<string | null>(null);

  /* =======================================================
     OBTENER TOKEN
  ======================================================= */

  async function getAccessToken() {
    const {
      data,
      error,
    } =
      await supabase.auth
        .getSession();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return (
      data.session
        ?.access_token ??
      null
    );
  }

  /* =======================================================
     CARGAR USUARIOS
  ======================================================= */

  const loadUsers =
    useCallback(
      async () => {
        setLoading(true);

        setError("");

        try {
          const {
            data,
            error:
              sessionError,
          } =
            await supabase.auth
              .getSession();

          if (
            sessionError
          ) {
            throw new Error(
              sessionError.message
            );
          }

          const token =
            data.session
              ?.access_token;

          if (!token) {
            throw new Error(
              "No hay una sesión activa."
            );
          }

          const response =
            await fetch(
              "/api/admin/users",
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                cache:
                  "no-store",
              }
            );

          const result =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ||
                "No se pudieron cargar los usuarios."
            );
          }

          const receivedUsers =
            Array.isArray(
              result.users
            )
              ? result.users
              : [];

          setUsers(
            receivedUsers
          );
        } catch (
          err
        ) {
          console.error(
            "Error cargando usuarios:",
            err
          );

          setUsers(
            []
          );

          setError(
            err instanceof Error
              ? err.message
              : "Error cargando usuarios."
          );
        } finally {
          setLoading(
            false
          );

          setInitialized(
            true
          );
        }
      },
      []
    );

  /* =======================================================
     CARGA INICIAL
  ======================================================= */

  useEffect(
    () => {
      if (
        profileLoading
      ) {
        return;
      }

      if (!profile) {
        setInitialized(
          true
        );

        return;
      }

      if (
        profile.role !==
        "ADMIN"
      ) {
        setInitialized(
          true
        );

        return;
      }

      loadUsers();
    },
    [
      profileLoading,
      profile?.id,
      profile?.role,
      loadUsers,
    ]
  );

  /* =======================================================
     FILTRAR USUARIOS
  ======================================================= */

  const filteredUsers =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        if (!term) {
          return users;
        }

        return users.filter(
          (
            user
          ) => {
            const name =
              (
                user.full_name ||
                ""
              ).toLowerCase();

            const email =
              (
                user.email ||
                ""
              ).toLowerCase();

            const role =
              (
                user.role ||
                ""
              ).toLowerCase();

            return (
              name.includes(
                term
              ) ||
              email.includes(
                term
              ) ||
              role.includes(
                term
              )
            );
          }
        );
      },
      [
        users,
        search,
      ]
    );

  /* =======================================================
     ACTUALIZAR USUARIO
  ======================================================= */

  async function updateUser(
    userId: string,
    changes: {
      role?: UserRole;
      active?: boolean;
    }
  ) {
    setSavingId(
      userId
    );

    setError("");

    setMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        throw new Error(
          "La sesión venció. Volvé a iniciar sesión."
        );
      }

      const response =
        await fetch(
          "/api/admin/users",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                userId,
                ...changes,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
            "No se pudo actualizar el usuario."
        );
      }

      setMessage(
        "Usuario actualizado correctamente."
      );

      await loadUsers();
    } catch (
      err
    ) {
      console.error(
        "Error actualizando usuario:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el usuario."
      );
    } finally {
      setSavingId(
        null
      );
    }
  }

  /* =======================================================
     CAMBIAR ROL
  ======================================================= */

  async function changeRole(
    user:
      PlatformUser,
    role:
      UserRole
  ) {
    if (
      user.id ===
      profile?.id
    ) {
      setError(
        "Por seguridad, no podés modificar tu propio rol desde este panel."
      );

      return;
    }

    await updateUser(
      user.id,
      {
        role,
      }
    );
  }

  /* =======================================================
     ACTIVAR / DESACTIVAR
  ======================================================= */

  async function toggleActive(
    user:
      PlatformUser
  ) {
    if (
      user.id ===
      profile?.id
    ) {
      setError(
        "No podés desactivar tu propia cuenta."
      );

      return;
    }

    await updateUser(
      user.id,
      {
        active:
          !user.active,
      }
    );
  }

  /* =======================================================
     CARGANDO PERFIL
  ======================================================= */

  if (
    profileLoading
  ) {
    return (
      <div className="card">
        Verificando permisos...
      </div>
    );
  }

  /* =======================================================
     SIN SESIÓN
  ======================================================= */

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl">

        <div className="card">

          <h1 className="text-2xl font-black">
            Administración
          </h1>

          <p className="mt-3 text-slate-400">
            Debés iniciar sesión para acceder.
          </p>

          <a
            href="/login"
            className="btn mt-5"
          >
            Ir a Acceso
          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     SIN PERMISOS
  ======================================================= */

  if (
    profile.role !==
    "ADMIN"
  ) {
    return (
      <div className="mx-auto max-w-3xl">

        <div className="card">

          <div className="text-sm font-bold uppercase tracking-wider text-red-400">
            Acceso restringido
          </div>

          <h1 className="mt-2 text-2xl font-black">
            Administración
          </h1>

          <p className="mt-3 text-slate-400">
            Tu rol no posee permisos para administrar usuarios.
          </p>

          <a
            href="/"
            className="btn mt-5"
          >
            Volver al Dashboard
          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     INTERFAZ
  ======================================================= */

  return (
    <div className="space-y-6">

      {/* CABECERA */}

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Scout GK
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Administración de usuarios
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Gestión de usuarios, roles y accesos a la plataforma.
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-sm">

          <span className="text-slate-500">
            Administrador:
          </span>{" "}

          <span className="font-bold">
            {profile.full_name}
          </span>

          <span className="ml-2 text-slate-500">
            ·{" "}
            {roleLabel(
              profile.role
            )}
          </span>

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">

          {error}

        </div>
      )}

      {/* ÉXITO */}

      {message && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-300">

          {message}

        </div>
      )}

      {/* RESUMEN + BUSCADOR */}

      <section className="card">

        <div className="flex flex-wrap items-center justify-between gap-5">

          <div>

            <h2 className="text-xl font-black">
              Usuarios registrados
            </h2>

            <p className="mt-1 text-sm text-slate-500">

              {users.length}{" "}

              {users.length ===
              1
                ? "usuario"
                : "usuarios"}{" "}

              registrados en Scout GK.

            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <input
              type="search"
              className="input min-w-[300px]"
              placeholder="Buscar por nombre, correo o rol..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              onClick={
                loadUsers
              }
              disabled={
                loading
              }
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Actualizando..."
                : "Actualizar"}
            </button>

          </div>

        </div>

      </section>

      {/* TABLA */}

      <section className="card overflow-x-auto">

        {!initialized ||
        loading ? (

          <div className="py-12 text-center">

            <div className="text-sm font-bold text-slate-300">
              Cargando usuarios...
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Consultando perfiles y permisos.
            </div>

          </div>

        ) : filteredUsers.length ===
          0 ? (

          <div className="py-12 text-center">

            <div className="font-bold">
              No se encontraron usuarios
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Probá modificando el criterio de búsqueda.
            </div>

          </div>

        ) : (

          <table className="w-full min-w-[1050px] text-left text-sm">

            <thead>

              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">

                <th className="px-3 py-4">
                  Usuario
                </th>

                <th className="px-3 py-4">
                  Correo
                </th>

                <th className="px-3 py-4">
                  Rol
                </th>

                <th className="px-3 py-4">
                  Estado
                </th>

                <th className="px-3 py-4">
                  Fecha de alta
                </th>

                <th className="px-3 py-4">
                  Último acceso
                </th>

                <th className="px-3 py-4 text-right">
                  Acciones
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredUsers.map(
                (
                  user
                ) => {

                  const isSelf =
                    user.id ===
                    profile.id;

                  const isSaving =
                    savingId ===
                    user.id;

                  return (
                    <tr
                      key={
                        user.id
                      }
                      className="border-b border-slate-900 last:border-0"
                    >

                      {/* USUARIO */}

                      <td className="px-3 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 font-black">

                            {(
                              user.full_name ||
                              user.email ||
                              "U"
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}

                          </div>

                          <div>

                            <div className="font-bold">
                              {user.full_name ||
                                "Usuario"}
                            </div>

                            {isSelf && (

                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                Tu cuenta
                              </div>

                            )}

                          </div>

                        </div>

                      </td>

                      {/* EMAIL */}

                      <td className="px-3 py-4 text-slate-300">

                        {user.email}

                      </td>

                      {/* ROL */}

                      <td className="px-3 py-4">

                        <select
                          value={
                            user.role
                          }
                          disabled={
                            isSaving ||
                            isSelf
                          }
                          onChange={(
                            event
                          ) =>
                            changeRole(
                              user,
                              event
                                .target
                                .value as UserRole
                            )
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          <option value="ADMIN">
                            Administrador
                          </option>

                          <option value="SCOUT">
                            Scout
                          </option>

                          <option value="VIEWER">
                            Consulta
                          </option>

                        </select>

                      </td>

                      {/* ESTADO */}

                      <td className="px-3 py-4">

                        <span
                          className={
                            user.active
                              ? "inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/30 px-3 py-1 text-xs font-bold text-emerald-300"
                              : "inline-flex items-center gap-2 rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-300"
                          }
                        >

                          <span>
                            ●
                          </span>

                          {user.active
                            ? "Activa"
                            : "Deshabilitada"}

                        </span>

                      </td>

                      {/* FECHA ALTA */}

                      <td className="px-3 py-4 text-xs text-slate-400">

                        {formatDate(
                          user.created_at
                        )}

                      </td>

                      {/* ÚLTIMO ACCESO */}

                      <td className="px-3 py-4 text-xs text-slate-400">

                        {formatDate(
                          user.last_login_at
                        )}

                      </td>

                      {/* ACCIONES */}

                      <td className="px-3 py-4 text-right">

                        {isSelf ? (

                          <span className="text-xs text-slate-500">
                            Cuenta protegida
                          </span>

                        ) : (

                          <button
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() =>
                              toggleActive(
                                user
                              )
                            }
                            className={
                              user.active
                                ? "rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                                : "rounded-lg border border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                            }
                          >

                            {isSaving
                              ? "Guardando..."
                              : user.active
                              ? "Desactivar"
                              : "Activar"}

                          </button>

                        )}

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        )}

      </section>

      {/* REFERENCIA DE ROLES */}

      <section className="grid gap-4 md:grid-cols-3">

        <RoleCard
          title="Administrador"
          description="Control general de usuarios, roles y administración de Scout GK."
        />

        <RoleCard
          title="Scout"
          description="Puede registrar jugadores, realizar evaluaciones, cargar videos y generar informes."
        />

        <RoleCard
          title="Consulta"
          description="Puede consultar jugadores, videos, informes y comparaciones sin modificar información."
        />

      </section>

    </div>
  );
}

/* =========================================================
   TARJETA DE ROL
========================================================= */

function RoleCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-5">

      <div className="font-black">
        {title}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>

    </div>
  );
}
