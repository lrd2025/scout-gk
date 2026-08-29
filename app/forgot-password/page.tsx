"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  supabase,
} from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Ingresá tu correo electrónico."
      );

      setLoading(false);
      return;
    }

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const {
        error:
          resetError,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            normalizedEmail,
            {
              redirectTo,
            }
          );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña."
      );

      setEmail("");
    } catch (err) {
      console.error(
        "Error recuperando contraseña:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la recuperación de contraseña."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">

      <div className="card">

        <div className="text-center">

          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Athlon Base Scouting
          </div>

          <h1 className="mt-3 text-3xl font-black">
            Recuperar contraseña
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Ingresá el correo asociado a tu cuenta.
            Te enviaremos un enlace seguro para crear
            una nueva contraseña.
          </p>

        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-7 space-y-5"
        >

          <div>

            <label className="label">
              Correo electrónico
            </label>

            <input
              type="email"
              className="input"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />

          </div>

          <button
            type="submit"
            className="btn w-full"
            disabled={loading}
          >
            {loading
              ? "Enviando..."
              : "Enviar enlace de recuperación"}
          </button>

        </form>

        <div className="mt-6 border-t border-slate-800 pt-5 text-center">

          <a
            href="/login"
            className="text-sm font-bold text-slate-300 hover:text-white"
          >
            Volver a iniciar sesión
          </a>

        </div>

      </div>

    </div>
  );
}
