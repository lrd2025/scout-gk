"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "../../../../lib/supabase";

import {
  useCurrentUser,
} from "../../../../lib/useCurrentUser";

/* =========================================================
   TIPOS
========================================================= */

type Club = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  internal_code: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  nationality: string | null;
  position: string;
  specific_position: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  current_club_id: string | null;
  active: boolean;
};

/* =========================================================
   PÁGINA
========================================================= */

export default function EditPlayerPage() {
  const params =
    useParams();

  const playerId =
    String(
      params.id || ""
    );

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
    player,
    setPlayer,
  ] =
    useState<Player | null>(
      null
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

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /* =======================================================
     PERMISOS
  ======================================================= */

  const canEdit =
    can(
      "players:edit"
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
      !canEdit
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
    canEdit,
    playerId,
  ]);

  /* =======================================================
     CARGAR JUGADOR + CLUBES
  ======================================================= */

  async function loadInitialData() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      /* ---------------------------------------------------
         JUGADOR
      --------------------------------------------------- */

      const {
        data: playerData,
        error: playerError,
      } =
        await supabase
          .from(
            "players"
          )
          .select(`
            id,
            internal_code,
            first_name,
            last_name,
            birth_date,
            nationality,
            position,
            specific_position,
            preferred_foot,
            height_cm,
            weight_kg,
            current_club_id,
            active
          `)
          .eq(
            "id",
            playerId
          )
          .maybeSingle();

      if (
        playerError
      ) {
        throw playerError;
      }

      if (
        !playerData
      ) {
        throw new Error(
          "No se encontró el jugador."
        );
      }

      if (
        playerData.active ===
        false
      ) {
        throw new Error(
          "Este jugador no se encuentra activo."
        );
      }

      setPlayer(
        playerData as Player
      );

      /* ---------------------------------------------------
         CLUBES
      --------------------------------------------------- */

      const {
        data: clubData,
        error: clubError,
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
        clubError
      ) {
        throw clubError;
      }

      setClubs(
        (
          clubData ||
          []
        ) as Club[]
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Error cargando jugador:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el jugador."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     ACTUALIZAR CAMPO LOCAL
  ======================================================= */

  function updateField<
    K extends keyof Player
  >(
    field: K,
    value: Player[K]
  ) {
    setPlayer(
      (
        current
      ) => {
        if (
          !current
        ) {
          return current;
        }

        return {
          ...current,
          [field]:
            value,
        };
      }
    );
  }

  /* =======================================================
     GUARDAR CAMBIOS
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !player
    ) {
      return;
    }

    /* -----------------------------------------------------
       SEGUNDA BARRERA DE PERMISOS
    ----------------------------------------------------- */

    if (
      !can(
        "players:edit"
      )
    ) {
      setMessage(
        "No tenés permisos para editar jugadores."
      );

      return;
    }

    /* -----------------------------------------------------
       VALIDACIONES
    ----------------------------------------------------- */

    if (
      !player.first_name
        .trim()
    ) {
      setMessage(
        "Ingresá el nombre del jugador."
      );

      return;
    }

    if (
      !player.last_name
        .trim()
    ) {
      setMessage(
        "Ingresá el apellido del jugador."
      );

      return;
    }

    if (
      player.height_cm !==
        null &&
      (
        player.height_cm <
          120 ||
        player.height_cm >
          230
      )
    ) {
      setMessage(
        "La altura debe encontrarse entre 120 y 230 cm."
      );

      return;
    }

    if (
      player.weight_kg !==
        null &&
      (
        player.weight_kg <
          30 ||
        player.weight_kg >
          180
      )
    ) {
      setMessage(
        "El peso debe encontrarse entre 30 y 180 kg."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    /* -----------------------------------------------------
       PAYLOAD

       IMPORTANTE:
       NO enviamos active.
       De esa forma un SCOUT nunca intenta modificarlo.
    ----------------------------------------------------- */

    const payload = {
      internal_code:
        player.internal_code
          ?.trim() ||
        null,

      first_name:
        player.first_name
          .trim(),

      last_name:
        player.last_name
          .trim(),

      birth_date:
        player.birth_date ||
        null,

      nationality:
        player.nationality
          ?.trim() ||
        null,

      position:
        player.position,

      specific_position:
        player.specific_position
          ?.trim() ||
        null,

      preferred_foot:
        player.preferred_foot ||
        null,

      height_cm:
        player.height_cm,

      weight_kg:
        player.weight_kg,

      current_club_id:
        player.current_club_id ||
        null,
    };

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "players"
          )
          .update(
            payload
          )
          .eq(
            "id",
            player.id
          );

      if (
        error
      ) {
        throw error;
      }

      setSuccessMessage(
        "Los datos del jugador fueron actualizados correctamente."
      );

      window.setTimeout(
        () => {
          window.location.href =
            `/players/${player.id}`;
        },
        800
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Error actualizando jugador:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el jugador."
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
      <div className="mx-auto max-w-5xl">

        <div className="card">

          <p className="text-sm text-slate-400">
            Cargando jugador...
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
            Para editar jugadores necesitás iniciar sesión.
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
    !canEdit
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
            pero no puede modificar fichas de jugadores.
          </p>

          <a
            href={`/players/${playerId}`}
            className="btn mt-5"
          >
            Volver a la ficha
          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     ERROR / NO JUGADOR
  ======================================================= */

  if (
    !player
  ) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <h1 className="text-2xl font-black">
            Jugador no disponible
          </h1>

          <p className="mt-3 text-slate-400">
            {message ||
              "No fue posible cargar esta ficha."}
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

      {/* CABECERA */}

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <div className="text-sm text-slate-400">
            Base maestra
          </div>

          <h1 className="text-3xl font-black">
            Editar jugador
          </h1>

          <p className="mt-2 text-slate-400">
            {player.first_name}{" "}
            {player.last_name}
          </p>

        </div>

        <a
          href={`/players/${player.id}`}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold transition hover:border-slate-500 hover:bg-slate-800"
        >
          Ver ficha
        </a>

      </div>

      {/* FORMULARIO */}

      <form
        onSubmit={
          handleSubmit
        }
        className="card grid gap-5 md:grid-cols-2"
      >

        {/* NOMBRE */}

        <Field
          label="Nombre"
          name="first_name"
          required
          value={
            player.first_name
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "first_name",
              event.target.value
            )
          }
        />

        {/* APELLIDO */}

        <Field
          label="Apellido"
          name="last_name"
          required
          value={
            player.last_name
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "last_name",
              event.target.value
            )
          }
        />

        {/* CÓDIGO */}

        <Field
          label="Código interno"
          name="internal_code"
          placeholder="ARG-GK-000001"
          value={
            player.internal_code ||
            ""
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "internal_code",
              event.target.value
            )
          }
        />

        {/* FECHA */}

        <Field
          label="Fecha de nacimiento"
          name="birth_date"
          type="date"
          value={
            player.birth_date ||
            ""
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "birth_date",
              event.target.value ||
                null
            )
          }
        />

        {/* NACIONALIDAD */}

        <Field
          label="Nacionalidad"
          name="nationality"
          placeholder="Argentina"
          value={
            player.nationality ||
            ""
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "nationality",
              event.target.value
            )
          }
        />

        {/* POSICIÓN */}

        <div>

          <label className="label">
            Posición
          </label>

          <select
            className="input"
            name="position"
            value={
              player.position
            }
            onChange={(
              event
            ) =>
              updateField(
                "position",
                event.target.value
              )
            }
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

        {/* POSICIÓN ESPECÍFICA */}

        <Field
          label="Posición específica"
          name="specific_position"
          placeholder="Arquero"
          value={
            player.specific_position ||
            ""
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "specific_position",
              event.target.value
            )
          }
        />

        {/* PIE */}

        <div>

          <label className="label">
            Pie hábil
          </label>

          <select
            className="input"
            name="preferred_foot"
            value={
              player.preferred_foot ||
              ""
            }
            onChange={(
              event
            ) =>
              updateField(
                "preferred_foot",
                event.target.value ||
                  null
              )
            }
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

        {/* ALTURA */}

        <Field
          label="Altura (cm)"
          name="height_cm"
          type="number"
          min="120"
          max="230"
          step="0.1"
          value={
            player.height_cm ??
            ""
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "height_cm",
              event.target.value
                ? Number(
                    event.target.value
                  )
                : null
            )
          }
        />

        {/* PESO */}

        <Field
          label="Peso (kg)"
          name="weight_kg"
          type="number"
          min="30"
          max="180"
          step="0.1"
          value={
            player.weight_kg ??
            ""
          }
          onChange={(
            event: React.ChangeEvent<HTMLInputElement>
          ) =>
            updateField(
              "weight_kg",
              event.target.value
                ? Number(
                    event.target.value
                  )
                : null
            )
          }
        />

        {/* CLUB */}

        <div className="md:col-span-2">

          <label className="label">
            Club actual
          </label>

          <select
            className="input"
            name="current_club_id"
            value={
              player.current_club_id ||
              ""
            }
            onChange={(
              event
            ) =>
              updateField(
                "current_club_id",
                event.target.value ||
                  null
              )
            }
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

        {/* ÉXITO */}

        {successMessage && (

          <div className="md:col-span-2 rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-200">
            {successMessage}
          </div>

        )}

        {/* ACCIONES */}

        <div className="md:col-span-2 flex flex-wrap justify-end gap-3 pt-3">

          <a
            href={`/players/${player.id}`}
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
              : "Guardar cambios"}
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
