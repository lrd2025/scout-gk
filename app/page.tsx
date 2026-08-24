"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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
  } | null;
};

function formatScore(
  value: number | null | undefined
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toFixed(2);
}

function evidenceLabel(
  value: string | null | undefined
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
      return "—";
  }
}

function trendLabel(
  value: string | null | undefined
) {
  if (value === "ASCENDING") {
    return "↑ Ascendente";
  }

  if (value === "DESCENDING") {
    return "↓ Descendente";
  }

  return "→ Estable";
}

function calculateAge(
  birthDate: string | null
) {
  if (!birthDate) {
    return null;
  }

  const birth = new Date(birthDate);
  const today = new Date();

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

export default function Dashboard() {
  const [rows, setRows] =
    useState<DashboardRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState<boolean | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: authData,
    } =
      await supabase.auth.getSession();

    if (!authData.session) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    setAuthenticated(true);

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
            height_cm
          )
        `);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setRows(
      (data || []) as unknown as DashboardRow[]
    );

    setLoading(false);
  }

  const totalPlayers =
    rows.length;

  const totalGoalkeepers =
    rows.filter(
      (row) =>
        row.players?.position === "GK"
    ).length;

  const youngPromises =
    rows.filter((row) => {
      const age =
        calculateAge(
          row.players?.birth_date || null
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
    }).length;

  const observationPriorityCount =
    rows.filter(
      (row) =>
        (
          row.observation_priority ??
          0
        ) >= 8
    ).length;

  const observationRanking =
    useMemo(() => {
      return [...rows]
        .filter(
          (row) =>
            row.players
        )
        .sort(
          (a, b) =>
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
    }, [rows]);

  const recruitmentRanking =
    useMemo(() => {
      return [...rows]
        .filter(
          (row) =>
            row.players
        )
        .sort(
          (a, b) =>
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
    }, [rows]);

  const currentLevelRanking =
    useMemo(() => {
      return [...rows]
        .filter(
          (row) =>
            row.players
        )
        .sort(
          (a, b) =>
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
    }, [rows]);

  if (
    authenticated === false
  ) {
    return (
      <div className="space-y-6">

        <div>
          <h1 className="text-3xl font-black">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Inteligencia longitudinal de scouting.
          </p>
        </div>

        <div className="card">

          <h2 className="text-xl font-black">
            Acceso requerido
          </h2>

          <p className="mt-3 text-slate-400">
            Iniciá sesión para consultar rankings,
            prioridades y seguimiento.
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

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-3xl font-black">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          Inteligencia longitudinal y prioridades de scouting.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">

        <StatCard
          label="Jugadores"
          value={totalPlayers}
        />

        <StatCard
          label="Arqueros"
          value={totalGoalkeepers}
        />

        <StatCard
          label="Jóvenes promesas"
          value={youngPromises}
        />

        <StatCard
          label="Seguimiento prioritario"
          value={
            observationPriorityCount
          }
        />

      </section>

      <section className="grid gap-4 xl:grid-cols-2">

        <RankingCard
          title="Prioridad de observación"
          description="A quién conviene volver a observar."
          rows={
            observationRanking
          }
          field="observation_priority"
        />

        <RankingCard
          title="Prioridad de incorporación"
          description="Jugadores con mejor combinación de rendimiento, potencial y decisión scout."
          rows={
            recruitmentRanking
          }
          field="recruitment_priority"
        />

      </section>

      <section className="card">

        <h2 className="text-xl font-black">
          Current Level
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Jugadores con mayor nivel acumulado.
        </p>

        <div className="mt-5 space-y-3">

          {currentLevelRanking.length ===
          0 ? (
            <p className="text-sm text-slate-500">
              Todavía no hay jugadores evaluados.
            </p>
          ) : (
            currentLevelRanking.map(
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
                  row={row}
                  value={
                    row.current_level_score
                  }
                />
              )
            )
          )}

        </div>

      </section>

      {loading && (
        <div className="card text-sm text-slate-400">
          Actualizando dashboard...
        </div>
      )}

    </div>
  );
}

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

function RankingCard({
  title,
  description,
  rows,
  field,
}: {
  title: string;
  description: string;
  rows: DashboardRow[];
  field:
    | "observation_priority"
    | "recruitment_priority";
}) {
  return (
    <div className="card">

      <h2 className="text-xl font-black">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        {description}
      </p>

      <div className="mt-5 space-y-3">

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Sin jugadores priorizados.
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
                row={row}
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

  if (!player) {
    return null;
  }

  return (
    <a
      href={`/players/${player.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 p-4 hover:bg-slate-900"
    >

      <div className="flex min-w-0 gap-4">

        <div className="text-xl font-black text-slate-500">
          {index}
        </div>

        <div className="min-w-0">

          <div className="truncate font-bold">
            {
              player.full_name
            }
          </div>

          <div className="mt-1 text-xs text-slate-500">

            {player.position}

            {player.height_cm &&
              ` · ${player.height_cm} cm`}

            {" · "}

            {
              row.reports_count
            }{" "}
            informe{
              row.reports_count ===
              1
                ? ""
                : "s"
            }

          </div>

          <div className="mt-1 text-xs text-slate-600">

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

            {
              evidenceLabel(
                row.evidence_level
              )
            }

          </div>

        </div>

      </div>

      <div className="text-right">

        <div className="text-2xl font-black">
          {formatScore(
            value
          )}
        </div>

        <div className="text-xs text-slate-500">
          /10
        </div>

      </div>

    </a>
  );
}
