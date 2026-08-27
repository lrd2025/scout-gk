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

type DashboardRow = {
  player_id: string;

  reports_count: number;
  matches_observed: number;
  minutes_observed: number;

  current_level_score: number | null;
  potential_score: number | null;
  consistency_score: number | null;

  recruitment_priority: number | null;
  observation_priority: number | null;

  evidence_level: string | null;
  trend: string | null;

  players: {
    id: string;
    full_name: string;
    position: string;
    birth_date: string | null;
    height_cm: number | null;
    active: boolean;
  } | null;
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

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (
      month === 0 &&
      today.getDate() <
        birth.getDate()
    )
  ) {
    age--;
  }

  return age;
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const [
    rows,
    setRows,
  ] =
    useState<
      DashboardRow[]
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

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getSession();

    if (authError) {
      console.error(
        "Error leyendo sesión:",
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

      setRows([]);

      setLoading(false);

      return;
    }

    setAuthenticated(
      true
    );

    /* -----------------------------------------------------
       TRACKING + JUGADORES
    ----------------------------------------------------- */

    const {
      data,
      error,
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
          trend,

          players:player_id (
            id,
            full_name,
            position,
            birth_date,
            height_cm,
            active
          )
        `);

    if (error) {
      console.error(
        "Error cargando dashboard:",
        error
      );

      setErrorMessage(
        error.message
      );

      setRows([]);

      setLoading(false);

      return;
    }

    /* -----------------------------------------------------
       SOLO JUGADORES ACTIVOS
    ----------------------------------------------------- */

    const allRows =
      (
        data || []
      ) as unknown as
        DashboardRow[];

    const activeRows =
      allRows.filter(
        (
          row
        ) =>
          row.players &&
          row.players.active ===
            true
      );

    setRows(
      activeRows
    );

    setLoading(false);
  }

  /* =======================================================
     MÉTRICAS GENERALES
  ======================================================= */

  const totalPlayers =
    rows.length;

  const totalGoalkeepers =
    rows.filter(
      (
        row
      ) =>
        row.players
          ?.position ===
        "GK"
    ).length;

  const youngPromises =
    rows.filter(
      (
        row
      ) => {
        const age =
          calculateAge(
            row.players
              ?.birth_date ||
              null
          );

        if (
          age === null
        ) {
          return false;
        }

        return (
          age <= 23 &&
          (
            row.potential_score ??
            0
          ) >= 8
        );
      }
    ).length;

  const observationPriorityCount =
    rows.filter(
      (
        row
      ) =>
        (
          row.observation_priority ??
          0
        ) >= 8
    ).length;

  /* =======================================================
     RANKINGS
  ======================================================= */

  const observationRanking =
    useMemo(
      () => {
        return [
          ...rows,
        ]
          .filter(
            (
              row
            ) =>
              row.players &&
              row.players.active ===
                true
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                b.observation_priority ??
                0
              ) -
              (
                a.observation_priority ??
                0
              )
          )
          .slice(
            0,
            5
          );
      },
      [rows]
    );

  const recruitmentRanking =
    useMemo(
      () => {
        return [
          ...rows,
        ]
          .filter(
            (
              row
            ) =>
              row.players &&
              row.players.active ===
                true
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                b.recruitment_priority ??
                0
              ) -
              (
                a.recruitment_priority ??
                0
              )
          )
          .slice(
            0,
            5
          );
      },
      [rows]
    );

  const currentLevelRanking =
    useMemo(
      () => {
        return [
          ...rows,
        ]
          .filter(
            (
              row
            ) =>
              row.players &&
              row.players.active ===
                true
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                b.current_level_score ??
                0
              ) -
              (
                a.current_level_score ??
                0
              )
          )
          .slice(
            0,
            5
          );
      },
      [rows]
    );

  /* =======================================================
     SIN SESIÓN
  ======================================================= */

  if (
    authenticated ===
    false
  ) {
    return (
      <div className="dashboard-shell">

        <section className="hero-panel">

          <div className="hero-copy">

            <h1 className="hero-title">
              Scout GK
            </h1>

            <p className="hero-subtitle">
              Inteligencia,
              análisis y
              valoración
              longitudinal de
              arqueros.
            </p>

          </div>

          <div className="hero-badge">

            <strong>
              ATHLON BASE
            </strong>

            <span>
              Departamento de
              Scouting
            </span>

          </div>

        </section>

        <section className="card">

          <h2 className="panel-title">

            <span className="panel-title-dot">
              ⌑
            </span>

            Acceso requerido

          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Iniciá sesión para
            consultar rankings,
            prioridades y
            seguimiento.
          </p>

          <a
            href="/login"
            className="btn mt-5"
          >
            Ingresar
          </a>

        </section>

      </div>
    );
  }

  /* =======================================================
     DASHBOARD PRINCIPAL
  ======================================================= */

  return (
    <div className="dashboard-shell">

      {/* HERO */}

      <section className="hero-panel">

        <div className="hero-copy">

          <h1 className="hero-title">
            Bienvenido a Scout GK
          </h1>

          <p className="hero-subtitle">
            Inteligencia,
            datos y contexto
            para decisiones de
            scouting.
          </p>

        </div>

        <div className="hero-badge">

          <strong>
            SCOUT GK
          </strong>

          <span>
            Inteligencia y
            valoración de
            arqueros
          </span>

        </div>

      </section>

      {/* ERROR */}

      {errorMessage && (
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">

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

        </section>
      )}

      {/* ESTADÍSTICAS */}

      <section className="stat-grid">

        <StatCard
          icon="♙"
          label="Jugadores"
          value={
            totalPlayers
          }
          caption="Base activa"
        />

        <StatCard
          icon="✋"
          label="Arqueros"
          value={
            totalGoalkeepers
          }
          caption="Especialidad GK"
        />

        <StatCard
          icon="★"
          label="Jóvenes promesas"
          value={
            youngPromises
          }
          caption="Proyección U23"
        />

        <StatCard
          icon="◎"
          label="Seguimiento prioritario"
          value={
            observationPriorityCount
          }
          caption="En observación"
        />

      </section>

      {/* RANKINGS */}

      <section className="ranking-grid">

        <RankingCard
          icon="✪"
          title="Top Current Level"
          description="Arqueros con mayor nivel acumulado."
          rows={
            currentLevelRanking
          }
          field="current_level_score"
        />

        <RankingCard
          icon="◎"
          title="Prioridad de observación"
          description="A quién conviene volver a observar."
          rows={
            observationRanking
          }
          field="observation_priority"
        />

      </section>

      <section className="ranking-grid">

        <RankingCard
          icon="↗"
          title="Prioridad de incorporación"
          description="Mejor combinación de rendimiento, potencial y decisión scout."
          rows={
            recruitmentRanking
          }
          field="recruitment_priority"
        />

        {/* ACCIONES RÁPIDAS */}

        <section className="card">

          <h2 className="panel-title">

            <span className="panel-title-dot">
              ⚡
            </span>

            Acciones rápidas

          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Accesos directos
            a las tareas
            principales.
          </p>

          <div className="quick-actions mt-5">

            <a
              href="/players/new"
              className="quick-action primary"
            >
              <span className="quick-action-icon">
                ♙
              </span>

              Nuevo jugador
            </a>

            <a
              href="/videos/new"
              className="quick-action"
            >
              <span className="quick-action-icon">
                ▶
              </span>

              Nuevo video
            </a>

            <a
              href="/reports/new"
              className="quick-action"
            >
              <span className="quick-action-icon">
                ▤
              </span>

              Generar informe
            </a>

            <a
              href="/compare"
              className="quick-action"
            >
              <span className="quick-action-icon">
                ⚖
              </span>

              Comparar arqueros
            </a>

          </div>

        </section>

      </section>

      {/* CARGANDO */}

      {loading && (
        <div className="card text-sm text-slate-400">
          Actualizando
          dashboard...
        </div>
      )}

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: string;
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="card dashboard-stat">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="mt-3 text-sm text-slate-300">
        {label}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-caption">
        {caption}
      </div>

    </div>
  );
}

/* =========================================================
   RANKING CARD
========================================================= */

function RankingCard({
  icon,
  title,
  description,
  rows,
  field,
}: {
  icon: string;
  title: string;
  description: string;

  rows:
    DashboardRow[];

  field:
    | "current_level_score"
    | "observation_priority"
    | "recruitment_priority";
}) {
  return (
    <div className="card">

      <h2 className="panel-title">

        <span className="panel-title-dot">
          {icon}
        </span>

        {title}

      </h2>

      <p className="mt-1 text-sm text-slate-400">
        {description}
      </p>

      <div className="mt-5">

        {rows.length ===
        0 ? (

          <p className="text-sm text-slate-500">
            Sin jugadores
            priorizados.
          </p>

        ) : (

          rows.map(
            (
              row,
              index
            ) => (

              <PlayerRow
                key={
                  row.player_id
                }
                index={
                  index + 1
                }
                row={
                  row
                }
                value={
                  row[field]
                }
              />

            )
          )

        )}

      </div>

    </div>
  );
}

/* =========================================================
   PLAYER ROW
========================================================= */

function PlayerRow({
  row,
  value,
  index,
}: {
  row: DashboardRow;

  value:
    | number
    | null;

  index: number;
}) {
  const player =
    row.players;

  if (
    !player ||
    player.active !==
      true
  ) {
    return null;
  }

  const safeScore =
    Math.max(
      0,
      Math.min(
        10,
        Number(
          value ??
            0
        )
      )
    );

  return (
    <a
      href={`/players/${player.id}`}
      className="player-rank-row"
    >

      <div className="rank-number">
        {index}
      </div>

      <div className="rank-main">

        <div className="rank-name">
          {player.full_name}
        </div>

        <div className="rank-meta">

          {player.position}

          {player.height_cm &&
            ` · ${player.height_cm} cm`}

          {" · "}

          {row.reports_count}{" "}
          informe

          {row.reports_count ===
          1
            ? ""
            : "s"}

        </div>

        <div className="rank-meta">

          Current{" "}

          {formatScore(
            row.current_level_score
          )}

          {" · "}

          Potential{" "}

          {formatScore(
            row.potential_score
          )}

          {" · "}

          {evidenceLabel(
            row.evidence_level
          )}

        </div>

      </div>

      <div className="rank-score">

        {formatScore(
          value
        )}

        <small>
          /10
        </small>

        <div className="score-bar">

          <span
            style={{
              width:
                `${safeScore * 10}%`,
            }}
          />

        </div>

      </div>

    </a>
  );
}
