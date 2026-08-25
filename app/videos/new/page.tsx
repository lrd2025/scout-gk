"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Player = {
  id: string;
  full_name: string;
  position: string;
  height_cm: number | null;
};

function detectProvider(url: string) {
  const value = url.toLowerCase();

  if (value.includes("youtube.com") || value.includes("youtu.be")) {
    return "YouTube";
  }

  if (value.includes("vimeo.com")) {
    return "Vimeo";
  }

  if (value.includes("drive.google.com")) {
    return "Google Drive";
  }

  return "External";
}

function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

export default function NewVideoPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getSession();

    if (!authData.session) {
      setMessage("Necesitás iniciar sesión.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("players")
      .select(`
        id,
        full_name,
        position,
        height_cm
      `)
      .eq("active", true)
      .eq("position", "GK")
      .order("last_name", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setPlayers((data || []) as Player[]);
    setLoading(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setSaving(true);
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getSession();

      if (!authData.session) {
        throw new Error("La sesión no está activa.");
      }

      const playerId = String(form.get("player_id") || "").trim();
      const videoUrl = String(form.get("url") || "").trim();

      if (!playerId) {
        throw new Error("Seleccioná un arquero.");
      }

      if (!videoUrl) {
        throw new Error("Ingresá la URL del video.");
      }

      const provider = detectProvider(videoUrl);
      const youtubeId =
        provider === "YouTube"
          ? extractYouTubeId(videoUrl)
          : null;

      const homeScoreValue = String(
        form.get("home_score") || ""
      ).trim();

      const awayScoreValue = String(
        form.get("away_score") || ""
      ).trim();

      const payload = {
        player_id: playerId,

        title:
          String(form.get("title") || "").trim() ||
          "Video de scouting",

        description:
          String(form.get("description") || "").trim() ||
          null,

        url: videoUrl,

        video_type: "MATCH",

        source: provider,

        provider,

        external_video_id: youtubeId,

        match_date:
          String(form.get("match_date") || "") ||
          null,

        competition_name:
          String(form.get("competition_name") || "").trim() ||
          null,

        home_team:
          String(form.get("home_team") || "").trim() ||
          null,

        away_team:
          String(form.get("away_team") || "").trim() ||
          null,

        home_score:
          homeScoreValue !== ""
            ? Number(homeScoreValue)
            : null,

        away_score:
          awayScoreValue !== ""
            ? Number(awayScoreValue)
            : null,

        goalkeeper_team:
          String(form.get("goalkeeper_team") || "").trim() ||
          null,

        analysis_status: "UNANALYZED",

        processing_progress: 0,

        human_validated: false,

        updated_at: new Date().toISOString(),
      };

      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .insert(payload)
        .select("id")
        .single();

      if (videoError) {
        throw videoError;
      }

      const { error: jobError } = await supabase
        .from("video_analysis_jobs")
        .insert({
          video_id: videoData.id,
          player_id: playerId,
          status: "PENDING",
          analysis_type: "GK_FULL",
          source_type: "MANUAL",
          progress: 0,
          events_detected: 0,
        });

      if (jobError) {
        console.error(jobError);
      }

      window.location.href = `/videos/${videoData.id}`;
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message ||
          "No se pudo registrar el video."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        Cargando formulario...
      </div>
    );
  }

  if (message && players.length === 0) {
    return (
      <div className="card">
        <h1 className="text-2xl font-black">
          Nuevo video
        </h1>

        <p className="mt-3 text-slate-400">
          {message}
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <div className="text-sm text-slate-400">
          Módulo audiovisual
        </div>

        <h1 className="mt-1 text-3xl font-black">
          Nuevo video
        </h1>

        <p className="mt-2 text-slate-400">
          Asociá un video de partido a un arquero para comenzar
          el análisis por eventos.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="card">
          <h2 className="text-xl font-black">
            Arquero y fuente
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">
                Arquero
              </label>

              <select
                className="input"
                name="player_id"
                required
                defaultValue=""
              >
                <option value="">
                  Seleccionar arquero...
                </option>

                {players.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {player.full_name}
                    {player.height_cm
                      ? ` · ${player.height_cm} cm`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Título"
              name="title"
              placeholder="Ej. Martín Alzuri vs Equipo B"
            />

            <div className="md:col-span-2">
              <label className="label">
                URL del video
              </label>

              <input
                className="input"
                name="url"
                type="url"
                required
                value={url}
                onChange={(event) =>
                  setUrl(event.target.value)
                }
                placeholder="https://www.youtube.com/watch?v=..."
              />

              <p className="mt-2 text-xs text-slate-500">
                En esta etapa usamos enlaces externos para evitar costos
                de almacenamiento.
              </p>
            </div>

            {url && (
              <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-xs text-slate-500">
                  Fuente detectada
                </div>

                <div className="mt-1 font-bold">
                  {detectProvider(url)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">
            Datos del partido
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field
              label="Fecha del partido"
              name="match_date"
              type="date"
            />

            <Field
              label="Competencia / torneo"
              name="competition_name"
              placeholder="Torneo Federal A"
            />

            <Field
              label="Equipo local"
              name="home_team"
              placeholder="Equipo A"
            />

            <Field
              label="Equipo visitante"
              name="away_team"
              placeholder="Equipo B"
            />

            <Field
              label="Goles local"
              name="home_score"
              type="number"
              min="0"
              max="30"
            />

            <Field
              label="Goles visitante"
              name="away_score"
              type="number"
              min="0"
              max="30"
            />

            <Field
              label="Equipo del arquero"
              name="goalkeeper_team"
              placeholder="Equipo A"
            />
          </div>
        </section>

        <section className="card">
          <label className="label">
            Observaciones iniciales
          </label>

          <textarea
            className="input min-h-36"
            name="description"
            placeholder="Origen del video, contexto del partido, minutos relevantes u otra información útil..."
          />
        </section>

        {message && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3 pb-10">
          <a
            href="/videos"
            className="rounded-lg border border-slate-600 px-5 py-3"
          >
            Cancelar
          </a>

          <button
            type="submit"
            className="btn px-6 py-3"
            disabled={saving}
          >
            {saving
              ? "Registrando video..."
              : "Registrar video"}
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
