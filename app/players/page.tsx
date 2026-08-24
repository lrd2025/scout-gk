"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Player = {
  id: string;
  internal_code: string | null;
  full_name: string;
  birth_date: string | null;
  nationality: string | null;
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
  avg_global_score: number | null;
  current_level_score: number | null;
  potential_score: number | null;
  recruitment_priority: number | null;
  observation_priority: number | null;
  trend: string | null;
  evidence_level: string | null;
};

type PlayerView = Player & {
  tracking?: Tracking | null;
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

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return Number(value).toFixed(2);
}

function trendLabel(value: string | null | undefined) {
  switch (value) {
    case "UP":
    case "ASCENDING":
      return "↑ Ascendente";

    case "DOWN":
    case "DESCENDING":
      return "↓ Descendente";

    case "STABLE":
      return "→ Estable";

    default:
      return "—";
  }
}

function priorityLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  if (value >= 9) return "Muy alta";
  if (value >= 8) return "Alta";
  if (value >= 7) return "Media";
  if (value >= 5) return "Seguimiento";

  return "Baja";
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);
    setErrorMessage("");

    const { data: authData } = await supabase.auth.getSession();

    if (!authData.session) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    setAuthenticated(true);

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(`
        id,
        internal_code,
        full_name,
        birth_date,
        nationality,
        position,
        preferred_foot,
        height_cm,
        clubs:current_club_id (
          name
        )
      `)
      .eq("active", true)
      .order("last_name", {
        ascending: true,
      });

    if (playerError) {
      setErrorMessage(playerError.message);
      setLoading(false);
      return;
    }

    const { data: trackingData, error: trackingError } = await supabase
      .from("player_tracking_metadata")
      .select(`
        player_id,
        reports_count,
        matches_observed,
        avg_global_score,
        current_level_score,
        potential_score,
        recruitment_priority,
        observation_priority,
        trend,
        evidence_level
      `);

    if (trackingError) {
      setErrorMessage(trackingError.message);
      setLoading(false);
      return;
    }

    const trackingMap = new Map<string, Tracking>();

    (trackingData || []).forEach((tracking) => {
      trackingMap.set(tracking.player_id, tracking);
    });

    const combined: PlayerView[] = (playerData || []).map((player: any) => ({
      ...player,
      tracking: trackingMap.get(player.id) || null,
    }));

    setPlayers(combined);
    setLoading(false);
  }

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const searchText = [
        player.full_name,
        player.internal_code,
        player.nationality,
        player.clubs?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesPosition =
        positionFilter === "ALL" || player.position === positionFilter;

      return matchesSearch && matchesPosition;
    });
  }, [players, search, positionFilter]);

  if (authenticated === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black">Jugadores</h1>
          <p className="mt-2 text-slate-400">
            Base maestra de jugadores y arqueros.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold">Acceso requerido</h2>

          <p className="mt-3 text-slate-400">
            Para consultar o cargar jugadores necesitás iniciar sesión.
          </p>

          <a href="/login" className="btn mt-5">
            Ingresar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Jugadores</h1>

          <p className="mt-2 text-slate-400">
            Base maestra y seguimiento longitudinal.
          </p>
        </div>

        <a href="/players/new" className="btn">
          + Nuevo jugador
        </a>
      </div>

      <section className="card">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label className="label">Buscar</label>

            <input
              className="input"
              placeholder="Nombre, club, nacionalidad o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Posición</label>

            <select
              className="input"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
            >
              <option value="ALL">Todas</option>
              <option value="GK">Arquero</option>
              <option value="DF">Defensor</option>
              <option value="MF">Mediocampista</option>
              <option value="FW">Delantero</option>
            </select>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
          {errorMessage}
        </div>
      )}

      <section className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-slate-400">
            Cargando jugadores...
          </p>
        ) : filteredPlayers.length === 0 ? (
          <div>
            <h2 className="text-lg font-bold">
              No hay jugadores cargados
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Creá el primer jugador para comenzar la base.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="py-3 pr-4">Jugador</th>
                <th className="py-3 pr-4">Pos.</th>
                <th className="py-3 pr-4">Edad</th>
                <th className="py-3 pr-4">Altura</th>
                <th className="py-3 pr-4">Club</th>
                <th className="py-3 pr-4">Informes</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Potential</th>
                <th className="py-3 pr-4">Tendencia</th>
                <th className="py-3">Prioridad</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlayers.map((player) => {
                const age = calculateAge(player.birth_date);

                return (
                  <tr
                    key={player.id}
                    className="border-b border-slate-800"
                  >
                    <td className="py-4 pr-4">
                      <a
                        href={`/players/${player.id}`}
                        className="font-bold hover:underline"
                      >
                        {player.full_name}
                      </a>

                      <div className="mt-1 text-xs text-slate-500">
                        {player.internal_code || "Sin código"}
                      </div>
                    </td>

                    <td className="py-4 pr-4">
                      {player.position}
                    </td>

                    <td className="py-4 pr-4">
                      {age ?? "—"}
                    </td>

                    <td className="py-4 pr-4">
                      {player.height_cm
                        ? `${player.height_cm} cm`
                        : "—"}
                    </td>

                    <td className="py-4 pr-4">
                      {player.clubs?.name || "—"}
                    </td>

                    <td className="py-4 pr-4">
                      {player.tracking?.reports_count ?? 0}
                    </td>

                    <td className="py-4 pr-4 font-bold">
                      {formatScore(
                        player.tracking?.current_level_score ??
                          player.tracking?.avg_global_score
                      )}
                    </td>

                    <td className="py-4 pr-4">
                      {formatScore(
                        player.tracking?.potential_score
                      )}
                    </td>

                    <td className="py-4 pr-4">
                      {trendLabel(
                        player.tracking?.trend
                      )}
                    </td>

                    <td className="py-4">
                      {priorityLabel(
                        player.tracking
                          ?.recruitment_priority
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
