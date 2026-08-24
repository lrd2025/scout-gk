export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Jugadores</h1>
          <p className="mt-2 text-slate-400">Buscador y base maestra.</p>
        </div>
        <button className="btn">+ Nuevo jugador</button>
      </div>

      <div className="card">
        <input className="input" placeholder="Buscar por nombre, club o posición..." />
      </div>

      <div className="card">
        <p className="text-sm text-slate-400">
          La tabla se conectará a Supabase en el siguiente paso.
        </p>
      </div>
    </div>
  );
}
