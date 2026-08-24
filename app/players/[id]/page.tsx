"use client";

import { useEffect, useMemo, useState } from "react";
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
  metric_id: string;
  code: string;
  label: string;
  group_name: string;
  average: number;
  count: number;
};

function clamp(
  value: number,
  min = 1,
  max = 10
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function calculateAge(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const birth =
    new Date(value);

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

function formatScore(
  value:
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
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
      return "Muy baja";
  }
}

function evidenceNeed(
  value:
    | string
    | null
    | undefined
) {
  switch (value) {
    case "VERY_LOW":
      return 10;

    case "LOW":
      return 8;

    case "MODERATE":
      return 6;

    case "HIGH":
      return 3;

    case "CONSOLIDATED":
      return 1;

    default:
      return 10;
  }
}

function trendLabel(
  value:
    | string
    | null
    | undefined
) {
  switch (value) {
    case "ASCENDING":
      return "↑ Ascendente";

    case "DESCENDING":
      return "↓ Descendente";

    case "STABLE":
      return "→ Estable";

    default:
      return "—";
  }
}

function trackingLineLabel(
  value:
    | string
    | null
    | undefined
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

function lineScore(
  value:
    | string
    | null
    | undefined
) {
  switch (value) {
    case "1_FICHAR":
      return 10;

    case "JOVEN_PROMESA":
      return 9;

    case "2_SEGUIR":
      return 8;

    case "3_VER_MAS_ADELANTE":
      return 5;

    case "4_DESCARTAR":
      return 2;

    default:
      return 5;
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
    return "Sin calcular";
  }

  if (value >= 9) {
    return "Muy alta";
  }

  if (value >= 8) {
    return "Alta";
  }

  if (value >= 6.5) {
    return "Media";
  }

  if (value >= 5) {
    return "Seguimiento";
  }

  return "Baja";
}

function daysSince(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  return Math.floor(
    difference /
      (1000 * 60 * 60 * 24)
  );
}

export default function PlayerPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const [player, setPlayer] =
    useState<Player | null>(
      null
    );

  const [
    tracking,
    setTracking,
  ] =
    useState<Tracking | null>(
      null
    );

  const [reports, setReports] =
    useState<Report[]>([]);

  const [metrics, setMetrics] =
    useState<Metric[]>([]);

  const [
    reportScores,
    setReportScores,
  ] =
    useState<ReportScore[]>(
      []
    );

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
        .single();

    if (playerError) {
      setErrorMessage(
        playerError.message
      );

      setLoading(false);
      return;
    }

    const {
      data: trackingData,
    } =
      await supabase
        .from(
          "player_tracking_metadata"
        )
        .select("*")
        .eq(
          "player_id",
          params.id
        )
        .maybeSingle();

    const {
      data: reportsData,
      error: reportsError,
    } =
      await supabase
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
            ascending: false,
          }
        );

    if (reportsError) {
      setErrorMessage(
        reportsError.message
      );
    }

    const {
      data: metricData,
    } =
      await supabase
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
        );

    const reportIds =
      (
        reportsData || []
      ).map(
        (report) =>
          report.id
      );

    let scoresData:
      ReportScore[] = [];

    if (
      reportIds.length >
      0
    ) {
      const {
        data,
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

      scoresData =
        (data ||
          []) as ReportScore[];
    }

    setPlayer(
      playerData as unknown as Player
    );

    setTracking(
      trackingData as Tracking | null
    );

    setReports(
      (reportsData ||
        []) as Report[]
    );

    setMetrics(
      (metricData ||
        []) as Metric[]
    );

    setReportScores(
      scoresData
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

  const currentLevel =
    useMemo(() => {
      return (
        tracking
          ?.current_level_score ??
        tracking
          ?.avg_global_score ??
        null
      );
    }, [tracking]);

  /*
   * POTENTIAL PROVISIONAL
   *
   * No intenta reemplazar
   * el criterio humano.
   *
   * Current Level
   * + edad
   * + talla GK
   * + tendencia.
   */
  const potential =
    useMemo(() => {
      if (
        currentLevel ===
        null
      ) {
        return null;
      }

      let modifier = 0;

      if (
        age !== null
      ) {
        if (age <= 18) {
          modifier += 0.9;
        } else if (
          age <= 20
        ) {
          modifier += 0.7;
        } else if (
          age <= 22
        ) {
          modifier += 0.5;
        } else if (
          age <= 25
        ) {
          modifier += 0.25;
        } else if (
          age <= 28
        ) {
          modifier += 0.1;
        } else if (
          age <= 31
        ) {
          modifier -= 0.1;
        } else {
          modifier -= 0.3;
        }
      }

      if (
        player?.position ===
        "GK"
      ) {
        const height =
          player.height_cm;

        if (
          height !== null
        ) {
          if (
            height >= 195
          ) {
            modifier += 0.2;
          } else if (
            height >= 190
          ) {
            modifier += 0.1;
          } else if (
            height < 185
          ) {
            modifier -= 0.2;
          }
        }
      }

      if (
        tracking?.trend ===
        "ASCENDING"
      ) {
        modifier += 0.2;
      }

      if (
        tracking?.trend ===
        "DESCENDING"
      ) {
        modifier -= 0.2;
      }

      return clamp(
        currentLevel +
          modifier
      );
    }, [
      currentLevel,
      age,
      player,
      tracking,
    ]);

  const consistency =
    useMemo(() => {
      if (
        (
          tracking
            ?.reports_count ??
          0
        ) < 2
      ) {
        return null;
      }

      return (
        tracking
          ?.consistency_score ??
        null
      );
    }, [tracking]);

  const recruitmentPriority =
    useMemo(() => {
      if (
        currentLevel ===
        null ||
        potential ===
        null
      ) {
        return null;
      }

      const latestLine =
        reports[0]
          ?.tracking_line;

      const consistencyValue =
        consistency ??
        currentLevel;

      const result =
        currentLevel *
          0.45 +
        potential *
          0.3 +
        consistencyValue *
          0.1 +
        lineScore(
          latestLine
        ) *
          0.15;

      return clamp(
        result
      );
    }, [
      currentLevel,
      potential,
      consistency,
      reports,
    ]);

  const observationPriority =
    useMemo(() => {
      if (
        potential ===
        null
      ) {
        return null;
      }

      const evidence =
        evidenceNeed(
          tracking
            ?.evidence_level
        );

      const days =
        daysSince(
          tracking
            ?.last_observed_at
        );

      let recencyNeed = 5;

      if (
        days !== null
      ) {
        if (
          days >= 90
        ) {
          recencyNeed = 10;
        } else if (
          days >= 60
        ) {
          recencyNeed = 8;
        } else if (
          days >= 30
        ) {
          recencyNeed = 6;
        } else if (
          days >= 14
        ) {
          recencyNeed = 4;
        } else {
          recencyNeed = 2;
        }
      }

      const result =
        potential *
          0.45 +
        evidence *
          0.35 +
        recencyNeed *
          0.2;

      return clamp(
        result
      );
    }, [
      potential,
      tracking,
    ]);

  const metricSummaries =
    useMemo(() => {
      const summaries:
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
            !values.length
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

          summaries.push({
            metric_id:
              metric.id,

            code:
              metric.code,

            label:
              metric.label,

            group_name:
              metric.group_name,

            average,

            count:
              values.length,
          });
        }
      );

      return summaries.sort(
        (a, b) =>
          b.average -
          a.average
      );
    }, [
      metrics,
      reportScores,
    ]);

  const strengths =
    useMemo(
      () =>
        metricSummaries
          .filter(
            (item) =>
              item.average >=
              7
          )
          .slice(
            0,
            3
          ),
      [metricSummaries]
    );

  const developmentAreas =
    useMemo(
      () =>
        [...metricSummaries]
          .sort(
            (a, b) =>
              a.average -
              b.average
          )
          .filter(
            (item) =>
              item.average <
              7
          )
          .slice(
            0,
            3
          ),
      [metricSummaries]
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
              {player.full_name}
            </h1>

            <p className="mt-3 text-slate-300">
              {player.specific_position ||
                player.position}

              {age !== null &&
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

      {/* INDICADORES PRINCIPALES */}

      <section className="grid gap-4 md:grid-cols-5">

        <ScoreCard
          label="Current Level"
          value={currentLevel}
          help="Nivel acumulado"
        />

        <ScoreCard
          label="Potential"
          value={potential}
          help="Provisional"
        />

        <ScoreCard
          label="Consistency"
          value={consistency}
          help={
            (
              tracking?.reports_count ??
              0
            ) < 2
              ? "Requiere 2+ informes"
              : "Regularidad"
          }
        />

        <ScoreCard
          label="Recruitment"
          value={
            recruitmentPriority
          }
          help={
            priorityLabel(
              recruitmentPriority
            )
          }
        />

        <ScoreCard
          label="Observation"
          value={
            observationPriority
          }
          help={
            priorityLabel(
              observationPriority
            )
          }
        />

      </section>

      {/* EVIDENCIA */}

      <section className="grid gap-4 md:grid-cols-5">

        <InfoCard
          label="Informes"
          value={String(
            tracking
              ?.reports_count ??
              reports.length
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

      {/* FORTALEZAS / DESARROLLO */}

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
                      item.metric_id
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
                Sin debilidades destacadas con la evidencia actual.
              </p>
            ) : (
              developmentAreas.map(
                (
                  item
                ) => (
                  <MetricRow
                    key={
                      item.metric_id
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

      {/* PERFIL TÉCNICO */}

      <section className="card">

        <h2 className="text-xl font-black">
          Perfil técnico acumulado
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Promedio de todas las evaluaciones registradas.
        </p>

        {metricSummaries.length ===
        0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Todavía no existen evaluaciones técnicas.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">

            {metricSummaries
              .slice()
              .sort(
                (a, b) => {
                  const metricA =
                    metrics.find(
                      (
                        metric
                      ) =>
                        metric.id ===
                        a.metric_id
                    );

                  const metricB =
                    metrics.find(
                      (
                        metric
                      ) =>
                        metric.id ===
                        b.metric_id
                    );

                  return (
                    (
                      metricA?.sort_order ??
                      0
                    ) -
                    (
                      metricB?.sort_order ??
                      0
                    )
                  );
                }
              )
              .map(
                (
                  item
                ) => (
                  <MetricRow
                    key={
                      item.metric_id
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
        )}

      </section>

      {/* HISTORIAL */}

      <section className="card">

        <h2 className="text-xl font-black">
          Historial de scouting
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Evaluaciones ordenadas desde la más reciente.
        </p>

        {reports.length ===
        0 ? (
          <div className="mt-6 rounded-xl border border-slate-800 p-5">

            <p className="text-slate-400">
              Todavía no hay informes cargados.
            </p>

          </div>
        ) : (
          <div className="mt-6 space-y-4">

            {reports.map(
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

                      {report.minutes_observed && (
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
                      {report.general_observation}
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
  help,
}: {
  label: string;
  value:
    | number
    | null;
  help?: string;
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

      <div className="mt-1 text-xs text-slate-500">
        {value !== null
          ? "/10"
          : help ||
            "Sin calcular"}
      </div>

      {value !== null &&
        help && (
          <div className="mt-2 text-xs text-slate-400">
            {help}
          </div>
        )}

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
            width: `${Math.min(
              100,
              Math.max(
                0,
                value * 10
              )
            )}%`,
          }}
        />

      </div>

    </div>
  );
}
