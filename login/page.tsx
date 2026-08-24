"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMessage(error.message);
      window.location.href = "/players";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || email.split("@")[0] } }
    });

    setLoading(false);
    if (error) return setMessage(error.message);

    if (data.session) {
      window.location.href = "/players";
    } else {
      setMessage("Cuenta creada. Revisá tu correo para confirmar el acceso.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setMessage("Sesión cerrada.");
  }

  if (sessionEmail) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card">
          <h1 className="text-2xl font-black">Sesión activa</h1>
          <p className="mt-3 text-slate-300">{sessionEmail}</p>
          <div className="mt-6 flex gap-3">
            <a href="/players" className="btn">Ir a jugadores</a>
            <button onClick={logout} className="rounded-lg border border-slate-600 px-4 py-2">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card">
        <div className="text-sm text-slate-400">Scout GK</div>
        <h1 className="mt-1 text-3xl font-black">
          {mode === "login" ? "Ingresar" : "Crear cuenta"}
        </h1>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Correo electrónico</label>
            <input className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input" type="password" minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {message && <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">{message}</div>}
          <button disabled={loading} className="btn w-full">
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <button className="mt-4 text-sm text-slate-300 underline"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "¿Primera vez? Crear una cuenta" : "Ya tengo una cuenta"}
        </button>
      </div>
    </div>
  );
}
