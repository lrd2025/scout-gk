"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Club = { id: string; name: string };

export default function NewPlayerPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getSession();
      setAuthenticated(Boolean(auth.session));
      if (!auth.session) return;
      const { data } = await supabase.from("clubs").select("id,name").order("name");
      setClubs((data as Club[]) ?? []);
    }
    load();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      internal_code: String(fd.get("internal_code") || "").trim() || null,
      first_name: String(fd.get("first_name") || "").trim(),
      last_name: String(fd.get("last_name") || "").trim(),
      birth_date: String(fd.get("birth_date") || "") || null,
      nationality: String(fd.get("nationality") || "").trim() || null,
      position: String(fd.get("position") || "GK"),
      specific_position: String(fd.get("specific_position") || "").trim() || null,
      preferred_foot: String(fd.get("preferred_foot") || "") || null,
      height_cm: fd.get("height_cm") ? Number(fd.get("height_cm")) : null,
      weight_kg: fd.get("weight_kg") ? Number(fd.get("weight_kg")) : null,
      current_club_id: String(fd.get("current_club_id") || "") || null,
      active: true
    };

    const { data, error } = await supabase.from("players").insert(payload).select("id").single();
    setSaving(false);

    if (error) return setMessage(error.message);
    window.location.href = `/players/${data.id}`;
  }

  if (authenticated === false) {
    return (
      <div className="card mx-auto max-w-xl">
        <h1 className="text-2xl font-black">Acceso requerido</h1>
        <p className="mt-3 text-slate-400">Para cargar jugadores necesitás iniciar sesión.</p>
        <a href="/login" className="btn mt-5">Ingresar</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">Base maestra</div>
        <h1 className="text-3xl font-black">Nuevo jugador</h1>
      </div>

      <form onSubmit={submit} className="card grid gap-4 md:grid-cols-2">
        <Field label="Nombre" name="first_name" required />
        <Field label="Apellido" name="last_name" required />
        <Field label="Código interno" name="internal_code" placeholder="ARG-GK-000001" />
        <Field label="Fecha de nacimiento" name="birth_date" type="date" />
        <Field label="Nacionalidad" name="nationality" placeholder="Argentina" />

        <div>
          <label className="label">Posición</label>
          <select className="input" name="position" defaultValue="GK">
            <option value="GK">Arquero (GK)</option>
            <option value="DF">Defensor</option>
            <option value="MF">Mediocampista</option>
            <option value="FW">Delantero</option>
          </select>
        </div>

        <Field label="Posición específica" name="specific_position" placeholder="Arquero" />

        <div>
          <label className="label">Pie hábil</label>
          <select className="input" name="preferred_foot" defaultValue="">
            <option value="">Sin dato</option>
            <option value="DERECHO">Derecho</option>
            <option value="IZQUIERDO">Izquierdo</option>
            <option value="AMBOS">Ambos</option>
          </select>
        </div>

        <Field label="Altura (cm)" name="height_cm" type="number" min="120" max="230" step="0.1" />
        <Field label="Peso (kg)" name="weight_kg" type="number" min="30" max="180" step="0.1" />

        <div className="md:col-span-2">
          <label className="label">Club actual</label>
          <select className="input" name="current_club_id" defaultValue="">
            <option value="">Sin club cargado</option>
            {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
        </div>

        {message && <div className="md:col-span-2 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm">{message}</div>}

        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <a href="/players" className="rounded-lg border border-slate-600 px-4 py-2">Cancelar</a>
          <button disabled={saving} className="btn">{saving ? "Guardando..." : "Guardar jugador"}</button>
        </div>
      </form>
    </div>
  );
}

function Field(props: any) {
  const { label, ...inputProps } = props;
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...inputProps} />
    </div>
  );
}
