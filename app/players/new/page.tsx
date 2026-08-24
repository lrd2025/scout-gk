"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Club = {
  id: string;
  name: string;
};

export default function NewPlayerPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [authenticated, setAuthenticated] =
    useState<boolean | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const { data: authData } =
      await supabase.auth.getSession();

    if (!authData.session) {
      setAuthenticated(false);
      return;
    }

    setAuthenticated(true);

    const { data } = await supabase
      .from("clubs")
      .select("id,name")
      .order("name");

    setClubs((data || []) as Club[]);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    const payload = {
      internal_code:
        String(form.get("internal_code") || "").trim() || null,

      first_name:
        String(form.get("first_name") || "").trim(),

      last_name:
        String(form.get("last_name") || "").trim(),

      birth_date:
        String(form.get("birth_date") || "") || null,

      nationality:
        String(form.get("nationality") || "").trim() || null,

      position:
        String(form.get("position") || "GK"),

      specific_position:
        String(form.get("specific_position") || "").trim() || null,

      preferred_foot:
        String(form.get("preferred_foot") || "") || null,

      height_cm:
        form.get("height_cm")
          ? Number(form.get("height_cm"))
          : null,

      weight_kg:
        form.get("weight_kg")
          ? Number(form.get("weight_kg"))
          : null,

      current_club_id:
        String(form.get("current_club_id") || "") || null,

      active: true,
    };

    const { data, error } = await supabase
      .from("players")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = `/players/${data.id}`;
  }

  if (authenticated === false) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card">
          <h1 className="text-2xl font-black">
            Acceso requerido
          </h1>

          <p className="mt-3 text-slate-400">
            Para cargar jugadores necesitás iniciar sesión.
          </p>

          <a href="/login" className="btn mt-5">
            Ingresar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          Base maestra
        </div>

        <h1 className="text-3xl font-black">
          Nuevo jugador
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card grid gap-5 md:grid-cols-2"
      >
        <Field
          label="Nombre"
          name="first_name"
          required
        />

        <Field
          label="Apellido"
          name="last_name"
          required
        />

        <Field
          label="Código interno"
          name="internal_code"
          placeholder="ARG-GK-000001"
        />

        <Field
          label="Fecha de nacimiento"
          name="birth_date"
          type="date"
        />

        <Field
          label="Nacionalidad"
          name="nationality"
          placeholder="Argentina"
        />

        <div>
          <label className="label">
            Posición
          </label>

          <select
            className="input"
            name="position"
            defaultValue="GK"
          >
            <option value="GK">
              Arquero
            </option>

            <option value="DF">
              Defensor
            </option>

            <option value="MF">
              Mediocampista
            </option>

            <option value="FW">
              Delantero
            </option>
          </select>
        </div>

        <Field
          label="Posición específica"
          name="specific_position"
          placeholder="Arquero"
        />

        <div>
          <label className="label">
            Pie hábil
          </label>

          <select
            className="input"
            name="preferred_foot"
            defaultValue=""
          >
            <option value="">
              Sin dato
            </option>

            <option value="DERECHO">
              Derecho
            </option>

            <option value="IZQUIERDO">
              Izquierdo
            </option>

            <option value="AMBOS">
              Ambos
            </option>
          </select>
        </div>

        <Field
          label="Altura (cm)"
          name="height_cm"
          type="number"
          min="120"
          max="230"
          step="0.1"
        />

        <Field
          label="Peso (kg)"
          name="weight_kg"
          type="number"
          min="30"
          max="180"
          step="0.1"
        />

        <div className="md:col-span-2">
          <label className="label">
            Club actual
          </label>

          <select
            className="input"
            name="current_club_id"
            defaultValue=""
          >
            <option value="">
              Sin club cargado
            </option>

            {clubs.map((club) => (
              <option
                key={club.id}
                value={club.id}
              >
                {club.name}
              </option>
            ))}
          </select>

          {clubs.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Todavía no hay clubes cargados.
            </p>
          )}
        </div>

        {message && (
          <div className="md:col-span-2 rounded-xl border border-red-800 bg-red-950/30 p-4">
            {message}
          </div>
        )}

        <div className="md:col-span-2 flex justify-end gap-3 pt-3">
          <a
            href="/players"
            className="rounded-lg border border-slate-600 px-4 py-2"
          >
            Cancelar
          </a>

          <button
            className="btn"
            disabled={saving}
          >
            {saving
              ? "Guardando..."
              : "Guardar jugador"}
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
