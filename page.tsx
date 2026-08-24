const stats = [
  ["Jugadores", "0"],
  ["Arqueros", "0"],
  ["Jóvenes promesas", "0"],
  ["Seguimiento prioritario", "0"],
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Base de scouting y valoración longitudinal de jugadores.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="card" key={label}>
            <div className="text-sm text-slate-400">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Prioridad de observación</h2>
          <p className="mt-3 text-sm text-slate-400">
            Todavía no hay jugadores priorizados. Al cargar informes, este panel se actualizará.
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold">Últimas evaluaciones</h2>
          <p className="mt-3 text-sm text-slate-400">
            Los informes guardados aparecerán aquí.
          </p>
        </div>
      </section>
    </div>
  );
}
