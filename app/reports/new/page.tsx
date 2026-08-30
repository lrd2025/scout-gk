"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../../../lib/supabase";

import {
  useCurrentUser,
} from "../../../lib/useCurrentUser";

/* =========================================================
   TIPOS
========================================================= */

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

function averageValues(
  values: number[]
) {
  if (!values.length) {
    return null;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    values.length
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function NewReportPage() {
  const {
    profile,
    loading: profileLoading,
    can,
  } =
    useCurrentUser();

  const [
    playerId,
    setPlayerId,
  ] =
    useState<
      string | null
    >(null);

  const [
    player,
    setPlayer,
  ] =
    useState<
      Player | null
    >(null);

  const [
    metrics,
    setMetrics,
  ] =
    useState<
      Metric[]
    >([]);

  const [
    scores,
    setScores,
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});

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

  /* =======================================================
     PERMISOS
  ======================================================= */

  const canCreateReport =
    can(
      "reports:create"
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
      !profile
    ) {
      setLoading(
        false
      );

      return;
    }

    if (
      !canCreateReport
    ) {
      setLoading(
        false
      );

      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      params.get(
        "player"
      );

    setPlayerId(
      id
    );

    if (!id) {
      setMessage(
        "No se indicó el jugador a evaluar."
      );

      setLoading(
        false
      );

      return;
    }

    loadData(
      id
    );
  }, [
    profileLoading,
    profile,
    canCreateReport,
  ]);

  /* =======================================================
     CARGAR JUGADOR + MÉTRICAS
  ======================================================= */

  async function loadData(
    id: string
  ) {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    const {
      data: authData,
    } =
      await supabase.auth
        .getSession();

    if (
      !authData.session
    ) {
      setMessage(
        "Necesitás iniciar sesión."
      );

      setLoading(
        false
      );

      return;
    }

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
          full_name,
          birth_date,
          nationality,
          position,
          specific_position,
          preferred_foot,
          height_cm
        `)
        .eq(
          "id",
          id
        )
        .single();

    if (
      playerError
    ) {
      setMessage(
        playerError.message
      );

      setLoading(
        false
      );

      return;
    }

    const {
      data: metricsData,
      error: metricsError,
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
            ascending:
              true,
          }
        );

    if (
      metricsError
    ) {
      setMessage(
        metricsError.message
      );

      setLoading(
        false
      );

      return;
    }

    const loadedMetrics =
      (
        metricsData ||
        []
      ) as Metric[];

    const initialScores:
      Record<
        string,
        number
      > = {};

    loadedMetrics.forEach(
      (
        metric
      ) => {
        initialScores[
          metric.id
        ] = 5;
      }
    );

    setPlayer(
      playerData as Player
    );

    setMetrics(
      loadedMetrics
    );

    setScores(
      initialScores
    );

    setLoading(
      false
    );
  }

  /* =======================================================
     SCORE GLOBAL
  ======================================================= */

  const globalScore =
    useMemo(
      () => {
        const values =
          Object.values(
            scores
          );

        if (
          !values.length
        ) {
          return 0;
        }

        return (
          values.reduce(
            (
              total,
              value
            ) =>
              total +
              value,
            0
          ) /
          values.length
        );
      },
      [
        scores,
      ]
    );

  /* =======================================================
     AGRUPAR MÉTRICAS
  ======================================================= */

  const groupedMetrics =
    useMemo(
      () => {
        const groups:
          Record<
            string,
            Metric[]
          > = {};

        metrics.forEach(
          (
            metric
          ) => {
            if (
              !groups[
                metric.group_name
              ]
            ) {
              groups[
                metric.group_name
              ] = [];
            }

            groups[
              metric.group_name
            ].push(
              metric
            );
          }
        );

        return groups;
      },
      [
        metrics,
      ]
    );

  /* =======================================================
     GUARDAR INFORME
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /* -----------------------------------------------------
       SEGUNDA BARRERA DE PERMISOS
    ----------------------------------------------------- */

    if (
      !can(
        "reports:create"
      )
    ) {
      setMessage(
        "No tenés permisos para crear informes."
      );

      return;
    }

    const formElement =
      event.currentTarget;

    const form =
      new FormData(
        formElement
      );

    if (
      !playerId
    ) {
      setMessage(
        "No se encontró el jugador."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    try {
      const {
        data: authData,
      } =
        await supabase.auth
          .getSession();

      if (
        !authData.session
      ) {
        throw new Error(
          "La sesión no está activa."
        );
      }

      const reportPayload = {
        player_id:
          playerId,

        report_date:
          String(
            form.get(
              "report_date"
            ) || ""
          ) ||
          new Date()
            .toISOString()
            .split(
              "T"
            )[0],

        minutes_observed:
          form.get(
            "minutes_observed"
          )
            ? Number(
                form.get(
                  "minutes_observed"
                )
              )
            : null,

        formation:
          String(
            form.get(
              "formation"
            ) || ""
          ).trim() ||
          null,

        tracking_line:
          String(
            form.get(
              "tracking_line"
            ) || ""
          ) ||
          null,

        general_observation:
          String(
            form.get(
              "general_observation"
            ) || ""
          ).trim() ||
          null,

        injury_flag:
          String(
            form.get(
              "injury_flag"
            ) ||
              "false"
          ) ===
          "true",

        national_team_flag:
          String(
            form.get(
              "national_team_flag"
            ) ||
              "false"
          ) ===
          "true",

        global_score:
          Number(
            globalScore.toFixed(
              2
            )
          ),

        report_status:
          "FINAL",
      };

      /* ---------------------------------------------------
         CREAR INFORME
      --------------------------------------------------- */

      const {
        data: reportData,
        error: reportError,
      } =
        await supabase
          .from(
            "scouting_reports"
          )
          .insert(
            reportPayload
          )
          .select(
            "id"
          )
          .single();

      if (
        reportError
      ) {
        throw reportError;
      }

      /* ---------------------------------------------------
         GUARDAR SCORES
      --------------------------------------------------- */

      const scoreRows =
        metrics.map(
          (
            metric
          ) => ({
            report_id:
              reportData.id,

            metric_id:
              metric.id,

            score:
              scores[
                metric.id
              ] ??
              5,

            source_type:
              "MANUAL",

            validated:
              true,
          })
        );

      const {
        error:
          scoresError,
      } =
        await supabase
          .from(
            "report_scores"
          )
          .insert(
            scoreRows
          );

      if (
        scoresError
      ) {
        throw scoresError;
      }

      /* ---------------------------------------------------
         ACTUALIZAR TRACKING
      --------------------------------------------------- */

      await updateTracking(
        playerId
      );

      /* ---------------------------------------------------
         VOLVER A FICHA
      --------------------------------------------------- */

      window.location.href =
        `/players/${playerId}`;
    } catch (
      error: unknown
    ) {
      console.error(
        "Error guardando informe:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el informe."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     ACTUALIZAR TRACKING LONGITUDINAL
  ======================================================= */

  async function updateTracking(
    id: string
  ) {
    const {
      data:
        reportsData,
      error:
        reportsError,
    } =
      await supabase
        .from(
          "scouting_reports"
        )
        .select(`
          id,
          global_score,
          minutes_observed,
          report_date
        `)
        .eq(
          "player_id",
          id
        )
        .eq(
          "report_status",
          "FINAL"
        )
        .order(
          "report_date",
          {
            ascending:
              true,
          }
        );

    if (
      reportsError
    ) {
      console.error(
        reportsError
      );

      return;
    }

    const reports =
      reportsData ||
      [];

    if (
      !reports.length
    ) {
      return;
    }

    const values =
      reports
        .map(
          (
            report
          ) =>
            Number(
              report.global_score
            )
        )
        .filter(
          (
            value
          ) =>
            !Number.isNaN(
              value
            )
        );

    if (
      !values.length
    ) {
      return;
    }

    const reportsCount =
      reports.length;

    const minutesObserved =
      reports.reduce(
        (
          total,
          report
        ) =>
          total +
          Number(
            report.minutes_observed ||
              0
          ),
        0
      );

    const average =
      averageValues(
        values
      ) ||
      0;

    const lastScore =
      values[
        values.length -
          1
      ];

    const bestScore =
      Math.max(
        ...values
      );

    const worstScore =
      Math.min(
        ...values
      );

    const last3Values =
      values.slice(
        -3
      );

    const last5Values =
      values.slice(
        -5
      );

    const scoreLast3 =
      averageValues(
        last3Values
      );

    const scoreLast5 =
      averageValues(
        last5Values
      );

    /* -----------------------------------------------------
       TENDENCIA
    ----------------------------------------------------- */

    let trend =
      "STABLE";

    if (
      values.length >=
      3
    ) {
      const previous =
        values[
          values.length -
            3
        ];

      const latest =
        values[
          values.length -
            1
        ];

      if (
        latest -
          previous >=
        0.5
      ) {
        trend =
          "ASCENDING";
      } else if (
        previous -
          latest >=
        0.5
      ) {
        trend =
          "DESCENDING";
      }
    }

    /* -----------------------------------------------------
       NIVEL DE EVIDENCIA
    ----------------------------------------------------- */

    let evidenceLevel =
      "VERY_LOW";

    if (
      reportsCount >=
      10
    ) {
      evidenceLevel =
        "CONSOLIDATED";
    } else if (
      reportsCount >=
      7
    ) {
      evidenceLevel =
        "HIGH";
    } else if (
      reportsCount >=
      4
    ) {
      evidenceLevel =
        "MODERATE";
    } else if (
      reportsCount >=
      2
    ) {
      evidenceLevel =
        "LOW";
    }

    /* -----------------------------------------------------
       CONSISTENCIA
    ----------------------------------------------------- */

    let consistencyScore:
      number | null =
      null;

    if (
      values.length >=
      2
    ) {
      const variance =
        values.reduce(
          (
            total,
            value
          ) =>
            total +
            Math.pow(
              value -
                average,
              2
            ),
          0
        ) /
        values.length;

      const standardDeviation =
        Math.sqrt(
          variance
        );

      consistencyScore =
        Math.max(
          1,
          Math.min(
            10,
            10 -
              standardDeviation *
                2
          )
        );
    }

    /* -----------------------------------------------------
       UPDATE METADATA
    ----------------------------------------------------- */

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "player_tracking_metadata"
        )
        .update({
          reports_count:
            reportsCount,

          matches_observed:
            reportsCount,

          minutes_observed:
            minutesObserved,

          avg_global_score:
            Number(
              average.toFixed(
                2
              )
            ),

          last_global_score:
            Number(
              lastScore.toFixed(
                2
              )
            ),

          best_score:
            Number(
              bestScore.toFixed(
                2
              )
            ),

          worst_score:
            Number(
              worstScore.toFixed(
                2
              )
            ),

          score_last_3:
            scoreLast3 !==
            null
              ? Number(
                  scoreLast3.toFixed(
                    2
                  )
                )
              : null,

          score_last_5:
            scoreLast5 !==
            null
              ? Number(
                  scoreLast5.toFixed(
                    2
                  )
                )
              : null,

          consistency_score:
            consistencyScore !==
            null
              ? Number(
                  consistencyScore.toFixed(
                    2
                  )
                )
              : null,

          current_level_score:
            Number(
              average.toFixed(
                2
              )
            ),

          evidence_level:
            evidenceLevel,

          trend,

          last_observed_at:
            reports[
              reports.length -
                1
            ]
              .report_date,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "player_id",
          id
        );

    if (
      updateError
    ) {
      console.error(
        "Error actualizando tracking:",
        updateError
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
      <div className="card">
        Cargando informe...
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
            Para crear informes necesitás iniciar sesión.
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
     CONSULTA / SIN PERMISO
  ======================================================= */

  if (
    !canCreateReport
  ) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
            Informes de scouting
          </div>

          <h1 className="mt-2 text-2xl font-black">
            Acceso restringido
          </h1>

          <p className="mt-3 text-slate-400">
            Tu perfil tiene permisos de consulta,
            pero no puede registrar nuevos informes.
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
     SIN JUGADOR
  ======================================================= */

  if (
    !player
  ) {
    return (
      <div className="card">

        <h1 className="text-xl font-black">
          No se puede crear el informe
        </h1>

        <p className="mt-3 text-slate-400">
          {message ||
            "No se encontró el jugador a evaluar."}
        </p>

        <a
          href="/players"
          className="btn mt-5"
        >
          Volver a jugadores
        </a>

      </div>
    );
  }

  const age =
    calculateAge(
      player.birth_date
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ===================================================
          CABECERA
      =================================================== */}

      <section className="card">

        <div className="text-sm text-slate-400">
          Nuevo informe
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 className="text-3xl font-black">
              {player.full_name}
            </h1>

            <p className="mt-2 text-slate-300">

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

          </div>

          <div className="text-right">

            <div className="text-sm text-slate-400">
              Score global
            </div>

            <div className="text-4xl font-black">
              {globalScore.toFixed(
                2
              )}
            </div>

            <div className="text-xs text-slate-500">
              /10
            </div>

          </div>

        </div>

      </section>

      {/* ===================================================
          FORMULARIO
      =================================================== */}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6"
      >

        {/* DATOS */}

        <section className="card">

          <h2 className="text-xl font-black">
            Datos de observación
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <Field
              label="Fecha del partido"
              name="report_date"
              type="date"
              defaultValue={
                new Date()
                  .toISOString()
                  .split(
                    "T"
                  )[0]
              }
              required
            />

            <Field
              label="Competencia / torneo"
              name="competition"
              placeholder="Torneo Federal A"
            />

            <Field
              label="Equipos y resultado"
              name="match_description"
              placeholder="Equipo A 1 - Equipo B 0"
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
                <option>
                  4-2-3-1
                </option>

                <option>
                  4-3-1-2
                </option>

                <option>
                  4-1-3-2
                </option>

                <option>
                  4-4-2
                </option>

                <option>
                  4-1-4-1
                </option>

                <option>
                  4-3-3
                </option>

                <option>
                  3-5-2
                </option>

                <option>
                  3-4-3
                </option>

                <option>
                  5-3-2
                </option>
              </select>

            </div>

            <div>

              <label className="label">
                Línea
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

        {/* FLAGS */}

        <section className="grid gap-4 md:grid-cols-2">

          <div className="card">

            <h3 className="font-black">
              Historial de lesiones
            </h3>

            <div className="mt-4 space-y-3">

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

            <div className="mt-4 space-y-3">

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

        {/* =================================================
            MÉTRICAS
        ================================================= */}

        {Object.entries(
          groupedMetrics
        ).map(
          ([
            group,
            groupMetrics,
          ]) => (

            <section
              key={
                group
              }
              className="card"
            >

              <h2 className="text-xl font-black">
                {group}
              </h2>

              <div className="mt-6 space-y-6">

                {groupMetrics.map(
                  (
                    metric
                  ) => (

                    <div
                      key={
                        metric.id
                      }
                      className="grid gap-3 md:grid-cols-[230px_1fr_60px] md:items-center"
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
                          scores[
                            metric.id
                          ] ??
                          5
                        }
                        onChange={(
                          event
                        ) =>
                          setScores(
                            (
                              current
                            ) => ({
                              ...current,

                              [metric.id]:
                                Number(
                                  event.target.value
                                ),
                            })
                          )
                        }
                      />

                      <div className="rounded-lg bg-slate-800 px-3 py-2 text-center text-lg font-black">
                        {scores[
                          metric.id
                        ] ??
                          5}
                      </div>

                    </div>

                  )
                )}

              </div>

            </section>

          )
        )}

        {/* OBSERVACIONES */}

        <section className="card">

          <label className="label">
            Observaciones generales
          </label>

          <textarea
            className="input min-h-48"
            name="general_observation"
            placeholder="Perfil general, fortalezas, aspectos a mejorar, impacto de las falencias y recomendación de seguimiento..."
          />

        </section>

        {/* MENSAJE */}

        {message && (

          <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-200">
            {message}
          </div>

        )}

        {/* ACCIONES */}

        <div className="flex justify-end gap-3 pb-10">

          <a
            href={`/players/${player.id}`}
            className="rounded-lg border border-slate-600 px-5 py-3"
          >
            Cancelar
          </a>

          <button
            type="submit"
            className="btn px-6 py-3"
            disabled={
              saving
            }
          >
            {saving
              ? "Guardando informe..."
              : "Guardar informe"}
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
