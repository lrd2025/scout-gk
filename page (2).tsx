"use client";

import { useMemo, useState } from "react";

const metrics = [
  ["Arquero", ["Atajadas", "Reflejos", "Mano a mano", "Juego aéreo", "Salidas", "Ubicación"]],
  ["Distribución", ["Juego con pies", "Saque largo", "Comunicación"]],
  ["Técnica específica", ["Posición corporal", "Traslado", "Pegada arriba", "Pegada abajo"]],
] as const;

export default function NewReportPage() {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(metrics.flatMap(([, items]) => items.map((m) => [m, 5])))
  );

  const global = useMemo(() => {
    const values = Object.values(scores);
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : "0.00";
  }, [scores]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-400">Nuevo informe</div>
        <h1 className="text-3xl font-black">Informe de scouting</h1>
        <div className="mt-2 text-2xl font-black">Score global: {global}</div>
      </div>

      <section className="card grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Jugador</label>
          <input className="input" placeholder="Marcos Cordero" />
        </div>
        <div>
          <label className="label">Posición</label>
          <select className="input"><option>Arquero</option></select>
        </div>
        <div>
          <label className="label">Fecha del partido</label>
          <input className="input" type="date" />
        </div>
        <div>
          <label className="label">Competencia / torneo</label>
          <input className="input" />
        </div>
        <div>
          <label className="label">Equipos y resultado</label>
          <input className="input" placeholder="Equipo A 1 - 0 Equipo B" />
        </div>
        <div>
          <label className="label">Formación</label>
          <select className="input">
            {["4-2-3-1","4-3-1-2","4-1-3-2","4-4-2","4-1-4-1","4-3-3","3-5-2","3-4-3","5-3-2"].map(x => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Línea</label>
          <select className="input">
            <option>1ra (Fichar)</option>
            <option>2da (Seguir)</option>
            <option>3ra (Ver más adelante)</option>
            <option>4ta (Descartar)</option>
            <option>Joven Promesa</option>
          </select>
        </div>
        <div>
          <label className="label">Minutos observados</label>
          <input className="input" type="number" min="1" max="130" defaultValue="90" />
        </div>
      </section>

      <section className="card">
        <label className="label">Observaciones generales</label>
        <textarea className="input min-h-36" placeholder="Síntesis profesional del jugador..." />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-bold">Historial de lesiones</h2>
          <div className="mt-3 space-y-2 text-sm">
            <label className="block"><input type="radio" name="injury" defaultChecked /> Sin lesiones registradas</label>
            <label className="block"><input type="radio" name="injury" /> Registra lesiones</label>
          </div>
        </div>
        <div className="card">
          <h2 className="font-bold">Pasado en selecciones</h2>
          <div className="mt-3 space-y-2 text-sm">
            <label className="block"><input type="radio" name="national" defaultChecked /> No registra selección</label>
            <label className="block"><input type="radio" name="national" /> Registra selección</label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {metrics.map(([group, items]) => (
          <div className="card" key={group}>
            <h2 className="text-xl font-black">{group}</h2>
            <div className="mt-5 space-y-5">
              {items.map((metric) => (
                <div key={metric} className="grid gap-3 md:grid-cols-[220px_1fr_50px] md:items-center">
                  <div className="font-semibold">{metric}</div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores[metric]}
                    onChange={(e) => setScores({ ...scores, [metric]: Number(e.target.value) })}
                  />
                  <div className="rounded-lg bg-slate-800 px-3 py-2 text-center font-black">
                    {scores[metric]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-3">
        <button className="rounded-lg border border-slate-600 px-4 py-2">Cancelar</button>
        <button className="btn">Guardar informe</button>
      </div>
    </div>
  );
}
