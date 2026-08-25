"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

/* =========================================================
   TIPOS
========================================================= */

type VideoRow = {
  id: string;

  title: string | null;
  description: string | null;
  url: string;

  provider: string | null;
  external_video_id: string | null;

  match_date: string | null;
  competition_name: string | null;

  home_team: string | null;
  away_team: string | null;

  home_score: number | null;
  away_score: number | null;

  goalkeeper_team: string | null;

  analysis_status: string | null;
  processing_progress: number | null;
  human_validated: boolean | null;

  player_id: string | null;

  players: {
    id: string;
    full_name: string;
    height_cm: number | null;
    preferred_foot: string | null;
  } | null;
};

type EventType = {
  id: string;
  code: string;
  label: string;
  category: string;
  metric_code: string | null;
  positive_default: boolean | null;
  sort_order: number;
};

type Metric = {
  id: string;
  code: string;
  label: string;
  group_name: string;
  sort_order: number;
};

type VideoEvent = {
  id: string;

  timestamp_start_seconds: number;
  timestamp_end_seconds: number | null;

  minute_label: string | null;

  event_type: string | null;
  event_category: string | null;
  event_subtype: string | null;

  event_score: number | null;

  positive_event: boolean | null;

  result: string | null;
  comment: string | null;

  source_type: string | null;

  confidence: number | null;
  validated: boolean | null;

  metric_id: string | null;

  evaluation_metrics: {
    label: string;
    code: string;
  } | null;
};

type MetricEvidence =
  | "NONE"
  | "LOW"
  | "MODERATE"
  | "HIGH";

type MetricPreEvaluation = {
  metric_id: string;

  code: string;
  label: string;
  group_name: string;

  score: number | null;

  events_count: number;
  positive_count: number;
  negative_count: number;

  evidence: MetricEvidence;
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(
    0,
    Math.floor(totalSeconds)
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const seconds =
    safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function formatMatchDate(
  value: string | null
) {
  if (!value) {
    return "Fecha sin registrar";
  }

  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    "es-AR"
  );
}

function matchLabel(
  video: VideoRow
) {
  const home =
    video.home_team ||
    "Local";

  const away =
    video.away_team ||
    "Visitante";

  if (
    video.home_score !== null &&
    video.away_score !== null
  ) {
    return `${home} ${video.home_score} - ${video.away_score} ${away}`;
  }

  return `${home} vs ${away}`;
}

function statusLabel(
  value:
    | string
    | null
    | undefined
) {
  switch (value) {
    case "UNANALYZED":
      return "Sin analizar";

    case "PENDING":
      return "Pendiente";

    case "PROCESSING":
      return "Procesando";

    case "REVIEW":
      return "En revisión";

    case "COMPLETED":
      return "Completado";

    case "FAILED":
      return "Error";

    default:
      return (
        value ||
        "Sin estado"
      );
  }
}

function evidenceLabel(
  value: MetricEvidence
) {
  switch (value) {
    case "HIGH":
      return "Alta";

    case "MODERATE":
      return "Moderada";

    case "LOW":
      return "Baja";

    default:
      return "Sin evidencia";
  }
}

function getYouTubeEmbedUrl(
  video: VideoRow
) {
  if (
    video.provider !== "YouTube" ||
    !video.external_video_id
  ) {
    return null;
  }

  return `https://www.youtube.com/embed/${video.external_video_id}`;
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function VideoDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const [video, setVideo] =
    useState<VideoRow | null>(
      null
    );

  const [
    eventTypes,
    setEventTypes,
  ] =
    useState<EventType[]>(
      []
    );

  const [
    metrics,
    setMetrics,
  ] =
    useState<Metric[]>(
      []
    );

  const [
    events,
    setEvents,
  ] =
    useState<VideoEvent[]>(
      []
    );

  const [
    selectedEventType,
    setSelectedEventType,
  ] =
    useState("");

  const [
    selectedMetricId,
    setSelectedMetricId,
  ] =
    useState("");

  const [
    timestamp,
    setTimestamp,
  ] =
    useState(0);

  const [
    eventScore,
    setEventScore,
  ] =
    useState(5);

  const [
    positiveEvent,
    setPositiveEvent,
  ] =
    useState(true);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    savingEvent,
    setSavingEvent,
  ] =
    useState(false);

  const [
    updatingStatus,
    setUpdatingStatus,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  /* =======================================================
     CARGA INICIAL
  ======================================================= */

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: authData,
    } =
      await supabase.auth.getSession();

    if (!authData.session) {
      setMessage(
        "Necesitás iniciar sesión."
      );

      setLoading(false);

      return;
    }

    const [
      videoResponse,
      eventTypesResponse,
      metricsResponse,
      eventsResponse,
    ] =
      await Promise.all([
        supabase
          .from("videos")
          .select(`
            id,
            title,
            description,
            url,
            provider,
            external_video_id,
            match_date,
            competition_name,
            home_team,
            away_team,
            home_score,
            away_score,
            goalkeeper_team,
            analysis_status,
            processing_progress,
            human_validated,
            player_id,

            players:player_id (
              id,
              full_name,
              height_cm,
              preferred_foot
            )
          `)
          .eq(
            "id",
            params.id
          )
          .single(),

        supabase
          .from(
            "video_event_types"
          )
          .select(`
            id,
            code,
            label,
            category,
            metric_code,
            positive_default,
            sort_order
          `)
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

        supabase
          .from(
            "evaluation_metrics"
          )
          .select(`
            id,
            code,
            label,
            group_name,
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

        supabase
          .from(
            "video_events"
          )
          .select(`
            id,
            timestamp_start_seconds,
            timestamp_end_seconds,
            minute_label,
            event_type,
            event_category,
            event_subtype,
            event_score,
            positive_event,
            result,
            comment,
            source_type,
            confidence,
            validated,
            metric_id,

            evaluation_metrics:metric_id (
              label,
              code
            )
          `)
          .eq(
            "video_id",
            params.id
          )
          .order(
            "timestamp_start_seconds",
            {
              ascending: true,
            }
          ),
      ]);

    if (
      videoResponse.error
    ) {
      setMessage(
        videoResponse.error.message
      );

      setLoading(false);

      return;
    }

    if (
      eventTypesResponse.error
    ) {
      setMessage(
        eventTypesResponse.error.message
      );
    }

    if (
      metricsResponse.error
    ) {
      setMessage(
        metricsResponse.error.message
      );
    }

    if (
      eventsResponse.error
    ) {
      setMessage(
        eventsResponse.error.message
      );
    }

    const loadedMetrics =
      (
        metricsResponse.data ||
        []
      ) as Metric[];

    const loadedEventTypes =
      (
        eventTypesResponse.data ||
        []
      ) as EventType[];

    setVideo(
      videoResponse.data as unknown as VideoRow
    );

    setMetrics(
      loadedMetrics
    );

    setEventTypes(
      loadedEventTypes
    );

    setEvents(
      (
        eventsResponse.data ||
        []
      ) as unknown as VideoEvent[]
    );

    /*
     * Inicializamos la primera acción
     * y su métrica asociada.
     */
    if (
      loadedEventTypes.length >
      0
    ) {
      const firstEvent =
        loadedEventTypes[0];

      setSelectedEventType(
        firstEvent.code
      );

      setPositiveEvent(
        firstEvent.positive_default ??
          true
      );

      const relatedMetric =
        loadedMetrics.find(
          (
            metric
          ) =>
            metric.code ===
            firstEvent.metric_code
        );

      setSelectedMetricId(
        relatedMetric?.id ||
          ""
      );
    }

    setLoading(false);
  }

  /* =======================================================
     CAMBIO DE TIPO DE EVENTO
  ======================================================= */

  function handleEventTypeChange(
    code: string
  ) {
    const eventType =
      eventTypes.find(
        (
          item
        ) =>
          item.code ===
          code
      );

    if (!eventType) {
      return;
    }

    setSelectedEventType(
      code
    );

    setPositiveEvent(
      eventType.positive_default ??
        true
    );

    const relatedMetric =
      metrics.find(
        (
          metric
        ) =>
          metric.code ===
          eventType.metric_code
      );

    setSelectedMetricId(
      relatedMetric?.id ||
        ""
    );
  }

  /* =======================================================
     GUARDAR EVENTO
  ======================================================= */

  async function handleSaveEvent(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!video) {
      setMessage(
        "No se encontró el video."
      );
      return;
    }

    const form =
      new FormData(
        event.currentTarget
      );

    const eventType =
      eventTypes.find(
        (
          item
        ) =>
          item.code ===
          selectedEventType
      );

    if (!eventType) {
      setMessage(
        "Seleccioná un tipo de evento."
      );

      return;
    }

    setSavingEvent(true);
    setMessage("");

    try {
      const payload = {
        video_id:
          video.id,

        player_id:
          video.player_id,

        metric_id:
          selectedMetricId ||
          null,

        timestamp_start_seconds:
          Number(
            timestamp
          ),

        timestamp_end_seconds:
          null,

        minute_label:
          formatSeconds(
            timestamp
          ),

        event_type:
          eventType.code,

        event_category:
          eventType.category,

        event_subtype:
          eventType.label,

        event_score:
          Number(
            eventScore
          ),

        positive_event:
          positiveEvent,

        result:
          String(
            form.get(
              "result"
            ) || ""
          ).trim() ||
          null,

        comment:
          String(
            form.get(
              "comment"
            ) || ""
          ).trim() ||
          null,

        source_type:
          "MANUAL",

        confidence:
          100,

        validated:
          true,

        validated_at:
          new Date()
            .toISOString(),

        updated_at:
          new Date()
            .toISOString(),
      };

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "video_events"
          )
          .insert(
            payload
          )
          .select(`
            id,
            timestamp_start_seconds,
            timestamp_end_seconds,
            minute_label,
            event_type,
            event_category,
            event_subtype,
            event_score,
            positive_event,
            result,
            comment,
            source_type,
            confidence,
            validated,
            metric_id,

            evaluation_metrics:metric_id (
              label,
              code
            )
          `)
          .single();

      if (error) {
        throw error;
      }

      const newEvent =
        data as unknown as VideoEvent;

      const updatedEvents =
        [
          ...events,
          newEvent,
        ].sort(
          (
            a,
            b
          ) =>
            a.timestamp_start_seconds -
            b.timestamp_start_seconds
        );

      setEvents(
        updatedEvents
      );

      await updateAnalysisState(
        updatedEvents.length
      );

      /*
       * Avanza un segundo para facilitar
       * el registro consecutivo.
       */
      setTimestamp(
        (
          current
        ) =>
          current + 1
      );

      setEventScore(5);

      event.currentTarget.reset();

      setSavingEvent(false);
    } catch (
      error: unknown
    ) {
      console.error(
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo registrar el evento.";

      setMessage(
        errorMessage
      );

      setSavingEvent(false);
    }
  }

  /* =======================================================
     ESTADO DEL ANÁLISIS
  ======================================================= */

  async function updateAnalysisState(
    eventsCount: number
  ) {
    if (!video) {
      return;
    }

    const currentVideo =
      video;

    const nextStatus =
      eventsCount >
      0
        ? "PROCESSING"
        : "UNANALYZED";

    const progress =
      eventsCount ===
      0
        ? 0
        : Math.min(
            90,
            Math.max(
              10,
              eventsCount * 5
            )
          );

    const {
      error:
        videoUpdateError,
    } =
      await supabase
        .from("videos")
        .update({
          analysis_status:
            nextStatus,

          processing_progress:
            progress,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          currentVideo.id
        );

    if (
      videoUpdateError
    ) {
      console.error(
        videoUpdateError
      );
    }

    const {
      error:
        jobUpdateError,
    } =
      await supabase
        .from(
          "video_analysis_jobs"
        )
        .update({
          status:
            eventsCount >
            0
              ? "PROCESSING"
              : "PENDING",

          progress,

          events_detected:
            eventsCount,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "video_id",
          currentVideo.id
        );

    if (
      jobUpdateError
    ) {
      console.error(
        jobUpdateError
      );
    }

    setVideo(
      (
        current
      ) =>
        current
          ? {
              ...current,

              analysis_status:
                nextStatus,

              processing_progress:
                progress,
            }
          : current
    );
  }

  /* =======================================================
     PASAR A REVISIÓN
  ======================================================= */

  async function markReview() {
    if (!video) {
      return;
    }

    const currentVideo =
      video;

    setUpdatingStatus(
      true
    );

    try {
      const {
        error:
          videoError,
      } =
        await supabase
          .from("videos")
          .update({
            analysis_status:
              "REVIEW",

            processing_progress:
              95,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            currentVideo.id
          );

      if (videoError) {
        throw videoError;
      }

      const {
        error:
          jobError,
      } =
        await supabase
          .from(
            "video_analysis_jobs"
          )
          .update({
            status:
              "REVIEW",

            progress:
              95,

            events_detected:
              events.length,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "video_id",
            currentVideo.id
          );

      if (jobError) {
        console.error(
          jobError
        );
      }

      setVideo({
        ...currentVideo,

        analysis_status:
          "REVIEW",

        processing_progress:
          95,
      });
    } catch (
      error: unknown
    ) {
      console.error(
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el análisis.";

      setMessage(
        errorMessage
      );
    } finally {
      setUpdatingStatus(
        false
      );
    }
  }

  /* =======================================================
     COMPLETAR ANÁLISIS
  ======================================================= */

  async function completeAnalysis() {
    if (!video) {
      return;
    }

    const currentVideo =
      video;

    setUpdatingStatus(
      true
    );

    try {
      const {
        error:
          videoError,
      } =
        await supabase
          .from("videos")
          .update({
            analysis_status:
              "COMPLETED",

            processing_progress:
              100,

            human_validated:
              true,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            currentVideo.id
          );

      if (videoError) {
        throw videoError;
      }

      const {
        error:
          jobError,
      } =
        await supabase
          .from(
            "video_analysis_jobs"
          )
          .update({
            status:
              "COMPLETED",

            progress:
              100,

            events_detected:
              events.length,

            finished_at:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "video_id",
            currentVideo.id
          );

      if (jobError) {
        console.error(
          jobError
        );
      }

      setVideo({
        ...currentVideo,

        analysis_status:
          "COMPLETED",

        processing_progress:
          100,

        human_validated:
          true,
      });
    } catch (
      error: unknown
    ) {
      console.error(
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo completar el análisis.";

      setMessage(
        errorMessage
      );
    } finally {
      setUpdatingStatus(
        false
      );
    }
  }

  /* =======================================================
     ELIMINAR EVENTO
  ======================================================= */

  async function deleteEvent(
    eventId: string
  ) {
    const confirmed =
      window.confirm(
        "¿Eliminar este evento?"
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "video_events"
        )
        .delete()
        .eq(
          "id",
          eventId
        );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    const updatedEvents =
      events.filter(
        (
          item
        ) =>
          item.id !==
          eventId
      );

    setEvents(
      updatedEvents
    );

    await updateAnalysisState(
      updatedEvents.length
    );
  }

  /* =======================================================
     PREEVALUACIÓN TÉCNICA
  ======================================================= */

  const preEvaluation =
    useMemo<
      MetricPreEvaluation[]
    >(() => {
      return metrics.map(
        (
          metric
        ) => {
          const relatedEvents =
            events.filter(
              (
                item
              ) =>
                item.metric_id ===
                  metric.id &&
                item.validated ===
                  true &&
                item.event_score !==
                  null
            );

          if (
            relatedEvents.length ===
            0
          ) {
            return {
              metric_id:
                metric.id,

              code:
                metric.code,

              label:
                metric.label,

              group_name:
                metric.group_name,

              score:
                null,

              events_count:
                0,

              positive_count:
                0,

              negative_count:
                0,

              evidence:
                "NONE",
            };
          }

          const values =
            relatedEvents.map(
              (
                item
              ) =>
                Number(
                  item.event_score
                )
            );

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

          const positiveCount =
            relatedEvents.filter(
              (
                item
              ) =>
                item.positive_event ===
                true
            ).length;

          const negativeCount =
            relatedEvents.filter(
              (
                item
              ) =>
                item.positive_event ===
                false
            ).length;

          let evidence:
            MetricEvidence =
            "LOW";

          if (
            relatedEvents.length >=
            5
          ) {
            evidence =
              "HIGH";
          } else if (
            relatedEvents.length >=
            3
          ) {
            evidence =
              "MODERATE";
          }

          return {
            metric_id:
              metric.id,

            code:
              metric.code,

            label:
              metric.label,

            group_name:
              metric.group_name,

            score:
              Number(
                average.toFixed(
                  2
                )
              ),

            events_count:
              relatedEvents.length,

            positive_count:
              positiveCount,

            negative_count:
              negativeCount,

            evidence,
          };
        }
      );
    }, [
      metrics,
      events,
    ]);

  const metricsWithEvidence =
    useMemo(
      () =>
        preEvaluation.filter(
          (
            item
          ) =>
            item.score !==
            null
        ),
      [preEvaluation]
    );

  const preEvaluationScore =
    useMemo(() => {
      const values =
        metricsWithEvidence
          .map(
            (
              item
            ) =>
              item.score
          )
          .filter(
            (
              value
            ): value is number =>
              value !==
              null
          );

      if (
        values.length ===
        0
      ) {
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
    }, [
      metricsWithEvidence,
    ]);

  /* =======================================================
     GENERAR INFORME DESDE VIDEO
     CORREGIDO PARA TYPESCRIPT
  ======================================================= */

  function generateReportFromVideo() {
    if (!video) {
      setMessage(
        "No se encontró la información del video."
      );

      return;
    }

    if (!video.player_id) {
      setMessage(
        "El video no tiene un jugador asociado."
      );

      return;
    }

    if (
      metricsWithEvidence.length ===
      0
    ) {
      setMessage(
        "Todavía no hay eventos suficientes para generar una preevaluación."
      );

      return;
    }

    /*
     * Después de comprobar player_id,
     * lo guardamos en una constante.
     *
     * TypeScript ya lo considera string.
     */
    const playerId =
      video.player_id;

    const currentVideo =
      video;

    const payload = {
      version: 1,

      video_id:
        currentVideo.id,

      player_id:
        playerId,

      match_date:
        currentVideo.match_date,

      competition:
        currentVideo.competition_name,

      match_description:
        matchLabel(
          currentVideo
        ),

      metrics:
        metricsWithEvidence.map(
          (
            item
          ) => ({
            metric_id:
              item.metric_id,

            code:
              item.code,

            score:
              item.score,

            events_count:
              item.events_count,

            evidence:
              item.evidence,
          })
        ),
    };

    sessionStorage.setItem(
      "scout_gk_video_preevaluation",
      JSON.stringify(
        payload
      )
    );

    window.location.href =
      `/reports/new?player=${playerId}&video=${currentVideo.id}`;
  }

  /* =======================================================
     DATOS DERIVADOS
  ======================================================= */

  const youtubeEmbedUrl =
    useMemo(
      () =>
        video
          ? getYouTubeEmbedUrl(
              video
            )
          : null,
      [video]
    );

  const positiveCount =
    useMemo(
      () =>
        events.filter(
          (
            item
          ) =>
            item.positive_event ===
            true
        ).length,
      [events]
    );

  const negativeCount =
    useMemo(
      () =>
        events.filter(
          (
            item
          ) =>
            item.positive_event ===
            false
        ).length,
      [events]
    );

  const validatedCount =
    useMemo(
      () =>
        events.filter(
          (
            item
          ) =>
            item.validated ===
            true
        ).length,
      [events]
    );

  /* =======================================================
     ESTADOS DE PANTALLA
  ======================================================= */

  if (loading) {
    return (
      <div className="card">
        Cargando video...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="card">
        <h1 className="text-2xl font-black">
          Video no disponible
        </h1>

        <p className="mt-3 text-slate-400">
          {message ||
            "No se encontró el video."}
        </p>

        <a
          href="/videos"
          className="btn mt-5"
        >
          Volver
        </a>
      </div>
    );
  }

  /* =======================================================
     UI PRINCIPAL
  ======================================================= */

  return (
    <div className="space-y-8">

      {/* CABECERA */}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-sm text-slate-400">
              Análisis audiovisual
            </div>

            <h1 className="mt-1 text-3xl font-black">
              {video.title ||
                "Video de scouting"}
            </h1>

            <p className="mt-2 text-slate-300">
              {video.players
                ?.full_name ||
                "Jugador sin asociar"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {formatMatchDate(
                video.match_date
              )}

              {" · "}

              {video.competition_name ||
                "Competencia sin registrar"}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">
              Estado
            </div>

            <div className="mt-1 font-black">
              {statusLabel(
                video.analysis_status
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {video.processing_progress ??
                0}
              %
            </div>
          </div>
        </div>
      </section>

      {/* RESUMEN */}

      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard
          label="Partido"
          value={
            matchLabel(
              video
            )
          }
        />

        <InfoCard
          label="Eventos"
          value={String(
            events.length
          )}
        />

        <InfoCard
          label="Métricas con evidencia"
          value={String(
            metricsWithEvidence.length
          )}
        />

        <InfoCard
          label="Preevaluación"
          value={
            preEvaluationScore !==
            null
              ? preEvaluationScore.toFixed(
                  2
                )
              : "—"
          }
        />
      </section>

      {/* VIDEO */}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">
              Video
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Fuente:{" "}
              {video.provider ||
                "Externa"}
            </p>
          </div>

          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
          >
            Abrir fuente
          </a>
        </div>

        {youtubeEmbedUrl ? (
          <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-slate-800">
            <iframe
              src={
                youtubeEmbedUrl
              }
              title={
                video.title ||
                "Video de scouting"
              }
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-400">
            Esta fuente no puede reproducirse directamente dentro de Scout GK.
            Abrí el video en otra pestaña y utilizá el timestamp manual.
          </div>
        )}
      </section>

      {/* REGISTRO EVENTO */}

      <section className="card">
        <h2 className="text-xl font-black">
          Registrar evento
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Registrá las acciones relevantes del arquero durante el partido.
        </p>

        <form
          onSubmit={
            handleSaveEvent
          }
          className="mt-6 space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">

            {/* TIPO */}

            <div>
              <label className="label">
                Tipo de evento
              </label>

              <select
                className="input"
                value={
                  selectedEventType
                }
                onChange={(
                  event
                ) =>
                  handleEventTypeChange(
                    event.target
                      .value
                  )
                }
              >
                {eventTypes.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.code
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* MÉTRICA */}

            <div>
              <label className="label">
                Métrica asociada
              </label>

              <select
                className="input"
                value={
                  selectedMetricId
                }
                onChange={(
                  event
                ) =>
                  setSelectedMetricId(
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Sin métrica
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
                      {metric.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* TIMESTAMP */}

          <div>
            <label className="label">
              Timestamp
            </label>

            <div className="grid gap-4 md:grid-cols-[1fr_120px] md:items-center">
              <input
                className="input"
                type="number"
                min="0"
                max="10800"
                value={
                  timestamp
                }
                onChange={(
                  event
                ) =>
                  setTimestamp(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              />

              <div className="rounded-lg bg-slate-950/40 p-3 text-center text-xl font-black">
                {formatSeconds(
                  timestamp
                )}
              </div>
            </div>
          </div>

          {/* SCORE */}

          <div>
            <label className="label">
              Score del evento
            </label>

            <div className="flex items-center gap-5">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={
                  eventScore
                }
                onChange={(
                  event
                ) =>
                  setEventScore(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="flex-1"
              />

              <div className="min-w-14 rounded-lg bg-slate-800 px-3 py-2 text-center text-xl font-black">
                {eventScore}
              </div>
            </div>
          </div>

          {/* IMPACTO */}

          <div>
            <label className="label">
              Impacto
            </label>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="impact"
                  checked={
                    positiveEvent
                  }
                  onChange={() =>
                    setPositiveEvent(
                      true
                    )
                  }
                />

                Positivo
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="impact"
                  checked={
                    !positiveEvent
                  }
                  onChange={() =>
                    setPositiveEvent(
                      false
                    )
                  }
                />

                Negativo
              </label>
            </div>
          </div>

          {/* RESULTADO */}

          <div>
            <label className="label">
              Resultado
            </label>

            <input
              className="input"
              name="result"
              placeholder="Ej. Control seguro, despeje, pérdida, gol evitado..."
            />
          </div>

          {/* COMENTARIO */}

          <div>
            <label className="label">
              Comentario técnico
            </label>

            <textarea
              className="input min-h-28"
              name="comment"
              placeholder="Decisión, ejecución, contexto y lectura técnica de la acción..."
            />
          </div>

          {message && (
            <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm">
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn"
              disabled={
                savingEvent
              }
            >
              {savingEvent
                ? "Guardando..."
                : `+ Registrar evento · ${formatSeconds(
                    timestamp
                  )}`}
            </button>
          </div>
        </form>
      </section>

      {/* PREEVALUACIÓN */}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-xl font-black">
              Preevaluación técnica derivada del video
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Solo se calculan variables que cuentan con eventos validados.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={
              generateReportFromVideo
            }
            disabled={
              metricsWithEvidence.length ===
              0
            }
          >
            Generar informe desde video
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {preEvaluation.map(
            (
              item
            ) => (
              <div
                key={
                  item.metric_id
                }
                className="rounded-xl border border-slate-800 bg-slate-950/20 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold">
                      {item.label}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {item.events_count} evento
                      {item.events_count ===
                      1
                        ? ""
                        : "s"}
                      {" · "}
                      Evidencia{" "}
                      {evidenceLabel(
                        item.evidence
                      )}
                    </div>
                  </div>

                  <div className="text-2xl font-black">
                    {item.score !==
                    null
                      ? item.score.toFixed(
                          2
                        )
                      : "—"}
                  </div>
                </div>

                {item.events_count >
                  0 && (
                  <div className="mt-4 text-xs text-slate-500">
                    Positivos:{" "}
                    {
                      item.positive_count
                    }

                    {" · "}

                    Negativos:{" "}
                    {
                      item.negative_count
                    }
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* RESUMEN EVENTOS */}

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          label="Eventos positivos"
          value={String(
            positiveCount
          )}
        />

        <InfoCard
          label="Eventos negativos"
          value={String(
            negativeCount
          )}
        />

        <InfoCard
          label="Eventos validados"
          value={String(
            validatedCount
          )}
        />
      </section>

      {/* HISTORIAL EVENTOS */}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-xl font-black">
              Eventos registrados
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Evidencia cronológica del análisis audiovisual.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
              onClick={
                markReview
              }
              disabled={
                updatingStatus ||
                events.length ===
                  0
              }
            >
              Pasar a revisión
            </button>

            <button
              type="button"
              className="btn"
              onClick={
                completeAnalysis
              }
              disabled={
                updatingStatus ||
                events.length ===
                  0
              }
            >
              Completar análisis
            </button>
          </div>
        </div>

        {events.length ===
        0 ? (
          <div className="mt-6 rounded-xl border border-slate-800 p-5 text-sm text-slate-500">
            Todavía no hay eventos registrados.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {events.map(
              (
                item
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="rounded-xl border border-slate-800 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="flex gap-4">
                      <div className="min-w-16 text-xl font-black">
                        {formatSeconds(
                          item.timestamp_start_seconds
                        )}
                      </div>

                      <div>
                        <div className="font-bold">
                          {item.event_subtype ||
                            item.event_type ||
                            "Evento"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.event_category ||
                            "Sin categoría"}

                          {item.evaluation_metrics
                            ?.label &&
                            ` · ${item.evaluation_metrics.label}`}
                        </div>

                        {item.result && (
                          <div className="mt-2 text-sm text-slate-300">
                            {item.result}
                          </div>
                        )}

                        {item.comment && (
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                            {item.comment}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-5">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">
                          Score
                        </div>

                        <div className="text-2xl font-black">
                          {item.event_score ??
                            "—"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.positive_event ===
                          true
                            ? "Positivo"
                            : item.positive_event ===
                              false
                            ? "Negativo"
                            : "Sin clasificación"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteEvent(
                            item.id
                          )
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* NAVEGACIÓN */}

      <div className="flex flex-wrap justify-between gap-3 pb-10">
        <a
          href="/videos"
          className="rounded-lg border border-slate-600 px-5 py-3"
        >
          ← Biblioteca de videos
        </a>

        {video.player_id && (
          <a
            href={`/players/${video.player_id}`}
            className="btn"
          >
            Ver ficha del arquero
          </a>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

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

      <div className="mt-2 text-xl font-black">
        {value}
      </div>
    </div>
  );
}
