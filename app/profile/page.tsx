"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  supabase,
} from "../../lib/supabase";

import {
  roleDescription,
  roleLabel,
} from "../../lib/permissions";

import {
  useCurrentUser,
} from "../../lib/useCurrentUser";

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Sin registro";
  }

  return new Date(
    value
  ).toLocaleString(
    "es-AR"
  );
}

/* =========================================================
   PERFIL
========================================================= */

export default function ProfilePage() {
  const {
    profile,
    loading,
    error,
    reload,
  } =
    useCurrentUser();

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    fullName,
    setFullName,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" |
      "error" |
      ""
    >("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    changingPassword,
    setChangingPassword,
  ] =
    useState(false);

  /* =======================================================
     EDITAR PERFIL
  ======================================================= */

  function startEditing() {
    if (!profile) {
      return;
    }

    setFullName(
      profile.full_name
    );

    setEditing(
      true
    );

    setMessage(
      ""
    );
  }

  async function saveProfile(
    event:
      FormEvent
  ) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    if (
      fullName
        .trim()
        .length <
      3
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "Ingresá nombre y apellido."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .update({
          full_name:
            fullName.trim(),

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          profile.id
        );

    if (
      updateError
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        updateError.message
      );

      setSaving(
        false
      );

      return;
    }

    setMessageType(
      "success"
    );

    setMessage(
      "Perfil actualizado correctamente."
    );

    setEditing(
      false
    );

    await reload();

    setSaving(
      false
    );
  }

  /* =======================================================
     CAMBIAR CONTRASEÑA
  ======================================================= */

  async function changePassword(
    event:
      FormEvent
  ) {
    event.preventDefault();

    setMessage(
      ""
    );

    if (
      newPassword.length <
      8
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "La nueva contraseña debe contener al menos 8 caracteres."
      );

      return;
    }

    if (
      !/[A-Z]/.test(
        newPassword
      )
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "La contraseña debe contener una letra mayúscula."
      );

      return;
    }

    if (
      !/[a-z]/.test(
        newPassword
      )
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "La contraseña debe contener una letra minúscula."
      );

      return;
    }

    if (
      !/[0-9]/.test(
        newPassword
      )
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "La contraseña debe contener al menos un número."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        "Las contraseñas no coinciden."
      );

      return;
    }

    setChangingPassword(
      true
    );

    const {
      error:
        passwordError,
    } =
      await supabase.auth
        .updateUser({
          password:
            newPassword,
        });

    if (
      passwordError
    ) {
      setMessageType(
        "error"
      );

      setMessage(
        passwordError.message
      );

      setChangingPassword(
        false
      );

      return;
    }

    setNewPassword(
      ""
    );

    setConfirmPassword(
      ""
    );

    setMessageType(
      "success"
    );

    setMessage(
      "Contraseña actualizada correctamente."
    );

    setChangingPassword(
      false
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="card">
        Cargando perfil...
      </div>
    );
  }

  /* =======================================================
     ERROR / SIN PERFIL
  ======================================================= */

  if (
    error ||
    !profile
  ) {
    return (
      <div className="mx-auto max-w-3xl">

        <div className="card">

          <h1 className="text-2xl font-black">
            Perfil
          </h1>

          <p className="mt-3 text-red-300">
            {error ||
              "No se encontró el perfil."}
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
     UI
  ======================================================= */

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* CABECERA */}

      <div>

        <h1 className="text-3xl font-black">
          Mi perfil
        </h1>

        <p className="mt-2 text-slate-400">
          Datos personales y función dentro de Scout GK.
        </p>

      </div>

      {/* MENSAJE */}

      {message && (

        <div
          className={
            messageType ===
            "success"
              ? "rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-300"
              : "rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300"
          }
        >
          {message}
        </div>

      )}

      {/* DATOS PRINCIPALES */}

      <section className="card">

        <div className="flex flex-wrap items-start justify-between gap-5">

          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-2xl font-black">

              {profile.full_name
                .charAt(0)
                .toUpperCase()}

            </div>

            <div>

              <h2 className="text-2xl font-black">
                {profile.full_name}
              </h2>

              <div className="mt-1 text-sm text-slate-400">
                {profile.email}
              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={
              startEditing
            }
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold hover:border-slate-500"
          >
            Editar perfil
          </button>

        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">

          <InfoCard
            label="Nombre y apellido"
            value={
              profile.full_name
            }
          />

          <InfoCard
            label="Correo electrónico"
            value={
              profile.email
            }
          />

          <InfoCard
            label="Rol institucional"
            value={
              roleLabel(
                profile.role
              )
            }
          />

          <InfoCard
            label="Estado de cuenta"
            value={
              profile.active
                ? "Activa"
                : "Deshabilitada"
            }
          />

          <InfoCard
            label="Fecha de alta"
            value={
              formatDateTime(
                profile.created_at
              )
            }
          />

          <InfoCard
            label="Último acceso"
            value={
              formatDateTime(
                profile.last_login_at
              )
            }
          />

        </div>

      </section>

      {/* ROL */}

      <section className="card">

        <div className="text-sm text-slate-400">
          Función dentro de la plataforma
        </div>

        <div className="mt-2 text-2xl font-black">
          {roleLabel(
            profile.role
          )}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {roleDescription(
            profile.role
          )}
        </p>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/30 p-4">

          <div className="text-xs font-black uppercase tracking-wider text-slate-500">
            Importante
          </div>

          <p className="mt-2 text-sm text-slate-400">
            El rol institucional solo puede ser modificado
            por un administrador de Scout GK.
          </p>

        </div>

      </section>

      {/* EDITAR NOMBRE */}

      {editing && (

        <section className="card">

          <h2 className="text-xl font-black">
            Editar datos personales
          </h2>

          <form
            onSubmit={
              saveProfile
            }
            className="mt-5"
          >

            <label className="label">
              Nombre y apellido
            </label>

            <input
              className="input"
              value={
                fullName
              }
              onChange={(
                event
              ) =>
                setFullName(
                  event.target.value
                )
              }
            />

            <div className="mt-5 flex gap-3">

              <button
                type="submit"
                className="btn"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditing(
                    false
                  )
                }
                className="rounded-lg border border-slate-700 px-4 py-2 font-bold"
              >
                Cancelar
              </button>

            </div>

          </form>

        </section>

      )}

      {/* CONTRASEÑA */}

      <section className="card">

        <h2 className="text-xl font-black">
          Seguridad
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Podés modificar tu contraseña personal.
          La clave institucional no se utiliza para ingresar.
        </p>

        <form
          onSubmit={
            changePassword
          }
          className="mt-6 space-y-4"
        >

          <div>

            <label className="label">
              Nueva contraseña
            </label>

            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={
                newPassword
              }
              onChange={(
                event
              ) =>
                setNewPassword(
                  event.target.value
                )
              }
              placeholder="Nueva contraseña"
            />

          </div>

          <div>

            <label className="label">
              Confirmar nueva contraseña
            </label>

            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={
                confirmPassword
              }
              onChange={(
                event
              ) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Repetí la nueva contraseña"
            />

          </div>

          <button
            type="submit"
            className="btn"
            disabled={
              changingPassword
            }
          >
            {changingPassword
              ? "Actualizando..."
              : "Cambiar contraseña"}
          </button>

        </form>

      </section>

    </div>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-2 font-bold">
        {value}
      </div>

    </div>
  );
}
