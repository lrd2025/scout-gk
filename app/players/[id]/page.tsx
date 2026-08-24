"use client";

import { useEffect, useState } from "react";
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
  clubs: { name: string } | null;
};

type Tracking = {
  reports_count: number;
  matches_observed: number;
  minutes_observed: number;
  current_level_score: number | null;
  potential_score: number | null;
  consistency_score: number | null;
  recruitment_priority: number | null;
  observation_priority: number | null;
  evidence_level: string | null;
};

function age(value: string | null) {
  if (!value) return "—";
  const birth = new Date(value);
  const now = new Date();
  let result = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) result--;
  return result;
}

function metric(value: number | null | undefined) {
  return value == null ? "—" : Number(value).toFixed(2);
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return setLoading(false);

      const { data: p } = await supabase
        .from("players")
        .select(`
          id, internal_code, full_name, birth_date, nationality, position,
          specific_position, preferred_foot, height_cm, weight_kg,
          clubs:current_club_id ( name )
        `)
        .eq("id", params.id)
        .single();

      const { data: t } = await supabase
        .from("player_tracking_metadata")
        .select("*")
        .eq("player_id", params.id)
        .maybeSingle();

      setPlayer(p as unknown as Player);
      setTracking(t as Tracking | null);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <div className="card">Cargando ficha...</div>;

  if (!player) {
    return (
      <div className="card">
        <h1 className="text-2xl font-black">Jugador no disponible</h1>
        <p className="mt-2 text-slate-400">Iniciá sesión o verificá que el jugador exista.</p>
        <a href="/login" className="btn mt-5">Ingresar</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-sm text-slate-400">{player.internal_code ?? "Sin código interno"}</div>
            <h1 className="mt-1 text-4xl font-black">{player.full_name}</h1>
            <p className="mt-2 text-slate-300">
              {player.specific_position ?? player.position} · {age(player.birth_date)} años
              {player.height_cm ? ` · ${player.height_cm} cm` : ""}
              {player.preferred_foot ? ` · ${player.preferred_foot}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {player.nationality ?? "Nacionalidad sin registrar"} · {player.clubs?.name ?? "Club sin registrar"}
            </p>
          </div>
          <a href={`/reports/new?player=${player.id}`} className="btn">+ Nuevo informe</a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Score label="Current Level" value={metric(tracking?.current_level_score)} />
        <Score label="Potential" value={metric(tracking?.potential_score)} />
        <Score label="Consistency" value={metric(tracking?.consistency_score)} />
        <Score label="Recruitment" value={metric(tracking?.recruitment_priority)} />
        <Score label="Observation" value={metric(tracking?.observation_priority)} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card"><div className="text-sm text-slate-400">Partidos observados</div><div className="mt-2 text-3xl font-black">{tracking?.matches_observed ?? 0}</div></div>
        <div className="card"><div className="text-sm text-slate-400">Minutos observados</div><div className="mt-2 text-3xl font-black">{tracking?.minutes_observed ?? 0}</div></div>
        <div className="card"><div className="text-sm text-slate-400">Evidencia</div><div className="mt-2 text-2xl font-black">{tracking?.evidence_level ?? "VERY_LOW"}</div></div>
      </section>

      <section className="card">
        <h2 className="text-xl font-black">Historial de scouting</h2>
        <p className="mt-3 text-sm text-slate-400">
          En la siguiente etapa conectaremos aquí los informes por partido, curvas de evolución,
          fortalezas recurrentes y evidencias de video.
        </p>
      </section>
    </div>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return <div className="card"><div className="text-xs text-slate-400">{label}</div><div className="mt-2 text-2xl font-black">{value}</div><div className="text-xs text-slate-500">/10</div></div>;
}
