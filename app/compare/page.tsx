"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

import { supabase } from "../../lib/supabase";

type Player = {
  id: string;
  full_name: string;
  birth_date: string | null;
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
  minutes_observed: number;

  current_level_score: number | null;
  potential_score: number | null;
  consistency_score: number | null;

  recruitment_priority: number | null;
  observation_priority: number | null;

  evidence_level: string | null;
  trend: string | null;
};

type Metric = {
  id: string;
  code: string;
  label: string;
  group_name: string;
  sort_order: number;
};

type Report = {
  id: string;
  player_id: string;
};

type ReportScore = {
  report_id: string;
  metric_id: string;
  score: number;
};

type PlayerMetric = {
  metric_id: string;
  label: string;
  group_name: string;
  sort_order: number;
  average: number;
};

type PlayerData = {
  player: Player;
  tracking: Tracking | null;
  metrics: PlayerMetric[];
};

type Difference = {
  label: string;
  a: number;
  b: number;
  difference: number;
  winner: "A" | "B" | "EMPATE";
};

function calculateAge(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function score(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return Number(value).toFixed(2);
}

function evidenceLabel(value: string | null | undefined) {
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

function trendLabel(value: string | null | undefined) {
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

function valueDifference(
  a: number | null | undefined,
  b: number | null | undefined
) {
  if (a === null || a === undefined || b === null || b === undefined) {
    return null;
  }

  return Number(a) - Number(b);
}

export default function ComparePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");

  const [playerA, setPlayerA] = useState<PlayerData | null>(null);
  const [playerB, setPlayerB] = useState<PlayerData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!playerAId || metrics.length === 0) {
      setPlayerA(null);
      return;
    }

    setLoadingA(true);

    loadPlayerData(playerAId)
      .then((data) => {
        setPlayerA(data);
      })
      .finally(() => {
        setLoadingA(false);
      });
  }, [playerAId, metrics]);

  useEffect(() => {
    if (!playerBId || metrics.length === 0) {
      setPlayerB(null);
      return;
    }

    setLoadingB(true);

    loadPlayerData(playerBId)
      .then((data) => {
        setPlayerB(data);
      })
      .finally(() => {
        setLoadingB(false);
      });
  }, [playerBId, metrics]);

  async function loadInitialData() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getSession();

    if (!authData.session) {
      setMessage("Necesitás iniciar sesión.");
      setLoading(false);
      return;
    }

    const [playersResponse, metricsResponse] = await Promise.all([
      supabase
        .from("players")
        .select(`
          id,
          full_name,
          birth_date,
          position,
          preferred_foot,
          height_cm,
          clubs:current_club_id (
            name
          )
        `)
        .eq("active", true)
        .eq("position", "GK")
        .order("last_name", {
          ascending: true,
        }),

      supabase
        .from("evaluation_metrics")
        .select(`
          id,
          code,
          label,
          group_name,
          sort_order
        `)
        .eq("position", "GK")
        .eq("active", true)
        .order("sort_order", {
          ascending: true,
        }),
    ]);

    if (playersResponse.error) {
      setMessage(playersResponse.error.message);
      setLoading(false);
      return;
    }

    if (metricsResponse.error) {
      setMessage(metricsResponse.error.message);
      setLoading(false);
      return;
    }

    const loadedPlayers = (playersResponse.data || []) as unknown as Player[];

    const loadedMetrics = (metricsResponse.data || []) as Metric[];

    setPlayers(loadedPlayers);
    setMetrics(loadedMetrics);

    if (loadedPlayers.length >= 1) {
      setPlayerAId(loadedPlayers[0].id);
    }

    if (loadedPlayers.length >= 2) {
      setPlayerBId(loadedPlayers[1].id);
    }

    setLoading(false);
  }

  async function loadPlayerData(id: string): Promise<PlayerData | null> {
    const [playerResponse, trackingResponse, reportsResponse] =
      await Promise.all([
        supabase
          .from("players")
          .select(`
            id,
            full_name,
            birth_date,
            position,
            preferred_foot,
            height_cm,
            clubs:current_club_id (
              name
            )
          `)
          .eq("id", id)
          .single(),

        supabase
          .from("player_tracking_metadata")
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
          `)
          .eq("player_id", id)
          .maybeSingle(),

        supabase
          .from("scouting_reports")
          .select(`
            id,
            player_id
          `)
          .eq("player_id", id)
          .eq("report_status", "FINAL"),
      ]);

    if (playerResponse.error) {
      console.error(playerResponse.error);
      return null;
    }

    if (trackingResponse.error) {
      console.error(trackingResponse.error);
    }

    if (reportsResponse.error) {
      console.error(reportsResponse.error);
    }

    const reports = (reportsResponse.data || []) as Report[];

    const reportIds = reports.map((report) => report.id);

    let reportScores: ReportScore[] = [];

    if (reportIds.length > 0) {
      const { data, error } = await supabase
        .from("report_scores")
        .select(`
          report_id,
          metric_id,
          score
        `)
        .in("report_id", reportIds);

      if (error) {
        console.error(error);
      } else {
        reportScores = (data || []) as ReportScore[];
      }
    }

    const metricSummary: PlayerMetric[] = metrics.map((metric) => {
      const values = reportScores
        .filter((row) => row.metric_id === metric.id)
        .map((row) => Number(row.score))
        .filter((value) => !Number.isNaN(value));

      const average =
        values.length > 0
          ? values.reduce((total, value) => total + value, 0) /
            values.length
          : 0;

      return {
        metric_id: metric.id,
        label: metric.label,
        group_name: metric.group_name,
        sort_order: metric.sort_order,
        average,
      };
    });

    return {
      player: playerResponse.data as unknown as Player,
      tracking: trackingResponse.data as Tracking | null,
      metrics: metricSummary,
    };
  }

  const radarData = useMemo(() => {
    return metrics.map((metric) => {
      const metricA = playerA?.metrics.find(
        (row) => row.metric_id === metric.id
      );

      const metricB = playerB?.metrics.find(
        (row) => row.metric_id === metric.id
      );

      return {
        variable: metric.label,
        A: metricA?.average ?? 0,
        B: metricB?.average ?? 0,
      };
    });
  }, [playerA, playerB, metrics]);

  const differences = useMemo<Difference[]>(() => {
    if (!playerA || !playerB) {
      return [];
    }

    return metrics
      .map((metric) => {
        const a =
          playerA.metrics.find((row) => row.metric_id === metric.id)
            ?.average ?? 0;

        const b =
          playerB.metrics.find((row) => row.metric_id === metric.id)
            ?.average ?? 0;

        let winner: "A" | "B" | "EMPATE" = "EMPATE";

        if (a > b) {
          winner = "A";
        } else if (b > a) {
          winner = "B";
        }

        return {
          label: metric.label,
          a,
          b,
          difference: Math.abs(a - b),
          winner,
        };
      })
      .filter((item) => item.a > 0 || item.b > 0)
      .sort((a, b) => b.difference - a.difference)
      .slice(0, 5);
  }, [playerA, playerB, metrics]);

  const comparisonSummary = useMemo(() => {
    if (!playerA || !playerB) {
      return null;
    }

    const a = playerA.tracking;
    const b = playerB.tracking;

    let aWins = 0;
    let bWins = 0;

    const indicators = [
      [a?.current_level_score, b?.current_level_score],
      [a?.potential_score, b?.potential_score],
      [a?.consistency_score, b?.consistency_score],
      [a?.recruitment_priority, b?.recruitment_priority],
      [a?.observation_priority, b?.observation_priority],
    ];

    indicators.forEach(([valueA, valueB]) => {
      if (valueA === null || valueA === undefined) return;
      if (valueB === null || valueB === undefined) return;

      if (Number(valueA) > Number(valueB)) {
        aWins++;
      } else if (Number(valueB) > Number(valueA)) {
        bWins++;
      }
    });

    if (aWins > bWins) {
      return `${playerA.player.full_name} presenta ventaja global en los indicadores disponibles.`;
    }

    if (bWins > aWins) {
      return `${playerB.player.full_name} presenta ventaja global en los indicadores disponibles.`;
    }

    return "La comparación global es equilibrada con la evidencia disponible.";
  }, [playerA, playerB]);

  if (loading) {
    return <div className="card">Cargando comparador...</div>;
  }

  if (message) {
    return (
      <div className="card">
        <h1 className="text-2xl font-black">
          Comparador de arqueros
        </h1>

        <p className="mt-3 text-slate-400">
          {message}
        </p>

        <a href="/login" className="btn mt-5">
          Ingresar
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">
          Comparador de arqueros
        </h1>

        <p className="mt-2 text-slate-400">
          Comparación longitudinal entre dos perfiles de scouting.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <label className="label">
            Arquero A
          </label>

          <select
            className="input"
            value={playerAId}
            onChange={(event) => setPlayerAId(event.target.value)}
          >
            <option value="">
              Seleccionar...
            </option>

            {players.map((player) => (
              <option
                key={player.id}
                value={player.id}
                disabled={player.id === playerBId}
              >
                {player.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <label className="label">
            Arquero B
          </label>

          <select
            className="input"
            value={playerBId}
            onChange={(event) => setPlayerBId(event.target.value)}
          >
            <option value="">
              Seleccionar...
            </option>

            {players.map((player) => (
              <option
                key={player.id}
                value={player.id}
                disabled={player.id === playerAId}
              >
                {player.full_name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {players.length < 2 && (
        <section className="rounded-xl border border-amber-700 bg-amber-950/20 p-5">
          <div className="font-black">
            Comparación pendiente
          </div>

          <p className="mt-2 text-sm text-slate-300">
            Actualmente hay menos de dos arqueros cargados. Podés revisar el
            perfil A, pero para una comparación completa necesitás incorporar
            al menos un segundo arquero.
          </p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <PlayerHeader
          title="Arquero A"
          data={playerA}
          loading={loadingA}
        />

        <PlayerHeader
          title="Arquero B"
          data={playerB}
          loading={loadingB}
        />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="text-xl font-black">
          Comparación global
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Indicadores longitudinales consolidados en la ficha.
        </p>

        <table className="mt-5 w-full min-w-[700px] text-sm">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="py-3 text-left">
                Indicador
              </th>

              <th className="py-3 text-center">
                {playerA?.player.full_name || "Arquero A"}
              </th>

              <th className="py-3 text-center">
                {playerB?.player.full_name || "Arquero B"}
              </th>

              <th className="py-3 text-center">
                Ventaja
              </th>
            </tr>
          </thead>

          <tbody>
            <CompareRow
              label="Current Level"
              a={playerA?.tracking?.current_level_score}
              b={playerB?.tracking?.current_level_score}
            />

            <CompareRow
              label="Potential"
              a={playerA?.tracking?.potential_score}
              b={playerB?.tracking?.potential_score}
            />

            <CompareRow
              label="Consistency"
              a={playerA?.tracking?.consistency_score}
              b={playerB?.tracking?.consistency_score}
            />

            <CompareRow
              label="Recruitment"
              a={playerA?.tracking?.recruitment_priority}
              b={playerB?.tracking?.recruitment_priority}
            />

            <CompareRow
              label="Observation"
              a={playerA?.tracking?.observation_priority}
              b={playerB?.tracking?.observation_priority}
            />
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="text-xl font-black">
          Radar técnico
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Promedio acumulado de las variables específicas del arquero.
        </p>

        {!playerA && !playerB ? (
          <p className="mt-6 text-sm text-slate-500">
            Seleccioná arqueros con evaluaciones para visualizar el radar.
          </p>
        ) : (
          <div className="mt-6 h-[520px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <RadarChart
                data={radarData}
                outerRadius="72%"
              >
                <PolarGrid />

                <PolarAngleAxis
                  dataKey="variable"
                  tick={{
                    fontSize: 11,
                  }}
                />

                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tickCount={6}
                />

                <Radar
                  name={playerA?.player.full_name || "Arquero A"}
                  dataKey="A"
                  strokeWidth={2}
                  fillOpacity={0.18}
                />

                <Radar
                  name={playerB?.player.full_name || "Arquero B"}
                  dataKey="B"
                  strokeWidth={2}
                  fillOpacity={0.18}
                />

                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="text-xl font-black">
          Comparación técnica detallada
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Promedio de cada variable en todos los informes disponibles.
        </p>

        <table className="mt-5 w-full min-w-[760px] text-sm">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="py-3 text-left">
                Variable
              </th>

              <th className="py-3 text-center">
                A
              </th>

              <th className="py-3 text-center">
                B
              </th>

              <th className="py-3 text-center">
                Diferencia
              </th>
            </tr>
          </thead>

          <tbody>
            {metrics.map((metric) => {
              const a = playerA?.metrics.find(
                (row) => row.metric_id === metric.id
              )?.average;

              const b = playerB?.metrics.find(
                (row) => row.metric_id === metric.id
              )?.average;

              const difference =
                a !== undefined && b !== undefined
                  ? a - b
                  : null;

              return (
                <tr
                  key={metric.id}
                  className="border-b border-slate-800"
                >
                  <td className="py-4 font-bold">
                    {metric.label}
                  </td>

                  <td className="py-4 text-center">
                    {score(a)}
                  </td>

                  <td className="py-4 text-center">
                    {score(b)}
                  </td>

                  <td className="py-4 text-center font-bold">
                    {difference === null
                      ? "—"
                      : difference > 0
                      ? `A +${difference.toFixed(2)}`
                      : difference < 0
                      ? `B +${Math.abs(difference).toFixed(2)}`
                      : "Iguales"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-black">
            Diferencias más relevantes
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Variables con mayor separación entre ambos perfiles.
          </p>

          <div className="mt-5 space-y-3">
            {differences.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavía no hay evidencia suficiente para comparar.
              </p>
            ) : (
              differences.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-800 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-bold">
                        {item.label}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        A {item.a.toFixed(2)} · B {item.b.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-lg font-black">
                      {item.winner === "EMPATE"
                        ? "Empate"
                        : `${item.winner} +${item.difference.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black">
            Lectura comparativa
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Síntesis automática basada únicamente en los datos cargados.
          </p>

          {!comparisonSummary ? (
            <p className="mt-5 text-sm text-slate-500">
              Seleccioná dos arqueros para generar una lectura comparativa.
            </p>
          ) : (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/30 p-5">
              <p className="text-sm leading-6 text-slate-300">
                {comparisonSummary}
              </p>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Esta lectura debe interpretarse junto al nivel de evidencia
                de cada jugador. Un perfil con pocos informes no debe
                considerarse equivalente a otro con observación consolidada.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PlayerHeader({
  title,
  data,
  loading,
}: {
  title: string;
  data: PlayerData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="card">
        <div className="text-sm text-slate-400">
          {title}
        </div>

        <div className="mt-3 text-slate-500">
          Cargando jugador...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <div className="text-sm text-slate-400">
          {title}
        </div>

        <div className="mt-3 text-slate-500">
          Sin jugador seleccionado.
        </div>
      </div>
    );
  }

  const age = calculateAge(data.player.birth_date);

  return (
    <div className="card">
      <div className="text-sm text-slate-400">
        {title}
      </div>

      <h2 className="mt-1 text-2xl font-black">
        {data.player.full_name}
      </h2>

      <p className="mt-2 text-sm text-slate-300">
        {age !== null && `${age} años`}

        {data.player.height_cm &&
          ` · ${data.player.height_cm} cm`}

        {data.player.preferred_foot &&
          ` · ${data.player.preferred_foot}`}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {data.player.clubs?.name || "Club sin registrar"}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="Informes"
          value={String(data.tracking?.reports_count ?? 0)}
        />

        <MiniStat
          label="Evidencia"
          value={evidenceLabel(data.tracking?.evidence_level)}
        />

        <MiniStat
          label="Tendencia"
          value={trendLabel(data.tracking?.trend)}
        />
      </div>

      <a
        href={`/players/${data.player.id}`}
        className="mt-4 inline-block text-sm font-bold text-slate-300 hover:text-white"
      >
        Ver ficha completa →
      </a>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-950/40 p-3">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
}: {
  label: string;
  a: number | null | undefined;
  b: number | null | undefined;
}) {
  const difference = valueDifference(a, b);

  let advantage = "—";

  if (difference !== null) {
    if (difference > 0) {
      advantage = `A +${difference.toFixed(2)}`;
    } else if (difference < 0) {
      advantage = `B +${Math.abs(difference).toFixed(2)}`;
    } else {
      advantage = "Iguales";
    }
  }

  return (
    <tr className="border-b border-slate-800">
      <td className="py-4 font-bold">
        {label}
      </td>

      <td className="py-4 text-center text-lg font-black">
        {score(a)}
      </td>

      <td className="py-4 text-center text-lg font-black">
        {score(b)}
      </td>

      <td className="py-4 text-center font-bold">
        {advantage}
      </td>
    </tr>
  );
}
