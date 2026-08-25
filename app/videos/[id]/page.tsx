"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams } from "next/navigation";

import { supabase } from "../../../lib/supabase";

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

  return `${minutes}:${String(
    seconds
  ).padStart(
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
    video.home_score !==
      null &&
    video.away_score !==
      null
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

function getYouTubeEmbedUrl(
  video: VideoRow
) {
  if (
    video.provider !==
      "YouTube" ||
    !video.external_video_id
  ) {
    return null;
  }

  return `https://www.youtube.com/embed/${video.external_video_id}`;
}

export default function VideoDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const [
    video,
    setVideo,
  ] =
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

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data:
        authData,
    } =
      await supabase.auth.getSession();

    if (
      !authData.session
    ) {
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
          .from(
            "videos"
          )
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
            label
          `)
          .eq(
            "position",
            "GK"
          )
          .eq(
            "active",
            true
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
        videoResponse.error
          .message
      );

      setLoading(false);

      return;
    }

    if (
      eventTypesResponse.error
    ) {
      setMessage(
        eventTypesResponse.error
          .message
      );
    }

    if (
      metricsResponse.error
    ) {
      setMessage(
        metricsResponse.error
          .message
      );
    }

    if (
      eventsResponse.error
    ) {
      setMessage(
        eventsResponse.error
          .message
      );
    }

    const loadedEventTypes =
      (
        eventTypesResponse.data ||
        []
      ) as EventType[];

    setVideo(
      videoResponse.data as unknown as VideoRow
    );

    setEventTypes(
      loadedEventTypes
    );

    setMetrics(
      (
        metricsResponse.data ||
        []
      ) as Metric[]
    );

    setEvents(
      (
        eventsResponse.data ||
        []
      ) as unknown as VideoEvent[]
    );

    if (
      loadedEventTypes.length >
      0
    ) {
      applyEventType(
        loadedEventTypes[0]
      );
    }

    setLoading(false);
  }

  function applyEventType(
    eventType: EventType
  ) {
    setSelectedEventType(
      eventType.code
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

    if (
      relatedMetric
    ) {
      setSelectedMetricId(
        relatedMetric.id
      );
    }
  }

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

    if (
      !eventType
    ) {
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

  async function handleSaveEvent(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !video
    ) {
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

    if (
      !eventType
    ) {
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

      if (
        error
      ) {
        throw error;
      }

      const updatedEvents =
        [
          ...events,
          data as unknown as VideoEvent,
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

      setTimestamp(
        timestamp + 1
      );

      setEventScore(5);

      const htmlForm =
        event.currentTarget;

      htmlForm.reset();

      setSavingEvent(false);
    } catch (
      error: any
    ) {
      console.error(
        error
      );

      setMessage(
        error?.message ||
          "No se pudo registrar el evento."
      );

      setSavingEvent(false);
    }
  }

  async function updateAnalysisState(
    eventsCount: number
  ) {
    if (
      !video
    ) {
      return;
    }

    const nextStatus =
      eventsCount >
      0
        ? "PROCESSING"
        : "UNANALYZED";

    const progress =
      Math.min(
        90,
        Math.max(
          10,
          eventsCount * 5
        )
      );

    await supabase
      .from(
        "videos"
      )
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
        video.id
      );

    await supabase
      .from(
        "video_analysis_jobs"
      )
      .update({
        status:
          "PROCESSING",

        progress,

        events_detected:
          eventsCount,

        started_at:
          new Date()
            .toISOString(),

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "video_id",
        video.id
      );

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

  async function markReview() {
    if (
      !video
    ) {
      return;
    }

    setUpdatingStatus(
      true
    );

    await supabase
      .from(
        "videos"
      )
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
        video.id
      );

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
        video.id
      );

    setVideo(
      {
        ...video,

        analysis_status:
          "REVIEW",

        processing_progress:
          95,
      }
    );

    setUpdatingStatus(
      false
    );
  }

  async function completeAnalysis() {
    if (
      !video
    ) {
      return;
    }

    setUpdatingStatus(
      true
    );

    await supabase
      .from(
        "videos"
      )
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
        video.id
      );

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
        video.id
      );

    setVideo(
      {
        ...video,

        analysis_status:
          "COMPLETED",

        processing_progress:
          100,

        human_validated:
          true,
      }
    );

    setUpdatingStatus(
      false
    );
  }

  async function deleteEvent(
    eventId: string
  ) {
    const confirmed =
      window.confirm(
        "¿Eliminar este evento?"
      );

    if (
      !confirmed
    ) {
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

    if (
      error
    ) {
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

  const averageEventScore =
    useMemo(() => {
      const values =
        events
          .map(
            (
              item
            ) =>
              Number(
                item.event_score
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
      events,
    ]);

  const positiveCount =
    events.filter(
      (
        item
      ) =>
        item.positive_event ===
        true
    ).length;

  const negativeCount =
    events.filter(
      (
        item
      ) =>
        item.positive_event ===
        false
    ).length;

  if (
    loading
  ) {
    return (
      <div className="card">
        Cargando video...
      </div>
    );
  }

  if (
    !video
  ) {
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

      {/* DATOS */}

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
          label="Equipo arquero"
          value={
            video.goalkeeper_team ||
            "Sin registrar"
          }
        />

        <InfoCard
          label="Eventos"
          value={String(
            events.length
          )}
        />

        <InfoCard
          label="Score eventos"
          value={
            averageEventScore !==
            null
              ? averageEventScore.toFixed(
                  2
                )
              : "—"
          }
        />

      </section>

      {/* REPRODUCTOR */}

      <section className="card">

        <div className="flex flex-wrap items-center justify-between gap-4">

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
            href={
              video.url
            }
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
                "Video"
              }
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />

          </div>

        ) : (

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/30 p-6">

            <p className="text-sm text-slate-300">
              Esta fuente no puede reproducirse directamente dentro de Scout GK.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Abrí el video en otra pestaña y utilizá el registro manual de timestamps.
            </p>

          </div>

        )}

      </section>

      {/* CONTROL DE TIEMPO */}

      <section className="card">

        <h2 className="text-xl font-black">
          Momento del video
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_160px]">

          <div>

            <label className="label">
              Timestamp en segundos
            </label>

            <input
              type="range"
              min="0"
              max="7200"
              step="1"
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
              className="w-full"
            />

          </div>

          <div>

            <label className="label">
              Tiempo
            </label>

            <input
              className="input"
              type="number"
              min="0"
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

          </div>

        </div>

        <div className="mt-4 text-3xl font-black">
          {formatSeconds(
            timestamp
          )}
        </div>

      </section>

      {/* NUEVO EVENTO */}

      <form
        onSubmit={
          handleSaveEvent
        }
        className="card"
      >

        <h2 className="text-xl font-black">
          Registrar evento
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Cada evento queda asociado al video, jugador, timestamp y métrica correspondiente.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">

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

          <div>

            <label className="label">
              Resultado
            </label>

            <input
              className="input"
              name="result"
              placeholder="Ej. Control seguro, despeje, pérdida..."
            />

          </div>

          <div>

            <label className="label">
              Evaluación
            </label>

            <div className="flex items-center gap-4">

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

              <div className="min-w-12 rounded-lg bg-slate-800 px-3 py-2 text-center text-xl font-black">
                {eventScore}
              </div>

            </div>

          </div>

          <div className="md:col-span-2">

            <label className="label">
              Impacto del evento
            </label>

            <div className="flex flex-wrap gap-5">

              <label>

                <input
                  type="radio"
                  checked={
                    positiveEvent ===
                    true
                  }
                  onChange={() =>
                    setPositiveEvent(
                      true
                    )
                  }
                />{" "}
                Positivo

              </label>

              <label>

                <input
                  type="radio"
                  checked={
                    positiveEvent ===
                    false
                  }
                  onChange={() =>
                    setPositiveEvent(
                      false
                    )
                  }
                />{" "}
                Negativo

              </label>

            </div>

          </div>

          <div className="md:col-span-2">

            <label className="label">
              Comentario
            </label>

            <textarea
              className="input min-h-28"
              name="comment"
              placeholder="Lectura de la jugada, decisión del arquero, ejecución, contexto..."
            />

          </div>

        </div>

        {message && (

          <div className="mt-5 rounded-xl border border-red-800 bg-red-950/30 p-4">
            {message}
          </div>

        )}

        <div className="mt-6 flex justify-end">

          <button
            type="submit"
            className="btn"
            disabled={
              savingEvent
            }
          >
            {savingEvent
              ? "Guardando evento..."
              : `+ Registrar evento en ${formatSeconds(
                  timestamp
                )}`}
          </button>

        </div>

      </form>

      {/* RESUMEN */}

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
            events.filter(
              (
                item
              ) =>
                item.validated
            ).length
          )}
        />

      </section>

      {/* EVENTOS */}

      <section className="card">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <h2 className="text-xl font-black">
              Eventos registrados
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Evidencia cronológica del análisis.
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
                          {item.positive_event
                            ? "Positivo"
                            : "Negativo"}
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteEvent(
                            item.id
                          )
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400"
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

      <div className="flex justify-between gap-3 pb-10">

        <a
          href="/videos"
          className="rounded-lg border border-slate-600 px-5 py-3"
        >
          ← Biblioteca
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
