"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useCurrentUser } from "../../lib/useCurrentUser";

type VideoRow = {
  id: string;
  title: string | null;
  description: string | null;
  url: string;
  video_type: string | null;
  source: string | null;
  provider: string | null;
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
  created_at: string;

  players: {
    id: string;
    full_name: string;
  } | null;
};

function statusLabel(value: string | null | undefined) {
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
      return value || "Sin estado";
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString(
    "es-AR"
  );
}

function matchLabel(video: VideoRow) {
  const home = video.home_team || "Local";
  const away = video.away_team || "Visitante";

  if (
    video.home_score !== null &&
    video.home_score !== undefined &&
    video.away_score !== null &&
    video.away_score !== undefined
  ) {
    return `${home} ${video.home_score} - ${video.away_score} ${away}`;
  }

  if (video.home_team || video.away_team) {
    return `${home} vs ${away}`;
  }

  return "Partido sin registrar";
}

export default function VideosPage() {
  const {
    profile,
    loading: profileLoading,
    can,
  } = useCurrentUser();

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /*
   * ADMIN y SCOUT pueden registrar videos.
   */
  const canCreateVideo = can("videos:create");

  /*
   * La eliminación queda reservada
   * exclusivamente al administrador.
   */
  const canDeleteVideo =
    profile?.role === "ADMIN" &&
    can("videos:delete");

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    setLoading(true);
    setMessage("");

    const { data: authData } =
      await supabase.auth.getSession();

    if (!authData.session) {
      setMessage("Necesitás iniciar sesión.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("videos")
      .select(`
        id,
        title,
        description,
        url,
        video_type,
        source,
        provider,
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
        created_at,

        players:player_id (
          id,
          full_name
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setVideos(
      (data || []) as unknown as VideoRow[]
    );

    setLoading(false);
  }

  async function deleteVideo(video: VideoRow) {
    /*
     * Segunda protección en la interfaz.
     * Aunque alguien intentara ejecutar
     * manualmente esta función, solo ADMIN
     * puede continuar.
     */
    if (!canDeleteVideo) {
      setMessage(
        "No tenés permisos para eliminar videos."
      );
      return;
    }

    const playerName =
      video.players?.full_name ||
      "Jugador sin asociar";

    const videoName =
      video.title ||
      matchLabel(video) ||
      "Video sin título";

    const confirmed = window.confirm(
      `¿Eliminar este video?\n\n` +
        `${videoName}\n` +
        `Arquero: ${playerName}\n\n` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(video.id);
    setMessage("");

    try {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", video.id);

      if (error) {
        throw error;
      }

      setVideos((currentVideos) =>
        currentVideos.filter(
          (currentVideo) =>
            currentVideo.id !== video.id
        )
      );
    } catch (error: any) {
      console.error(
        "Error eliminando video:",
        error
      );

      setMessage(
        error?.message ||
          "No se pudo eliminar el video."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filteredVideos = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return videos.filter((video) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        video.analysis_status === statusFilter;

      const searchableText = [
        video.title,
        video.description,
        video.competition_name,
        video.home_team,
        video.away_team,
        video.goalkeeper_team,
        video.players?.full_name,
        video.provider,
        video.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term ||
        searchableText.includes(term);

      return (
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    videos,
    search,
    statusFilter,
  ]);

  /*
   * Usuario no autenticado.
   */
  if (
    message === "Necesitás iniciar sesión." &&
    !loading
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black">
            Videos
          </h1>

          <p className="mt-2 text-slate-400">
            Biblioteca audiovisual de scouting.
          </p>
        </div>

        <div className="card">
          <p className="text-slate-300">
            {message}
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

  /*
   * Mientras se determina el perfil,
   * evitamos mostrar acciones que luego
   * podrían desaparecer.
   */
  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black">
            Videos
          </h1>

          <p className="mt-2 text-slate-400">
            Biblioteca audiovisual para análisis y
            seguimiento de arqueros.
          </p>
        </div>

        <div className="card">
          Cargando biblioteca...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* =====================================================
          CABECERA
      ====================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-3xl font-black">
            Videos
          </h1>

          <p className="mt-2 text-slate-400">
            Biblioteca audiovisual para análisis y
            seguimiento de arqueros.
          </p>
        </div>

        {canCreateVideo && (
          <a
            href="/videos/new"
            className="btn"
          >
            + Nuevo video
          </a>
        )}
      </div>

      {/* =====================================================
          MENSAJES
      ====================================================== */}

      {message && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-red-300">
              {message}
            </p>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="text-sm text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          FILTROS
      ====================================================== */}

      <section className="card">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label className="label">
              Buscar
            </label>

            <input
              className="input"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Jugador, torneo, equipo, título..."
            />
          </div>

          <div>
            <label className="label">
              Estado
            </label>

            <select
              className="input"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                Todos
              </option>

              <option value="UNANALYZED">
                Sin analizar
              </option>

              <option value="PENDING">
                Pendiente
              </option>

              <option value="PROCESSING">
                Procesando
              </option>

              <option value="REVIEW">
                En revisión
              </option>

              <option value="COMPLETED">
                Completado
              </option>

              <option value="FAILED">
                Error
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* =====================================================
          ESTADÍSTICAS
      ====================================================== */}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Videos"
          value={videos.length}
        />

        <StatCard
          label="Sin analizar"
          value={
            videos.filter(
              (video) =>
                video.analysis_status ===
                "UNANALYZED"
            ).length
          }
        />

        <StatCard
          label="En proceso"
          value={
            videos.filter((video) =>
              [
                "PENDING",
                "PROCESSING",
                "REVIEW",
              ].includes(
                video.analysis_status ||
                  ""
              )
            ).length
          }
        />

        <StatCard
          label="Completados"
          value={
            videos.filter(
              (video) =>
                video.analysis_status ===
                "COMPLETED"
            ).length
          }
        />
      </section>

      {/* =====================================================
          CONTENIDO
      ====================================================== */}

      {loading ? (
        <div className="card">
          Cargando videos...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="card">
          <h2 className="text-xl font-black">
            No hay videos cargados
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {canCreateVideo
              ? "Registrá el primer video para comenzar el análisis audiovisual."
              : "Todavía no hay videos disponibles para consultar."}
          </p>

          {canCreateVideo && (
            <a
              href="/videos/new"
              className="btn mt-5"
            >
              + Nuevo video
            </a>
          )}
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredVideos.map(
            (video) => (
              <article
                key={video.id}
                className="card transition hover:border-slate-600 hover:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      {formatDate(
                        video.match_date
                      )}
                    </div>

                    <h2 className="mt-1 truncate text-xl font-black">
                      {video.title ||
                        video.players
                          ?.full_name ||
                        "Video sin título"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      {video.players
                        ?.full_name ||
                        "Jugador sin asociar"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">
                      Estado
                    </div>

                    <div className="mt-1 text-sm font-bold">
                      {statusLabel(
                        video.analysis_status
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <div className="text-sm font-bold">
                    {matchLabel(video)}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {video.competition_name ||
                      "Competencia sin registrar"}
                  </div>

                  {video.goalkeeper_team && (
                    <div className="mt-1 text-xs text-slate-500">
                      Equipo del arquero:{" "}
                      {
                        video.goalkeeper_team
                      }
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Fuente"
                    value={
                      video.provider ||
                      video.source ||
                      "Sin dato"
                    }
                  />

                  <MiniStat
                    label="Progreso"
                    value={`${
                      video.processing_progress ??
                      0
                    }%`}
                  />

                  <MiniStat
                    label="Validado"
                    value={
                      video.human_validated
                        ? "Sí"
                        : "No"
                    }
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <a
                    href={`/videos/${video.id}`}
                    className="btn"
                  >
                    Ver análisis
                  </a>

                  {canDeleteVideo && (
                    <button
                      type="button"
                      disabled={
                        deletingId ===
                        video.id
                      }
                      onClick={() =>
                        deleteVideo(video)
                      }
                      className="rounded-lg border border-red-900/70 px-4 py-2 text-sm font-bold text-red-300 transition hover:border-red-700 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId ===
                      video.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  )}
                </div>
              </article>
            )
          )}
        </section>
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

      <div className="mt-1 truncate text-sm font-bold">
        {value}
      </div>
    </div>
  );
}
