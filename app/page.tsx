"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

/* =========================================================
   TIPOS
========================================================= */

type Player = {
  id: string;
  full_name: string;
  position: string;
  birth_date: string | null;
  height_cm: number | null;
  active: boolean;
};

type Tracking = {
  player_id: string;

  reports_count: number | null;
  matches_observed: number | null;
  minutes_observed: number | null;

  current_level_score: number | null;
  potential_score: number | null;
  consistency_score: number | null;

  recruitment_priority: number | null;
  observation_priority: number | null;

  evidence_level: string | null;
  trend: string | null;
};

type DashboardPlayer = {
  player: Player;
  tracking: Tracking | null;
};

/* =========================================================
   HELPERS
========================================================= */

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

function calculateAge(
  birthDate:
    | string
    | null
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

function evidenceLabel(
  value:
    | string
    | null
    | undefined
) {
  switch (value) {
    case "VERY_LOW":
      return "Muy baja";

    case "LOW":
      return "Baja";

    case "MODERATE":
      return "Moderada";

    case "HIGH":
      return "Alta";

    case "CONSOLIDATED":
      return "Consolidada";

    default:
      return "Sin evidencia";
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const [
    dashboardPlayers,
    setDashboardPlayers,
  ] =
    useState<
      DashboardPlayer[]
    >([]);

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

  /* =======================================================
     CARGA INICIAL
  ======================================================= */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    setErrorMessage("");

    /* -----------------------------------------------------
       SESIÓN
    ----------------------------------------------------- */

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getSession();

    if (authError) {
      console.error(
        "Error de autenticación:",
        authError
      );

      setErrorMessage(
        authError.message
      );

      setLoading(false);

      return;
    }

    if (!authData.session) {
      setAuthenticated(
        false
      );

      setDashboardPlayers(
        []
      );

      setLoading(false);

      return;
    }

    setAuthenticated(
      true
    );

    /* -----------------------------------------------------
       1. JUGADORES ACTIVOS
    ----------------------------------------------------- */

    const {
      data: playersData,
      error: playersError,
    } =
      await supabase
        .from("players")
        .select(`
          id,
          full_name,
          position,
          birth_date,
          height_cm,
          active
        `)
        .eq(
          "active",
          true
        )
        .order(
          "full_name",
          {
            ascending: true,
          }
        );

    if (playersError) {
      console.error(
        "Error cargando jugadores:",
        playersError
      );

      setErrorMessage(
        playersError.message
      );

      setLoading(false);

      return;
    }

    const activePlayers =
      (
        playersData ||
        []
      ) as Player[];

    /* -----------------------------------------------------
       2. TRACKING
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
          minutes_observed,
          current_level_score,
          potential_score,
          consistency_score,
          recruitment_priority,
          observation_priority,
          evidence_level,
          trend
        `);

    if (trackingError) {
      console.error(
        "Error cargando tracking:",
        trackingError
      );

      setErrorMessage(
        trackingError.message
      );

      setLoading(false);

      return;
    }

    const trackingRows =
      (
        trackingData ||
        []
      ) as Tracking[];

    /* -----------------------------------------------------
       3. MAPA TRACKING
    ----------------------------------------------------- */

    const trackingMap =
      new Map<
        string,
        Tracking
      >();

    trackingRows.forEach(
      (
        tracking
      ) => {
        trackingMap.set(
          tracking.player_id,
          tracking
        );
      }
    );

    /* -----------------------------------------------------
       4. COMBINAR
    ----------------------------------------------------- */

    const combined:
      DashboardPlayer[] =
      activePlayers.map(
        (
          player
        ) => ({
          player,

          tracking:
            trackingMap.get(
              player.id
            ) ||
            null,
        })
      );

    setDashboardPlayers(
      combined
    );

    setLoading(false);
  }

  /* =======================================================
     ESTADÍSTICAS
  ======================================================= */

  const totalPlayers =
    dashboardPlayers.length;

  const totalGoalkeepers =
    dashboardPlayers.filter(
      (
        item
      ) =>
        item.player.position ===
        "GK"
    ).length;

  const youngPromises =
    dashboardPlayers.filter(
      (
        item
      ) => {
        const age =
          calculateAge(
            item.player.birth_date
          );

        const potential =
          item.tracking
            ?.potential_score ??
          0;

        if (
          age === null
        ) {
          return false;
        }

        return (
          age <= 23 &&
          potential >= 8
        );
      }
    ).length;

  const priorityObservation =
    dashboardPlayers.filter(
      (
        item
      ) =>
        (
          item.tracking
            ?.observation_priority ??
          0
        ) >= 8
    ).length;

  /* =======================================================
     PRIORIDAD OBSERVACIÓN
  ======================================================= */

  const observationRanking =
    useMemo(
      () => {
        return [
          ...dashboardPlayers,
        ]
          .sort(
            (
              a,
              b
            ) =>
              (
                b.tracking
                  ?.observation_priority ??
                0
              ) -
              (
                a.tracking
                  ?.observation_priority ??
                0
              )
          )
          .slice(
            0,
            5
          );
      },
      [
        dashboardPlayers,
      ]
    );

  /* =======================================================
     PRIORIDAD INCORPORACIÓN
  ======================================================= */

  const recruitmentRanking =
    useMemo(
      () => {
        return [
          ...dashboardPlayers,
        ]
          .sort(
            (
              a,
              b
            ) =>
              (
                b.tracking
                  ?.recruitment_priority ??
                0
              ) -
              (
                a.tracking
                  ?.recruitment_priority ??
                0
              )
          )
          .slice(
            0,
            5
          );
      },
      [
        dashboardPlayers,
      ]
    );

  /* =======================================================
     CURRENT LEVEL
  ======================================================= */

  const currentRanking =
    useMemo(
      () => {
        return [
          ...dashboardPlayers,
        ]
          .sort(
            (
              a,
              b
            ) =>
              (
                b.tracking
                  ?.current_level_score ??
                0
              ) -
              (
                a.tracking
                  ?.current_level_score ??
                0
              )
          )
          .slice(
            0,
            10
          );
      },
      [
        dashboardPlayers,
      ]
    );

  /* =======================================================
     SIN SESIÓN
  ======================================================= */

  if (
    authenticated ===
    false
  ) {
    return (
      <div className="space-y-6">

        <div>

          <h1 className="text-3xl font-black">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Inteligencia longitudinal y prioridades de scouting.
          </p>

        </div>

        <div className="card">

          <h2 className="text-xl font-black">
            Acceso requerido
          </h2>

          <p className="mt-3 text-slate-400">
            Iniciá sesión para consultar el Dashboard.
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
     DASHBOARD
  ======================================================= */

  return (
    <div className="space-y-8">

      {/* ===================================================
          CABECERA
      =================================================== */}

      <div>

        <h1 className="text-3xl font-black">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          Inteligencia longitudinal y prioridades de scouting.
        </p>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {errorMessage && (

        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">

          <div className="flex items-start justify-between gap-4">

            <p className="text-sm text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(
                  ""
                )
              }
              className="text-sm text-slate-400 hover:text-white"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

      {/* ===================================================
          RESUMEN
      =================================================== */}

      <section className="grid gap-4 md:grid-cols-4">

        <StatCard
          label="Jugadores"
          value={
            totalPlayers
          }
        />

        <StatCard
          label="Arqueros"
          value={
            totalGoalkeepers
          }
        />

        <StatCard
          label="Jóvenes promesas"
          value={
            youngPromises
          }
        />

        <StatCard
          label="Seguimiento prioritario"
          value={
            priorityObservation
          }
        />

      </section>

      {/* ===================================================
          OBSERVACIÓN + INCORPORACIÓN
      =================================================== */}

      <section className="grid gap-4 lg:grid-cols-2">

        <RankingPanel
          title="Prioridad de observación"
          description="A quién conviene volver a observar."
          players={
            observationRanking
          }
          scoreField="observation_priority"
        />

        <RankingPanel
          title="Prioridad de incorporación"
          description="Jugadores con mejor combinación de rendimiento, potencial y decisión scout."
          players={
            recruitmentRanking
          }
          scoreField="recruitment_priority"
        />

      </section>

      {/* ===================================================
          CURRENT LEVEL
      =================================================== */}

      <section className="card">

        <div>

          <h2 className="text-xl font-black">
            Current Level
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Jugadores con mayor nivel acumulado.
          </p>

        </div>

        {loading ? (

          <div className="mt-5 text-sm text-slate-400">
            Actualizando Dashboard...
          </div>

        ) : currentRanking.length ===
          0 ? (

          <div className="mt-5 text-sm text-slate-500">
            No hay jugadores activos.
          </div>

        ) : (

          <div className="mt-5 space-y-3">

            {currentRanking.map(
              (
                item,
                index
              ) => (

                <CurrentLevelRow
                  key={
                    item.player.id
                  }
                  item={
                    item
                  }
                  index={
                    index + 1
                  }
                />

              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="card">

      <div className="text-sm text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>

    </div>
  );
}

/* =========================================================
   RANKING PANEL
========================================================= */

function RankingPanel({
  title,
  description,
  players,
  scoreField,
}: {
  title: string;

  description: string;

  players:
    DashboardPlayer[];

  scoreField:
    | "observation_priority"
    | "recruitment_priority";
}) {
  return (
    <div className="card">

      <div>

        <h2 className="text-xl font-black">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {description}
        </p>

      </div>

      <div className="mt-5 space-y-3">

        {players.length ===
        0 ? (

          <p className="text-sm text-slate-500">
            Sin jugadores priorizados.
          </p>

        ) : (

          players.map(
            (
              item,
              index
            ) => {

              const score =
                item.tracking
                  ?.[
                    scoreField
                  ];

              return (

                <a
                  key={
                    item.player.id
                  }
                  href={`/players/${item.player.id}`}
                  className="block rounded-xl border border-slate-800 p-4 transition hover:border-slate-600 hover:bg-slate-900/40"
                >

                  <div className="flex items-center justify-between gap-5">

                    <div className="flex min-w-0 items-center gap-4">

                      <div className="text-xl font-black text-slate-500">

                        {
                          index +
                          1
                        }

                      </div>

                      <div className="min-w-0">

                        <div className="truncate font-black">

                          {
                            item.player
                              .full_name
                          }

                        </div>

                        <div className="mt-1 text-xs text-slate-500">

                          {
                            item.player
                              .position
                          }

                          {item.player
                            .height_cm &&
                            ` · ${item.player.height_cm} cm`}

                          {" · "}

                          {
                            item.tracking
                              ?.reports_count ??
                            0
                          }{" "}
                          informe
                          {
                            (
                              item.tracking
                                ?.reports_count ??
                              0
                            ) ===
                            1
                              ? ""
                              : "s"
                          }

                        </div>

                        <div className="mt-1 text-xs text-slate-600">

                          Current{" "}

                          {formatScore(
                            item.tracking
                              ?.current_level_score
                          )}

                          {" · "}

                          Potential{" "}

                          {formatScore(
                            item.tracking
                              ?.potential_score
                          )}

                          {" · "}

                          {evidenceLabel(
                            item.tracking
                              ?.evidence_level
                          )}

                        </div>

                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-2xl font-black">

                        {formatScore(
                          score
                        )}

                      </div>

                      <div className="text-xs text-slate-500">
                        /10
                      </div>

                    </div>

                  </div>

                </a>

              );
            }
          )

        )}

      </div>

    </div>
  );
}

/* =========================================================
   CURRENT LEVEL ROW
========================================================= */

function CurrentLevelRow({
  item,
  index,
}: {
  item: DashboardPlayer;
  index: number;
}) {
  return (
    <a
      href={`/players/${item.player.id}`}
      className="block rounded-xl border border-slate-800 p-4 transition hover:border-slate-600 hover:bg-slate-900/40"
    >

      <div className="flex items-center justify-between gap-5">

        <div className="flex min-w-0 items-center gap-4">

          <div className="text-xl font-black text-slate-500">

            {index}

          </div>

          <div className="min-w-0">

            <div className="truncate font-black">

              {item.player.full_name}

            </div>

            <div className="mt-1 text-xs text-slate-500">

              {item.player.position}

              {item.player.height_cm &&
                ` · ${item.player.height_cm} cm`}

              {" · "}

              {item.tracking
                ?.reports_count ??
                0}{" "}
              informe
              {
                (
                  item.tracking
                    ?.reports_count ??
                  0
                ) === 1
                  ? ""
                  : "s"
              }

            </div>

            <div className="mt-1 text-xs text-slate-600">

              Potential{" "}

              {formatScore(
                item.tracking
                  ?.potential_score
              )}

              {" · "}

              {evidenceLabel(
                item.tracking
                  ?.evidence_level
              )}

            </div>

          </div>

        </div>

        <div className="text-right">

          <div className="text-2xl font-black">

            {formatScore(
              item.tracking
                ?.current_level_score
            )}

          </div>

          <div className="text-xs text-slate-500">
            /10
          </div>

        </div>

      </div>

    </a>
  );
}
