"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";

import { supabase } from "../../../lib/supabase";

type Player = {
  id: string;
  internal_code: string | null;
  full_name: string;
  birth_date: string | null;
  nationality: string | null;
  position: string;
  specific_position: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  clubs: {
    name: string;
  } | null;
};

type Tracking = {
  reports_count: number;
  matches_observed: number;
  minutes_observed: number;

  avg_global_score: number | null;
  last_global_score: number | null;

  current_level_score: number | null;
  potential_score: number | null;

  consistency_score: number | null;

  recruitment_priority: number | null;
  observation_priority: number | null;

  evidence_level: string | null;
  trend: string | null;
};

type Report = {
  id: string;
  report_date: string;
  global_score: number | null;
  tracking_line: string | null;
  general_observation: string | null;
};

function calculateAge(value: string | null) {
  if (!value) return null;

  const birth = new Date(value);

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function score(value: number | null | undefined) {
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
      return "Muy baja";
  }
}

export default function PlayerPage() {
  const params = useParams<{
    id: string;
  }>();

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [tracking, setTracking] =
    useState<Tracking | null>(null);

  const [reports, setReports] =
    useState<Report[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadPlayer();
  }, [params.id]);

  async function loadPlayer() {
    const { data: authData } =
      await supabase.auth.getSession();

    if (!authData.session) {
      setLoading(false);
      return;
    }

    const { data: playerData } =
      await supabase
        .from("players")
        .select(`
          id,
          internal_code,
          full_name,
          birth_date,
          nationality,
          position,
          specific_position,
          preferred_foot,
          height_cm,
          weight_kg,
          clubs:current_club_id (
            name
          )
        `)
        .eq("id", params.id)
        .single();

    const { data: trackingData } =
      await supabase
        .from(
          "player_tracking_metadata"
        )
        .select("*")
        .eq("player_id", params.id)
        .maybeSingle();

    const { data: reportsData } =
      await supabase
        .from("scouting_reports")
        .select(`
          id,
          report_date,
          global_score,
          tracking_line,
          general_observation
        `)
        .eq("player_id", params.id)
        .order("report_date", {
          ascending: false,
        });

    setPlayer(
      playerData as unknown as Player
    );

    setTracking(
      trackingData as Tracking | null
    );

    setReports(
      (reportsData || []) as Report[]
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="card">
        Cargando ficha...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="card">
        <h1 className="text-2xl font-black">
          Jugador no disponible
        </h1>

        <p className="mt-3 text-slate-400">
          Verificá que el jugador exista o iniciá sesión.
        </p>

        <a
          href="/login"
          className="btn mt-5"
        >
          Ingresar
        </a>
      </div>
    );
  }

  const age = calculateAge(
    player.birth_date
  );

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-sm text-slate-400">
              {player.internal_code ||
                "Sin código interno"}
            </div>

            <h1 className="mt-1 text-4xl font-black">
              {player.full_name}
            </h1>

            <div className="mt-3 text-slate-300">
              {player.specific_position ||
                player.position}

              {age !== null &&
                ` · ${age} años`}

              {player.height_cm &&
                ` · ${player.height_cm} cm`}

              {player.preferred_foot &&
                ` · ${player.preferred_foot}`}
            </div>

            <div className="mt-2 text-sm text-slate-500">
              {player.nationality ||
                "Nacionalidad sin registrar"}

              {" · "}

              {player.clubs?.name ||
                "Club sin registrar"}
            </div>
          </div>

          <a
            href={`/reports/new?player=${player.id}`}
            className="btn"
          >
            + Nuevo informe
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <ScoreCard
          label="Current Level"
          value={score(
            tracking?.current_level_score ??
              tracking?.avg_global_score
          )}
        />

        <ScoreCard
          label="Potential"
          value={score(
            tracking?.potential_score
          )}
        />

        <ScoreCard
          label="Consistency"
          value={score(
            tracking?.consistency_score
          )}
        />

        <ScoreCard
          label="Recruitment"
          value={score(
            tracking?.recruitment_priority
          )}
        />

        <ScoreCard
          label="Observation"
          value={score(
            tracking?.observation_priority
          )}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard
          label="Informes"
          value={String(
            tracking?.reports_count ?? 0
          )}
        />

        <InfoCard
          label="Partidos observados"
          value={String(
            tracking?.matches_observed ?? 0
          )}
        />

        <InfoCard
          label="Minutos observados"
          value={String(
            tracking?.minutes_observed ?? 0
          )}
        />

        <InfoCard
          label="Evidencia"
          value={evidenceLabel(
            tracking?.evidence_level
          )}
        />
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">
              Historial de scouting
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Evaluaciones ordenadas desde la más reciente.
            </p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-800 p-5">
            <p className="text-slate-400">
              Todavía no hay informes cargados.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-bold">
                      {new Date(
                        report.report_date
                      ).toLocaleDateString(
                        "es-AR"
                      )}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {report.tracking_line ||
                        "Sin línea definida"}
                    </div>
                  </div>

                  <div className="text-2xl font-black">
                    {score(
                      report.global_score
                    )}
                  </div>
                </div>

                {report.general_observation && (
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {
                      report.general_observation
                    }
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>

      <div className="text-xs text-slate-500">
        /10
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black">
        {value}
      </div>
    </div>
  );
}
