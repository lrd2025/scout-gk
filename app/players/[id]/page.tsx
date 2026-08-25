"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

  best_score: number | null;
  worst_score: number | null;

  score_last_3: number | null;
  score_last_5: number | null;

  current_level_score: number | null;
  potential_score: number | null;
  consistency_score: number | null;

  recruitment_priority: number | null;
  observation_priority: number | null;

  evidence_level: string | null;
  trend: string | null;

  last_observed_at: string | null;
};

type Report = {
  id: string;
  report_date: string;
  global_score: number | null;
  tracking_line: string | null;
  general_observation: string | null;
  minutes_observed: number | null;
};

type Metric = {
  id: string;
  code: string;
  group_name: string;
  label: string;
  sort_order: number;
};

type ReportScore = {
  report_id: string;
  metric_id: string;
  score: number;
};

type MetricSummary = {
  id: string;
  label: string;
  average: number;
  sort_order: number;
};

function formatScore(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return Number(value).toFixed(2);
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

function trackingLineLabel(
  value: string | null | undefined
) {
  switch (value) {
    case "1_FICHAR":
      return "1ra - Fichar";

    case "2_SEGUIR":
      return "2da - Seguir";

    case "3_VER_MAS_ADELANTE":
      return "3ra - Ver más adelante";

    case "4_DESCARTAR":
      return "4ta - Descartar";

    case "JOVEN_PROMESA":
      return "Joven Promesa";

    default:
      return "Sin línea definida";
  }
}

export default function PlayerPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [tracking, setTracking] =
    useState<Tracking | null>(null);

  const [reports, setReports] =
    useState<Report[]>([]);

  const [metrics, setMetrics] =
    useState<Metric[]>([]);

  const [
    reportScores,
    setReportScores,
  ] =
    useState<ReportScore[]>([]);

  const [
    selectedMetric,
    setSelectedMetric,
  ] =
    useState("GLOBAL");

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  useEffect(() => {
    loadPlayer();
  }, [params.id]);

  async function loadPlayer() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: authData,
    } =
      await supabase.auth.getSession();

    if (!authData.session) {
      setLoading(false);
      return;
    }

    const [
      playerResponse,
      trackingResponse,
      reportsResponse,
      metricsResponse,
    ] =
      await Promise.all([
        supabase
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
          .eq(
            "id",
            params.id
          )
          .single(),

        supabase
          .from(
            "player_tracking_metadata"
          )
          .select("*")
          .eq(
            "player_id",
            params.id
          )
          .maybeSingle(),

        supabase
          .from(
            "scouting_reports"
          )
          .select(`
            id,
            report_date,
            global_score,
            tracking_line,
            general_observation,
            minutes_observed
          `)
          .eq(
            "player_id",
            params.id
          )
          .eq(
            "report_status",
            "FINAL"
          )
          .order(
            "report_date",
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            "evaluation_metrics"
          )
          .select(`
            id,
            code,
            group_name,
            label,
            sort_order
          `)
          .eq(
            "position",
            "GK"
          )
          .eq(
            "active",
            true
          )
          .order(
            "sort_order",
            {
              ascending: true,
            }
          ),
      ]);

    if (
      playerResponse.error
    ) {
      setErrorMessage(
        playerResponse.error
          .message
      );

      setLoading(false);

      return;
    }

    if (
      reportsResponse.error
    ) {
      setErrorMessage(
        reportsResponse.error
          .message
      );
    }

    const loadedReports =
      (
        reportsResponse.data ||
        []
      ) as Report[];

    const reportIds =
      loadedReports.map(
        (report) =>
          report.id
      );

    let loadedScores:
      ReportScore[] = [];

    if (
      reportIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "report_scores"
          )
          .select(`
            report_id,
            metric_id,
            score
          `)
          .in(
            "report_id",
            reportIds
          );

      if (
        error
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        loadedScores =
          (data ||
            []) as ReportScore[];
      }
    }

    setPlayer(
      playerResponse.data as unknown as Player
    );

    setTracking(
      trackingResponse.data as Tracking | null
    );

    setReports(
      loadedReports
    );

    setMetrics(
      (
        metricsResponse.data ||
        []
      ) as Metric[]
    );

    setReportScores(
      loadedScores
    );

    setLoading(false);
  }

  const age =
    useMemo(
      () =>
        calculateAge(
          player?.birth_date ||
            null
        ),
      [player]
    );

  const reportCount =
    tracking
      ?.reports_count ??
    reports.length;

  const provisional =
    reportCount < 4;

  const metricSummaries =
    useMemo(() => {
      const result:
        MetricSummary[] =
        [];

      metrics.forEach(
        (metric) => {
          const values =
            reportScores
              .filter(
                (score) =>
                  score.metric_id ===
                  metric.id
              )
              .map(
                (score) =>
                  Number(
                    score.score
                  )
              )
              .filter(
                (value) =>
                  !Number.isNaN(
                    value
                  )
              );

          if (
            values.length ===
            0
          ) {
            return;
          }

          const average =
            values.reduce(
              (
                total,
                value
              ) =>
                total +
                value,
              0
            ) /
            values.length;

          result.push({
            id:
              metric.id,

            label:
              metric.label,

            average,

            sort_order:
              metric.sort_order,
          });
        }
      );

      return result;
    }, [
      metrics,
      reportScores,
    ]);

  const strengths =
    useMemo(() => {
      return [
        ...metricSummaries,
      ]
        .filter(
          (item) =>
            item.average >=
            7
        )
        .sort(
          (a, b) =>
            b.average -
            a.average
        )
        .slice(
          0,
          3
        );
    }, [
      metricSummaries,
    ]);

  const developmentAreas =
    useMemo(() => {
      return [
        ...metricSummaries,
      ]
        .filter(
          (item) =>
            item.average <
            7
        )
        .sort(
          (a, b) =>
            a.average -
            b.average
        )
        .slice(
          0,
          3
        );
    }, [
      metricSummaries,
    ]);

  /*
   * CURVA LONGITUDINAL
   *
   * valor:
   * nota del partido
   *
   * promedio:
   * media acumulada
   */
  const chartData =
    useMemo(() => {
      let cumulativeTotal =
        0;

      let cumulativeCount =
        0;

      return reports.map(
        (
          report,
          index
        ) => {
          let value:
            number | null =
            null;

          if (
            selectedMetric ===
            "GLOBAL"
          ) {
            if (
              report.global_score !==
              null
            ) {
              value =
                Number(
                  report.global_score
                );
            }
          } else {
            const score =
              reportScores.find(
                (row) =>
                  row.report_id ===
                    report.id &&
                  row.metric_id ===
                    selectedMetric
              );

            if (score) {
              value =
                Number(
                  score.score
                );
            }
          }

          if (
            value !==
              null &&
            !Number.isNaN(
              value
            )
          ) {
            cumulativeTotal +=
              value;

            cumulativeCount++;
          }

          const cumulativeAverage =
            cumulativeCount >
            0
              ? cumulativeTotal /
                cumulativeCount
              : null;

          return {
            partido:
              `P${index + 1}`,

            fecha:
              report.report_date,

            valor:
              value,

            promedio:
              cumulativeAverage !==
              null
                ? Number(
                    cumulativeAverage.toFixed(
                      2
                    )
                  )
                : null,
          };
        }
      );
    }, [
      reports,
      reportScores,
      selectedMetric,
    ]);

  const selectedMetricLabel =
    useMemo(() => {
      if (
        selectedMetric ===
        "GLOBAL"
      ) {
        return "Score global";
      }

      return (
        metrics.find(
          (metric) =>
            metric.id ===
            selectedMetric
        )?.label ||
        "Variable"
      );
    }, [
      selectedMetric,
      metrics,
    ]);

  const reportsDescending =
    useMemo(
      () =>
        [
          ...reports,
        ].reverse(),
      [reports]
    );

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
          {errorMessage ||
            "Verificá que el jugador exista o iniciá sesión."}
        </p>

        <a
          href="/players"
          className="btn mt-5"
        >
          Volver
        </a>

      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* CABECERA */}

      <section className="card">

        <div className="flex flex-wrap items-start justify-between gap-6">

          <div>

            <div className="text-sm text-slate-400">
              {player.internal_code ||
                "Sin código interno"}
            </div>

            <h1 className="mt-1 text-4xl font-black">
              {
                player.full_name
              }
            </h1>

            <p className="mt-3 text-slate-300">

              {player.specific_position ||
                player.position}

              {age !==
                null &&
                ` · ${age} años`}

              {player.height_cm &&
                ` · ${player.height_cm} cm`}

              {player.preferred_foot &&
                ` · ${player.preferred_foot}`}

            </p>

            <p className="mt-2 text-sm text-slate-500">

              {player.nationality ||
                "Nacionalidad sin registrar"}

              {" · "}

              {player.clubs?.name ||
                "Club sin registrar"}

            </p>

          </div>

          <a
            href={`/reports/new?player=${player.id}`}
            className="btn"
          >
            + Nuevo informe
          </a>

        </div>

      </section>

      {/* EVIDENCIA PROVISIONAL */}

      {provisional && (
        <section className="rounded-xl border border-amber-700 bg-amber-950/20 p-5">

          <div className="font-black">
            ⚠ Evaluación provisional
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-300">

            Se registran{" "}
            <strong>
              {reportCount}
            </strong>{" "}
            partido
            {reportCount ===
            1
              ? ""
              : "s"}{" "}
            observado
            {reportCount ===
            1
              ? ""
              : "s"}{" "}
            y{" "}
            <strong>
              {tracking
                ?.minutes_observed ??
                0}
            </strong>{" "}
            minutos.

            {" "}

            Nivel de evidencia:{" "}
            <strong>
              {evidenceLabel(
                tracking
                  ?.evidence_level
              )}
            </strong>.

            {" "}

            Se recomienda continuar
            la observación antes de
            considerar la valoración
            como consolidada.

          </p>

        </section>
      )}

      {/* INDICADORES */}

      <section className="grid gap-4 md:grid-cols-5">

        <ScoreCard
          label="Current Level"
          value={
            tracking
              ?.current_level_score ??
            tracking
              ?.avg_global_score
          }
        />

        <ScoreCard
          label="Potential"
          value={
            tracking
              ?.potential_score
          }
        />

        <ScoreCard
          label="Consistency"
          value={
            reportCount >=
            2
              ? tracking
                  ?.consistency_score
              : null
          }
          note={
            reportCount <
            2
              ? "Requiere 2+ informes"
              : undefined
          }
        />

        <ScoreCard
          label="Recruitment"
          value={
            tracking
              ?.recruitment_priority
          }
        />

        <ScoreCard
          label="Observation"
          value={
            tracking
              ?.observation_priority
          }
        />

      </section>

      <section className="grid gap-4 md:grid-cols-5">

        <InfoCard
          label="Informes"
          value={String(
            reportCount
          )}
        />

        <InfoCard
          label="Partidos observados"
          value={String(
            tracking
              ?.matches_observed ??
              reports.length
          )}
        />

        <InfoCard
          label="Minutos observados"
          value={String(
            tracking
              ?.minutes_observed ??
              0
          )}
        />

        <InfoCard
          label="Evidencia"
          value={
            evidenceLabel(
              tracking
                ?.evidence_level
            )
          }
        />

        <InfoCard
          label="Tendencia"
          value={
            trendLabel(
              tracking?.trend
            )
          }
        />

      </section>

      {/* EVOLUCIÓN */}

      <section className="card">

        <div className="flex flex-wrap items-end justify-between gap-5">

          <div>

            <h2 className="text-xl font-black">
              Evolución longitudinal
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Rendimiento partido a partido y promedio acumulado.
            </p>

          </div>

          <div>

            <label className="label">
              Variable
            </label>

            <select
              className="input min-w-64"
              value={
                selectedMetric
              }
              onChange={(
                event
              ) =>
                setSelectedMetric(
                  event.target
                    .value
                )
              }
            >

              <option value="GLOBAL">
                Score global
              </option>

              {metrics.map(
                (
                  metric
                ) => (
                  <option
                    key={
                      metric.id
                    }
                    value={
                      metric.id
                    }
                  >
                    {
                      metric.label
                    }
                  </option>
                )
              )}

            </select>

          </div>

        </div>

        <div className="mt-6">

          <div className="mb-4 text-sm text-slate-400">
            Variable seleccionada:{" "}
            <strong className="text-slate-200">
              {
                selectedMetricLabel
              }
            </strong>
          </div>

          {chartData.length ===
          0 ? (

            <div className="rounded-xl border border-slate-800 p-6 text-sm text-slate-500">
              Todavía no hay evaluaciones suficientes para graficar.
            </div>

          ) : (

            <div className="h-80 w-full">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={
                    chartData
                  }
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={
                      0.2
                    }
                  />

                  <XAxis
                    dataKey="partido"
                  />

                  <YAxis
                    domain={[
                      1,
                      10,
                    ]}
                    ticks={[
                      1,
                      2,
                      3,
                      4,
                      5,
                      6,
                      7,
                      8,
                      9,
                      10,
                    ]}
                  />

                  <Tooltip
                    formatter={(
                      value:
                        any,
                      name:
                        any
                    ) => [
                      Number(
                        value
                      ).toFixed(
                        2
                      ),

                      name ===
                      "valor"
                        ? selectedMetricLabel
                        : "Promedio acumulado",
                    ]}
                  />

                  <Legend
                    formatter={(
                      value
                    ) =>
                      value ===
                      "valor"
                        ? selectedMetricLabel
                        : "Promedio acumulado"
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="valor"
                    strokeWidth={
                      3
                    }
                    connectNulls
                    dot={{
                      r: 5,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="promedio"
                    strokeWidth={
                      2
                    }
                    strokeDasharray="6 6"
                    connectNulls
                    dot={{
                      r: 3,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          )}

        </div>

      </section>

      {/* FORTALEZAS */}

      <section className="grid gap-4 md:grid-cols-2">

        <div className="card">

          <h2 className="text-xl font-black">
            Fortalezas
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Variables mejor valoradas.
          </p>

          <div className="mt-5 space-y-3">

            {strengths.length ===
            0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay evidencia suficiente.
              </p>
            ) : (
              strengths.map(
                (
                  item
                ) => (
                  <MetricRow
                    key={
                      item.id
                    }
                    label={
                      item.label
                    }
                    value={
                      item.average
                    }
                  />
                )
              )
            )}

          </div>

        </div>

        <div className="card">

          <h2 className="text-xl font-black">
            Aspectos a seguir
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Variables con mayor margen de desarrollo.
          </p>

          <div className="mt-5 space-y-3">

            {developmentAreas.length ===
            0 ? (
              <p className="text-sm text-slate-500">
                Sin aspectos destacados con la evidencia actual.
              </p>
            ) : (
              developmentAreas.map(
                (
                  item
                ) => (
                  <MetricRow
                    key={
                      item.id
                    }
                    label={
                      item.label
                    }
                    value={
                      item.average
                    }
                  />
                )
              )
            )}

          </div>

        </div>

      </section>

      {/* PERFIL ACUMULADO */}

      <section className="card">

        <h2 className="text-xl font-black">
          Perfil técnico acumulado
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Promedio de cada variable en todos los partidos observados.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">

          {[...metricSummaries]
            .sort(
              (
                a,
                b
              ) =>
                a.sort_order -
                b.sort_order
            )
            .map(
              (
                item
              ) => (
                <MetricRow
                  key={
                    item.id
                  }
                  label={
                    item.label
                  }
                  value={
                    item.average
                  }
                />
              )
            )}

        </div>

      </section>

      {/* HISTORIAL */}

      <section className="card">

        <h2 className="text-xl font-black">
          Historial de scouting
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Evaluaciones ordenadas desde la más reciente.
        </p>

        {reportsDescending.length ===
        0 ? (

          <div className="mt-6 rounded-xl border border-slate-800 p-5">
            <p className="text-slate-400">
              Todavía no hay informes cargados.
            </p>
          </div>

        ) : (

          <div className="mt-6 space-y-4">

            {reportsDescending.map(
              (
                report
              ) => (
                <div
                  key={
                    report.id
                  }
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-5"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>

                      <div className="font-bold">

                        {new Date(
                          `${report.report_date}T12:00:00`
                        ).toLocaleDateString(
                          "es-AR"
                        )}

                      </div>

                      <div className="mt-1 text-sm text-slate-500">

                        {trackingLineLabel(
                          report.tracking_line
                        )}

                      </div>

                      {report.minutes_observed !==
                        null && (
                        <div className="mt-1 text-xs text-slate-600">
                          {report.minutes_observed} minutos observados
                        </div>
                      )}

                    </div>

                    <div className="text-right">

                      <div className="text-3xl font-black">
                        {formatScore(
                          report.global_score
                        )}
                      </div>

                      <div className="text-xs text-slate-500">
                        /10
                      </div>

                    </div>

                  </div>

                  {report.general_observation && (

                    <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-300">
                      {
                        report.general_observation
                      }
                    </p>

                  )}

                </div>
              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}

function ScoreCard({
  label,
  value,
  note,
}: {
  label: string;

  value:
    | number
    | null
    | undefined;

  note?: string;
}) {
  return (
    <div className="card">

      <div className="text-xs text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black">
        {formatScore(
          value
        )}
      </div>

      <div className="text-xs text-slate-500">

        {value ===
          null ||
        value ===
          undefined
          ? note ||
            "Sin calcular"
          : "/10"}

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

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">

      <div className="flex items-center justify-between gap-4">

        <div className="font-bold">
          {label}
        </div>

        <div className="text-xl font-black">
          {value.toFixed(
            2
          )}
        </div>

      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

        <div
          className="h-full rounded-full bg-slate-300"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                value * 10
              )
            )}%`,
          }}
        />

      </div>

    </div>
  );
}
