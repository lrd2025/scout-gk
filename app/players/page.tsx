"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

import {
  useCurrentUser,
} from "../../lib/useCurrentUser";

/* =========================================================
   TIPOS
========================================================= */

type Player = {
  id: string;
  internal_code: string | null;
  full_name: string;
  birth_date: string | null;
  nationality: string | null;
  position: string;
  preferred_foot: string | null;
  height_cm: number | null;

  clubs: {
    name: string;
  } | null;
};

type Tracking = {
  player_id: string;
  reports_count: number;
  matches_observed: number;
  avg_global_score: number | null;
  current_level_score: number | null;
  potential_score: number | null;
  recruitment_priority: number | null;
  observation_priority: number | null;
  trend: string | null;
  evidence_level: string | null;
};

type PlayerView =
  Player & {
    tracking?: Tracking | null;
  };

/* =========================================================
   HELPERS
========================================================= */

function calculateAge(
  birthDate: string | null
) {
  if (!birthDate) {
    return null;
  }

  const birth =
    new Date(birthDate);

  const today =
    new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birth.getDate()
    )
  ) {
    age--;
  }

  return age;
}

function formatScore(
  value:
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return Number(
    value
  ).toFixed(2);
}

function trendLabel(
  value:
    | string
    | null
    | undefined
) {
  switch (value) {
    case "UP":
    case "ASCENDING":
      return "↑ Ascendente";

    case "DOWN":
    case "DESCENDING":
      return "↓ Descendente";

    case "STABLE":
      return "→ Estable";

    default:
      return "—";
  }
}

function priorityLabel(
  value:
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (value >= 9) {
    return "Muy alta";
  }

  if (value >= 8) {
    return "Alta";
  }

  if (value >= 7) {
    return "Media";
  }

  if (value >= 5) {
    return "Seguimiento";
  }

  return "Baja";
}

function positionLabel(
  value: string
) {
  switch (value) {
    case "GK":
      return "Arquero";

    case "DF":
      return "Defensor";

    case "MF":
      return "Mediocampista";

    case "FW":
      return "Delantero";

    default:
      return value;
  }
}

/* =========================================================
   PÁGINA
========================================================= */

export default function PlayersPage() {
  const {
    profile,
    loading: profileLoading,
    can,
  } =
    useCurrentUser();

  const [
    players,
    setPlayers,
  ] =
    useState<PlayerView[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    positionFilter,
    setPositionFilter,
  ] =
    useState("ALL");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] =
    useState<
      boolean | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

  /* =======================================================
     PERMISOS
  ======================================================= */

  const canViewPlayers =
    can(
      "players:view"
    );

  const canCreatePlayer =
    can(
      "players:create"
    );

  const canEditPlayer =
    can(
      "players:edit"
    );

  const canDeactivatePlayer =
    can(
      "players:delete"
    );

  /* =======================================================
     CARGA INICIAL
  ======================================================= */

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: authData,
    } =
      await supabase.auth
        .getSession();

    if (
      !authData.session
    ) {
      setAuthenticated(
        false
      );

      setLoading(false);

      return;
    }

    setAuthenticated(
      true
    );

    /* -----------------------------------------------------
       JUGADORES ACTIVOS
    ----------------------------------------------------- */

    const {
      data: playerData,
      error: playerError,
    } =
      await supabase
        .from("players")
        .select(`
          id,
          internal_code,
          full_name,
          birth_date,
          nationality,
          position,
          preferred_foot,
          height_cm,

          clubs:current_club_id (
            name
          )
        `)
        .eq(
          "active",
          true
        )
        .order(
          "last_name",
          {
            ascending:
              true,
          }
        );

    if (
      playerError
    ) {
      setErrorMessage(
        playerError.message
      );

      setLoading(false);

      return;
    }

    /* -----------------------------------------------------
       TRACKING
    ----------------------------------------------------- */

    const {
      data: trackingData,
      error: trackingError,
    } =
      await supabase
        .from(
          "player_tracking_metadata"
        )
        .select(`
          player_id,
          reports_count,
          matches_observed,
          avg_global_score,
          current_level_score,
          potential_score,
          recruitment_priority,
          observation_priority,
          trend,
          evidence_level
        `);

    if (
      trackingError
    ) {
      setErrorMessage(
        trackingError.message
      );

      setLoading(false);

      return;
    }

    const trackingMap =
      new Map<
        string,
        Tracking
      >();

    (
      trackingData ||
      []
    ).forEach(
      (
        tracking: Tracking
      ) => {
        trackingMap.set(
          tracking.player_id,
          tracking
        );
      }
    );

    const combined:
      PlayerView[] =
      (
        playerData ||
        []
      ).map(
        (
          player: any
        ) => ({
          ...player,

          tracking:
            trackingMap.get(
              player.id
            ) || null,
        })
      );

    setPlayers(
      combined
    );

    setLoading(
      false
    );
  }

  /* =======================================================
     BAJA LÓGICA
     SOLO ADMINISTRADOR
  ======================================================= */

  async function deletePlayer(
    player: PlayerView
  ) {
    /*
     * Segunda barrera de seguridad en la interfaz.
     * No alcanza con ocultar el botón.
     */

    if (
      !can(
        "players:delete"
      )
    ) {
      setErrorMessage(
        "No tenés permisos para quitar jugadores de la base activa."
      );

      return;
    }

    const reportsCount =
      player.tracking
        ?.reports_count ??
      0;

    const matchesObserved =
      player.tracking
        ?.matches_observed ??
      0;

    const confirmed =
      window.confirm(
        `¿Quitar este jugador de la base activa?\n\n` +
          `${player.full_name}\n` +
          `Informes: ${reportsCount}\n` +
          `Partidos observados: ${matchesObserved}\n\n` +
          `La ficha no será eliminada físicamente. ` +
          `Se conservarán informes, videos e historial.\n\n` +
          `¿Deseás continuar?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      player.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "players"
          )
          .update({
            active: false,
          })
          .eq(
            "id",
            player.id
          );

      if (error) {
        throw error;
      }

      setPlayers(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              player.id
          )
      );

      setSuccessMessage(
        `${player.full_name} fue quitado de la base activa. Su historial permanece conservado.`
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Error dando de baja jugador:",
        error
      );

      let message =
        "No se pudo quitar el jugador.";

      if (
        typeof error ===
          "object" &&
        error !== null &&
        "message" in error
      ) {
        const possibleError =
          error as {
            message?: string;
          };

        if (
          possibleError.message
        ) {
          message =
            possibleError.message;
        }
      }

      setErrorMessage(
        message
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  /* =======================================================
     FILTROS
  ======================================================= */

  const filteredPlayers =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        return players.filter(
          (player) => {
            const searchText =
              [
                player.full_name,
                player.internal_code,
                player.nationality,
                player.clubs
                  ?.name,
              ]
                .filter(
                  Boolean
                )
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !term ||
              searchText.includes(
                term
              );

            const matchesPosition =
              positionFilter ===
                "ALL" ||
              player.position ===
                positionFilter;

            return (
              matchesSearch &&
              matchesPosition
            );
          }
        );
      },
      [
        players,
        search,
        positionFilter,
      ]
    );

  /* =======================================================
     CARGANDO PERFIL
  ======================================================= */

  if (
    profileLoading
  ) {
    return (
      <div className="card">

        <p className="text-sm text-slate-400">
          Verificando permisos...
        </p>

      </div>
    );
  }

  /* =======================================================
     ACCESO SIN SESIÓN
  ======================================================= */

  if (
    authenticated ===
      false ||
    !profile
  ) {
    return (
      <div className="space-y-6">

        <div>

          <h1 className="text-3xl font-black">
            Jugadores
          </h1>

          <p className="mt-2 text-slate-400">
            Base maestra de jugadores y arqueros.
          </p>

        </div>

        <div className="card">

          <h2 className="text-xl font-bold">
            Acceso requerido
          </h2>

          <p className="mt-3 text-slate-400">
            Para consultar o cargar jugadores necesitás iniciar sesión.
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
     SIN PERMISO DE CONSULTA
  ======================================================= */

  if (
    !canViewPlayers
  ) {
    return (
      <div className="space-y-6">

        <div>

          <h1 className="text-3xl font-black">
            Jugadores
          </h1>

        </div>

        <div className="card">

          <h2 className="text-xl font-bold">
            Acceso restringido
          </h2>

          <p className="mt-3 text-slate-400">
            Tu perfil no tiene permisos para consultar la base de jugadores.
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-6">

      {/* CABECERA */}

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <h1 className="text-3xl font-black">
            Jugadores
          </h1>

          <p className="mt-2 text-slate-400">
            Base maestra y seguimiento longitudinal.
          </p>

        </div>

        {/* NUEVO JUGADOR:
            ADMIN + SCOUT
        */}

        {canCreatePlayer && (

          <a
            href="/players/new"
            className="btn"
          >
            + Nuevo jugador
          </a>

        )}

      </div>

      {/* MENSAJES */}

      {errorMessage && (

        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">

          <div className="flex items-start justify-between gap-4">

            <div className="text-sm text-red-200">
              {errorMessage}
            </div>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(
                  ""
                )
              }
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

      {successMessage && (

        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">

          <div className="flex items-start justify-between gap-4">

            <div className="text-sm text-emerald-200">
              {successMessage}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

      {/* FILTROS */}

      <section className="card">

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">

          <div>

            <label className="label">
              Buscar
            </label>

            <input
              className="input"
              placeholder="Nombre, club, nacionalidad o código..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

          <div>

            <label className="label">
              Posición
            </label>

            <select
              className="input"
              value={
                positionFilter
              }
              onChange={(event) =>
                setPositionFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                Todas
              </option>

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

        </div>

      </section>

      {/* TABLA */}

      <section className="card overflow-x-auto">

        {loading ? (

          <p className="text-sm text-slate-400">
            Cargando jugadores...
          </p>

        ) : filteredPlayers.length ===
          0 ? (

          <div>

            <h2 className="text-lg font-bold">
              No hay jugadores
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              No existen jugadores que coincidan con los filtros seleccionados.
            </p>

          </div>

        ) : (

          <table className="w-full min-w-[1250px] text-left text-sm">

            <thead className="border-b border-slate-700 text-slate-400">

              <tr>

                <th className="py-3 pr-4">
                  Jugador
                </th>

                <th className="py-3 pr-4">
                  Pos.
                </th>

                <th className="py-3 pr-4">
                  Edad
                </th>

                <th className="py-3 pr-4">
                  Altura
                </th>

                <th className="py-3 pr-4">
                  Club
                </th>

                <th className="py-3 pr-4">
                  Informes
                </th>

                <th className="py-3 pr-4">
                  Score
                </th>

                <th className="py-3 pr-4">
                  Potential
                </th>

                <th className="py-3 pr-4">
                  Tendencia
                </th>

                <th className="py-3 pr-4">
                  Prioridad
                </th>

                <th className="py-3 text-right">
                  Acciones
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredPlayers.map(
                (player) => {
                  const age =
                    calculateAge(
                      player.birth_date
                    );

                  return (

                    <tr
                      key={
                        player.id
                      }
                      className="border-b border-slate-800"
                    >

                      {/* JUGADOR */}

                      <td className="py-4 pr-4">

                        <a
                          href={`/players/${player.id}`}
                          className="font-bold hover:underline"
                        >
                          {player.full_name}
                        </a>

                        <div className="mt-1 text-xs text-slate-500">
                          {player.internal_code ||
                            "Sin código"}
                        </div>

                      </td>

                      {/* POSICIÓN */}

                      <td className="py-4 pr-4">
                        {positionLabel(
                          player.position
                        )}
                      </td>

                      {/* EDAD */}

                      <td className="py-4 pr-4">
                        {age ?? "—"}
                      </td>

                      {/* ALTURA */}

                      <td className="py-4 pr-4">

                        {player.height_cm
                          ? `${player.height_cm} cm`
                          : "—"}

                      </td>

                      {/* CLUB */}

                      <td className="py-4 pr-4">

                        {player.clubs
                          ?.name ||
                          "—"}

                      </td>

                      {/* INFORMES */}

                      <td className="py-4 pr-4">

                        {player.tracking
                          ?.reports_count ??
                          0}

                      </td>

                      {/* SCORE */}

                      <td className="py-4 pr-4 font-bold">

                        {formatScore(
                          player.tracking
                            ?.current_level_score ??
                            player.tracking
                              ?.avg_global_score
                        )}

                      </td>

                      {/* POTENCIAL */}

                      <td className="py-4 pr-4">

                        {formatScore(
                          player.tracking
                            ?.potential_score
                        )}

                      </td>

                      {/* TENDENCIA */}

                      <td className="py-4 pr-4">

                        {trendLabel(
                          player.tracking
                            ?.trend
                        )}

                      </td>

                      {/* PRIORIDAD */}

                      <td className="py-4 pr-4">

                        {priorityLabel(
                          player.tracking
                            ?.recruitment_priority
                        )}

                      </td>

                      {/* ACCIONES */}

                      <td className="py-4 text-right">

                        <div className="flex justify-end gap-2">

                          {/* TODOS */}

                          <a
                            href={`/players/${player.id}`}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold transition hover:border-slate-500 hover:bg-slate-800"
                          >
                            Ver
                          </a>

                          {/* ADMIN + SCOUT */}

                          {canEditPlayer && (

                            <a
                              href={`/players/${player.id}/edit`}
                              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold transition hover:border-slate-500 hover:bg-slate-800"
                            >
                              Editar
                            </a>

                          )}

                          {/* SOLO ADMIN */}

                          {canDeactivatePlayer && (

                            <button
                              type="button"
                              disabled={
                                deletingId ===
                                player.id
                              }
                              onClick={() =>
                                deletePlayer(
                                  player
                                )
                              }
                              className="rounded-lg border border-red-900/70 px-3 py-2 text-xs font-bold text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {deletingId ===
                              player.id
                                ? "Quitando..."
                                : "Quitar"}

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  );
                }
              )}

            </tbody>

          </table>

        )}

      </section>

    </div>
  );
}
