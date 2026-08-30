"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../../../lib/supabase";

import {
  useCurrentUser,
} from "../../../lib/useCurrentUser";

/* =========================================================
   TIPOS
========================================================= */

type Club = {
  id: string;
  name: string;
};

/* =========================================================
   PÁGINA
========================================================= */

export default function NewPlayerPage() {
  const {
    profile,
    loading: profileLoading,
    can,
  } =
    useCurrentUser();

  const [
    clubs,
    setClubs,
  ] =
    useState<Club[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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

  /* =======================================================
     PERMISOS
  ======================================================= */

  const canCreatePlayer =
    can(
      "players:create"
    );

  /* =======================================================
     CARGA INICIAL
  ======================================================= */

  useEffect(() => {
    if (
      profileLoading
    ) {
      return;
    }

    if (
      !profile ||
      !canCreatePlayer
    ) {
      setLoading(
        false
      );

      return;
    }

    loadInitialData();
  }, [
    profileLoading,
    profile,
    canCreatePlayer,
  ]);

  /* =======================================================
     CARGAR CLUBES
  ======================================================= */

  async function loadInitialData() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "clubs"
          )
          .select(
            "id,name"
          )
          .order(
            "name"
          );

      if (
        error
      ) {
        throw error;
      }

      setClubs(
        (
          data ||
          []
        ) as Club[]
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Error cargando clubes:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los clubes."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     GUARDAR JUGADOR
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /* -----------------------------------------------------
       SEGUNDA BARRERA DE PERMISOS
    ----------------------------------------------------- */

    if (
      !can(
        "players:create"
      )
    ) {
      setMessage(
        "No tenés permisos para crear jugadores."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    const form =
      new FormData(
        event.currentTarget
      );

    const firstName =
      String(
        form.get(
          "first_name"
        ) || ""
      ).trim();

    const lastName =
      String(
        form.get(
          "last_name"
        ) || ""
      ).trim();

    if (
      !firstName
    ) {
      setMessage(
        "Ingresá el nombre del jugador."
      );

      setSaving(
        false
      );

      return;
    }

    if (
      !lastName
    ) {
      setMessage(
        "Ingresá el apellido del jugador."
      );

      setSaving(
        false
      );

      return;
    }

    const heightValue =
      form.get(
        "height_cm"
      );

    const weightValue =
      form.get(
        "weight_kg"
      );

    const height =
      heightValue
        ? Number(
            heightValue
          )
        : null;

    const weight =
      weightValue
        ? Number(
            weightValue
          )
        : null;

    if (
      height !== null &&
      (
        height < 120 ||
        height > 230
      )
    ) {
      setMessage(
        "La altura debe encontrarse entre 120 y 230 cm."
      );

      setSaving(
        false
      );

      return;
    }

    if (
      weight !== null &&
      (
        weight < 30 ||
        weight > 180
      )
    ) {
      setMessage(
        "El peso debe encontrarse entre 30 y 180 kg."
      );

      setSaving(
        false
      );

      return;
    }

    const payload = {
      internal_code:
        String(
          form.get(
            "internal_code"
          ) || ""
        ).trim() ||
        null,

      first_name:
        firstName,

      last_name:
        lastName,

      birth_date:
        String(
          form.get(
            "birth_date"
          ) || ""
        ) ||
        null,

      nationality:
        String(
          form.get(
            "nationality"
          ) || ""
        ).trim() ||
        null,

      position:
        String(
          form.get(
            "position"
          ) ||
            "GK"
        ),

      specific_position:
        String(
          form.get(
            "specific_position"
          ) || ""
        ).trim() ||
        null,

      preferred_foot:
        String(
          form.get(
            "preferred_foot"
          ) || ""
        ) ||
        null,

      height_cm:
        height,

      weight_kg:
        weight,

      current_club_id:
        String(
          form.get(
            "current_club_id"
          ) || ""
        ) ||
        null,

      active:
        true,
    };

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "players"
          )
          .insert(
            payload
          )
          .select(
            "id"
          )
          .single();

      if (
        error
      ) {
        throw error;
      }

      window.location.href =
        `/players/${data.id}`;
    } catch (
      error: unknown
    ) {
      console.error(
        "Error creando jugador:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear el jugador."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     CARGANDO
  ======================================================= */

  if (
    profileLoading ||
    loading
  ) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <p className="text-sm text-slate-400">
            Verificando permisos...
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     SIN SESIÓN
  ======================================================= */

  if (
    !profile
  ) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <h1 className="text-2xl font-black">
            Acceso requerido
          </h1>

          <p className="mt-3 text-slate-400">
            Para cargar jugadores necesitás iniciar sesión.
          </p>

          <a
            href="/login"
            className="btn mt-5"
          >
            Ingresar
          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     SIN PERMISO
  ======================================================= */

  if (
    !canCreatePlayer
  ) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
            Jugadores
          </div>

          <h1 className="mt-2 text-2xl font-black">
            Acceso restringido
          </h1>

          <p className="mt-3 text-slate-400">
            Tu perfil tiene permisos de consulta,
            pero no puede crear nuevas fichas de jugadores.
          </p>

          <a
            href="/players"
            className="btn mt-5"
          >
            Volver a jugadores
          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     FORMULARIO
  ======================================================= */

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <div>

        <div className="text-sm text-slate-400">
          Base maestra
        </div>

        <h1 className="text-3xl font-black">
          Nuevo jugador
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Registrá los datos básicos del jugador para incorporarlo al seguimiento.
        </p>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="card grid gap-5 md:grid-cols-2"
      >

        <Field
          label="Nombre"
          name="first_name"
          required
        />

        <Field
          label="Apellido"
          name="last_name"
          required
        />

        <Field
          label="Código interno"
          name="internal_code"
          placeholder="ARG-GK-000001"
        />

        <Field
          label="Fecha de nacimiento"
          name="birth_date"
          type="date"
        />

        <Field
          label="Nacionalidad"
          name="nationality"
          placeholder="Argentina"
        />

        {/* POSICIÓN */}

        <div>

          <label className="label">
            Posición
          </label>

          <select
            className="input"
            name="position"
            defaultValue="GK"
          >

            <option value="GK">
              Arquero
            </option>

            <option value="DF">
              Defensor
            </option>

            <option value="MF">
              Mediocampista
            </option>

            <option value="FW">
              Delantero
            </option>

          </select>

        </div>

        <Field
          label="Posición específica"
          name="specific_position"
          placeholder="Arquero"
        />

        {/* PIE HÁBIL */}

        <div>

          <label className="label">
            Pie hábil
          </label>

          <select
            className="input"
            name="preferred_foot"
            defaultValue=""
          >

            <option value="">
              Sin dato
            </option>

            <option value="DERECHO">
              Derecho
            </option>

            <option value="IZQUIERDO">
              Izquierdo
            </option>

            <option value="AMBOS">
              Ambos
            </option>

          </select>

        </div>

        <Field
          label="Altura (cm)"
          name="height_cm"
          type="number"
          min="120"
          max="230"
          step="0.1"
        />

        <Field
          label="Peso (kg)"
          name="weight_kg"
          type="number"
          min="30"
          max="180"
          step="0.1"
        />

        {/* CLUB */}

        <div className="md:col-span-2">

          <label className="label">
            Club actual
          </label>

          <select
            className="input"
            name="current_club_id"
            defaultValue=""
          >

            <option value="">
              Sin club cargado
            </option>

            {clubs.map(
              (
                club
              ) => (

                <option
                  key={
                    club.id
                  }
                  value={
                    club.id
                  }
                >
                  {club.name}
                </option>

              )
            )}

          </select>

          {clubs.length ===
            0 && (

            <p className="mt-2 text-xs text-slate-500">
              Todavía no hay clubes cargados.
            </p>

          )}

        </div>

        {/* ERROR */}

        {message && (

          <div className="md:col-span-2 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-200">
            {message}
          </div>

        )}

        {/* BOTONES */}

        <div className="md:col-span-2 flex justify-end gap-3 pt-3">

          <a
            href="/players"
            className="rounded-lg border border-slate-600 px-4 py-2 font-bold transition hover:border-slate-400"
          >
            Cancelar
          </a>

          <button
            type="submit"
            className="btn"
            disabled={
              saving
            }
          >
            {saving
              ? "Guardando..."
              : "Guardar jugador"}
          </button>

        </div>

      </form>

    </div>
  );
}

/* =========================================================
   CAMPO
========================================================= */

function Field({
  label,
  ...props
}: any) {
  return (
    <div>

      <label className="label">
        {label}
      </label>

      <input
        className="input"
        {...props}
      />

    </div>
  );
}
