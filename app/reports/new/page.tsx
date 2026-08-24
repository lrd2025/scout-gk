"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Player = {
  id: string;
  full_name: string;
  birth_date: string | null;
  nationality: string | null;
  position: string;
  specific_position: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
};

type Metric = {
  id: string;
  code: string;
  group_name: string;
  label: string;
  sort_order: number;
};

function calculateAge(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

export default function NewReportPage() {
  const searchParams = useSearchParams();
  const playerId = searchParams.get("player");

  const [player, setPlayer] = useState<Player | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, [playerId]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getSession();

    if (!authData.session) {
      setMessage("Necesitás iniciar sesión.");
      setLoading(false);
      return;
    }

    if (!playerId) {
      setMessage("No se indicó el jugador a evaluar.");
      setLoading(false);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(`
        id,
        full_name,
        birth_date,
        nationality,
        position,
        specific_position,
        preferred_foot,
        height_cm
      `)
      .eq("id", playerId)
      .single();

    if (playerError) {
      setMessage(playerError.message);
      setLoading(false);
      return;
    }

    const { data: metricsData, error: metricsError } = await supabase
      .from("evaluation_metrics")
      .select(`
        id,
        code,
        group_name,
        label,
        sort_order
      `)
      .eq("position", "GK")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (metricsError) {
      setMessage(metricsError.message);
      setLoading(false);
      return;
    }

    setPlayer(playerData as Player);

    const loadedMetrics = (metricsData || []) as Metric[];

    setMetrics(loadedMetrics);

    const initialScores: Record<string, number> = {};

    loadedMetrics.forEach((metric) => {
      initialScores[metric.id] = 5;
    });

    setScores(initialScores);

    setLoading(false);
  }

  const globalScore = useMemo(() => {
    const values = Object.values(scores);

    if (!values.length) return 0;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [scores]);

  const groupedMetrics = useMemo(() => {
    const groups: Record<string, Metric[]> = {};

    metrics.forEach((metric) => {
      if (!groups[metric.group_name]) {
        groups[metric.group_name] = [];
      }

      groups[metric.group_name].push(metric);
    });

    return groups;
  }, [metrics]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!playerId) return;

    setSaving(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getSession();

    if (!authData.session) {
      setSaving(false);
      setMessage("La sesión no está activa.");
      return;
    }

    const form = new FormData(event.currentTarget);

    const trackingLine = String(
      form.get("tracking_line") || ""
    );

    const reportPayload = {
      player_id: playerId,

      report_date:
        String(form.get("report_date") || "") ||
        new Date().toISOString().split("T")[0],

      minutes_observed:
        form.get("minutes_observed")
          ? Number(form.get("minutes_observed"))
          : null,

      formation:
        String(form.get("formation") || "").trim() || null,

      tracking_line:
        trackingLine || null,

      general_observation:
        String(form.get("general_observation") || "").trim() ||
        null,

      injury_flag:
        String(form.get("injury_flag") || "false") === "true",

      national_team_flag:
        String(form.get("national_team_flag") || "false") === "true",

      global_score:
        Number(globalScore.toFixed(2)),

      report_status: "FINAL",
    };

    const { data: reportData, error: reportError } = await supabase
      .from("scouting_reports")
      .insert(reportPayload)
      .select("id")
      .single();

    if (reportError) {
      setSaving(false);
      setMessage(reportError.message);
      return;
    }

    const scoreRows = metrics.map((metric) => ({
      report_id: reportData.id,
      metric_id: metric.id,
      score: scores[metric.id],
      source_type: "MANUAL",
      validated: true,
    }));

    const { error: scoresError } = await supabase
      .from("report_scores")
      .insert(scoreRows);

    if (scoresError) {
      setSaving(false);
      setMessage(scoresError.message);
      return;
    }

    await updatePlayerTracking(playerId);

    window.location.href = `/players/${playerId}`;
  }

  async function updatePlayerTracking(playerId: string) {
    const { data: reportsData } = await supabase
      .from("scouting_reports")
      .select(`
        global_score,
        minutes_observed,
        report_date
      `)
      .eq("player_id", playerId)
      .eq("report_status", "FINAL")
      .order("report_date", { ascending: true });

    const reports = reportsData || [];

    if (!reports.length) return;

    const validScores = reports
      .map((report) => Number(report.global_score))
      .filter((value) => !Number.isNaN(value));

    const totalReports = reports.length;

    const totalMinutes = reports.reduce(
      (sum, report) =>
        sum + Number(report.minutes_observed || 0),
      0
    );

    const average =
      validScores.reduce((sum, value) => sum + value, 0) /
      validScores.length;

    const lastScore =
      validScores[validScores.length - 1] ?? null;

    const bestScore =
      validScores.length
        ? Math.max(...validScores)
        : null;

    const worstScore =
      validScores.length
        ? Math.min(...validScores)
        : null;

    const last3Array = validScores.slice(-3);

    const last3 =
      last3Array.length
        ? last3Array.reduce((a, b) => a + b, 0) /
          last3Array.length
        : null;

    const last5Array = validScores.slice(-5);

    const last5 =
      last5Array.length
        ? last5Array.reduce((a, b) => a + b, 0) /
          last5Array.length
        : null;

    let trend = "STABLE";

    if (validScores.length >= 3) {
      const firstRecent = validScores[validScores.length - 3];
      const latest = validScores[validScores.length - 1];

      if (latest - firstRecent >= 0.5) {
        trend = "ASCENDING";
      } else if (firstRecent - latest >= 0.5) {
        trend = "DESCENDING";
      }
    }

    let evidenceLevel = "VERY_LOW";

    if (totalReports >= 10) {
      evidenceLevel = "CONSOLIDATED";
    } else if (totalReports >= 7) {
      evidenceLevel = "HIGH";
    } else if (totalReports >= 4) {
      evidenceLevel = "MODERATE";
    } else if (totalReports >= 2) {
      evidenceLevel = "LOW";
    }

    let consistencyScore: number | null = null;

    if (validScores.length >= 2) {
      const variance =
        validScores.reduce(
          (sum, value) =>
            sum + Math.pow(value - average, 2),
          0
        ) / validScores.length;

      const standardDeviation = Math.sqrt(variance);

      consistencyScore = Math.max(
        1,
        Math.min(10, 10 - standardDeviation * 2)
      );
    }

    await supabase
      .from("player_tracking_metadata")
      .update({
        reports_count: totalReports,
        matches_observed: totalReports,
        minutes_observed: totalMinutes,

        avg_global_score: Number(average.toFixed(2)),
        last_global_score: lastScore
          ? Number(lastScore.toFixed(2))
          : null,

        best_score: bestScore
          ? Number(bestScore.toFixed(2))
          : null,

        worst_score: worstScore
          ? Number(worstScore.toFixed(2))
          : null,

        score_last_3: last3
          ? Number(last3.toFixed(2))
          : null,

        score_last_5: last5
          ? Number(last5.toFixed(2))
          : null,

        consistency_score:
          consistencyScore !== null
            ? Number(consistencyScore.toFixed(2))
            : null,

        current_level_score: Number(
          average.toFixed(2)
        ),

        evidence_level: evidenceLevel,
        trend,

        last_observed_at:
          reports[reports.length - 1].report_date,

        updated_at: new Date().toISOString(),
      })
      .eq("player_id", playerId);
  }

  if (loading) {
    return (
      <div className="card">
        Cargando informe...
      </div>
    );
  }

  if (message && !player) {
    return (
      <div className="card">
        <h1 className="text-xl font-black">
          No se puede crear el informe
        </h1>

        <p className="mt-3 text-slate-400">
          {message}
        </p>

        <a href="/players" className="btn mt-5">
          Volver a jugadores
        </a>
      </div>
    );
  }

  if (!player) return null;

  const age = calculateAge(player.birth_date);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="text-sm text-slate-400">
          Nuevo informe
        </div>

        <h1 className="mt-1 text-3xl font-black">
          {player.full_name}
        </h1>

        <div className="mt-2 text-slate-300">
          {player.specific_position || player.position}

          {age !== null && ` · ${age} años`}

          {player.height_cm &&
            ` · ${player.height_cm} cm`}

          {player.preferred_foot &&
            ` · ${player.preferred_foot}`}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                Datos del partido
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Información general de la observación.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">
                Score global
              </div>

              <div className="text-4xl font-black">
                {globalScore.toFixed(2)}
              </div>

              <div className="text-xs text-slate-500">
                /10
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="Fecha del partido"
              name="report_date"
              type="date"
              defaultValue={
                new Date().toISOString().split("T")[0]
              }
            />

            <Field
              label="Competencia / torneo"
              name="competition"
              placeholder="Reserva / Primera Nacional..."
            />

            <Field
              label="Equipos y resultado"
              name="match_description"
              placeholder="Equipo A 1 - 0 Equipo B"
            />

            <Field
              label="Minutos observados"
              name="minutes_observed"
              type="number"
              defaultValue="90"
              min="1"
              max="130"
            />

            <div>
              <label className="label">
                Formación
              </label>

              <select
                className="input"
                name="formation"
                defaultValue="4-2-3-1"
              >
                <option>4-2-3-1</option>
                <option>4-3-1-2</option>
                <option>4-1-3-2</option>
                <option>4-4-2</option>
                <option>4-1-4-1</option>
                <option>4-3-3</option>
                <option>3-5-2</option>
                <option>3-4-3</option>
                <option>5-3-2</option>
              </select>
            </div>

            <div>
              <label className="label">
                Línea de seguimiento
              </label>

              <select
                className="input"
                name="tracking_line"
                defaultValue="2_SEGUIR"
              >
                <option value="1_FICHAR">
                  1ra - Fichar
                </option>

                <option value="2_SEGUIR">
                  2da - Seguir
                </option>

                <option value="3_VER_MAS_ADELANTE">
                  3ra - Ver más adelante
                </option>

                <option value="4_DESCARTAR">
                  4ta - Descartar
                </option>

                <option value="JOVEN_PROMESA">
                  Joven Promesa
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h3 className="font-black">
              Historial de lesiones
            </h3>

            <div className="mt-4 space-y-2">
              <label className="block">
                <input
                  type="radio"
                  name="injury_flag"
                  value="false"
                  defaultChecked
                />{" "}
                Sin lesiones registradas
              </label>

              <label className="block">
                <input
                  type="radio"
                  name="injury_flag"
                  value="true"
                />{" "}
                Registra lesiones
              </label>
            </div>
          </div>

          <div className="card">
            <h3 className="font-black">
              Pasado en selecciones
            </h3>

            <div className="mt-4 space-y-2">
              <label className="block">
                <input
                  type="radio"
                  name="national_team_flag"
                  value="false"
                  defaultChecked
                />{" "}
                No registra selección
              </label>

              <label className="block">
                <input
                  type="radio"
                  name="national_team_flag"
                  value="true"
                />{" "}
                Registra selección
              </label>
            </div>
          </div>
        </section>

        {Object.entries(groupedMetrics).map(
          ([group, groupMetrics]) => (
            <section
              key={group}
              className="card"
            >
              <h2 className="text-xl font-black">
                {group}
              </h2>

              <div className="mt-6 space-y-6">
                {groupMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="grid gap-3 md:grid-cols-[240px_1fr_60px] md:items-center"
                  >
                    <div className="font-bold">
                      {metric.label}
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={
                        scores[metric.id] ?? 5
                      }
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [metric.id]: Number(
                            event.target.value
                          ),
                        }))
                      }
                    />

                    <div className="rounded-lg bg-slate-800 px-3 py-2 text-center text-lg font-black">
                      {scores[metric.id] ?? 5}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        )}

        <section className="card">
          <label className="label">
            Observación general
          </label>

          <textarea
            className="input min-h-48"
            name="general_observation"
            placeholder="Síntesis profesional del jugador: perfil general, fortalezas, aspectos a mejorar, impacto de las falencias y recomendación de seguimiento..."
          />
        </section>

        {message && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <a
            href={`/players/${player.id}`}
            className="rounded-lg border border-slate-600 px-4 py-2"
          >
            Cancelar
          </a>

          <button
            className="btn"
            disabled={saving}
          >
            {saving
              ? "Guardando..."
              : "Guardar informe"}
          </button>
        </div>
      </form>
    </div>
  );
}

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
