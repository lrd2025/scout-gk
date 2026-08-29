"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

/* =========================================================
   SCOUT GK
   RESTABLECIMIENTO DE CONTRASEÑA
========================================================= */

export default function ResetPasswordPage() {
  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    validRecoverySession,
    setValidRecoverySession,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  /* =======================================================
     VERIFICAR SESIÓN DE RECUPERACIÓN
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          console.error(
            "Error verificando sesión:",
            sessionError
          );
        }

        if (data.session) {
          setValidRecoverySession(true);
        }
      } catch (err) {
        console.error(
          "Error verificando recuperación:",
          err
        );
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    /* =====================================================
       ESCUCHAR EVENTO DE RECUPERACIÓN DE SUPABASE
    ===================================================== */

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) {
            return;
          }

          if (
            event ===
              "PASSWORD_RECOVERY" ||
            (
              event ===
                "SIGNED_IN" &&
              session
            )
          ) {
            setValidRecoverySession(
              true
            );

            setCheckingSession(
              false
            );

            setError("");
          }
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     VALIDAR CONTRASEÑA
  ======================================================= */

  function validatePassword(
    value: string
  ) {
    if (value.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    if (!/[A-Z]/.test(value)) {
      return "La contraseña debe incluir al menos una letra mayúscula.";
    }

    if (!/[a-z]/.test(value)) {
      return "La contraseña debe incluir al menos una letra minúscula.";
    }

    if (!/[0-9]/.test(value)) {
      return "La contraseña debe incluir al menos un número.";
    }

    return null;
  }

  /* =======================================================
     GUARDAR NUEVA CONTRASEÑA
  ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    /* -----------------------------------------------------
       VALIDACIÓN
    ----------------------------------------------------- */

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    setLoading(true);

    try {
      /* ---------------------------------------------------
         CONFIRMAR QUE EXISTE SESIÓN
      --------------------------------------------------- */

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error(
          "El enlace de recuperación no es válido o ha vencido."
        );
      }

      /* ---------------------------------------------------
         ACTUALIZAR CONTRASEÑA
      --------------------------------------------------- */

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setPassword("");
      setConfirmPassword("");

      setMessage(
        "Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con la nueva contraseña."
      );

      /* ---------------------------------------------------
         CERRAR SESIÓN TEMPORAL DE RECUPERACIÓN
      --------------------------------------------------- */

      await supabase.auth.signOut();

      setValidRecoverySession(false);
    } catch (err) {
      console.error(
        "Error actualizando contraseña:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     VERIFICANDO ENLACE
  ======================================================= */

  if (checkingSession) {
    return (
      <div className="mx-auto max-w-lg">

        <div className="card text-center">

          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Athlon Base Scouting
          </div>

          <h1 className="mt-3 text-2xl font-black">
            Verificando enlace
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Estamos validando tu solicitud de recuperación.
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     INTERFAZ
  ======================================================= */

  return (
    <div className="mx-auto max-w-lg">

      <div className="card">

        {/* CABECERA */}

        <div className="text-center">

          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Athlon Base Scouting
          </div>

          <h1 className="mt-3 text-3xl font-black">
            Nueva contraseña
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Definí una nueva contraseña para acceder a Scout GK.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ÉXITO */}

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/20 p-5">

            <div className="font-bold text-emerald-300">
              Contraseña actualizada
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {message}
            </p>

            <a
              href="/login"
              className="btn mt-5 inline-block"
            >
              Iniciar sesión
            </a>

          </div>
        )}

        {/* FORMULARIO */}

        {!message &&
          validRecoverySession && (

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >

              {/* NUEVA CONTRASEÑA */}

              <div>

                <label className="label">
                  Nueva contraseña
                </label>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className="input"
                  autoComplete="new-password"
                  placeholder="Ingresá la nueva contraseña"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  required
                />

              </div>

              {/* CONFIRMAR */}

              <div>

                <label className="label">
                  Confirmar contraseña
                </label>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className="input"
                  autoComplete="new-password"
                  placeholder="Repetí la nueva contraseña"
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  required
                />

              </div>

              {/* MOSTRAR CONTRASEÑA */}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">

                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) =>
                    setShowPassword(
                      event.target.checked
                    )
                  }
                />

                Mostrar contraseña

              </label>

              {/* REQUISITOS */}

              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">

                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Requisitos de seguridad
                </div>

                <ul className="mt-3 space-y-2 text-sm text-slate-400">

                  <li>
                    • Mínimo 8 caracteres
                  </li>

                  <li>
                    • Al menos una letra mayúscula
                  </li>

                  <li>
                    • Al menos una letra minúscula
                  </li>

                  <li>
                    • Al menos un número
                  </li>

                </ul>

              </div>

              {/* BOTÓN */}

              <button
                type="submit"
                className="btn w-full"
                disabled={loading}
              >
                {loading
                  ? "Actualizando..."
                  : "Guardar nueva contraseña"}
              </button>

            </form>

          )}

        {/* ENLACE VENCIDO */}

        {!message &&
          !validRecoverySession && (

            <div className="mt-7 rounded-xl border border-amber-800 bg-amber-950/20 p-5">

              <div className="font-bold text-amber-300">
                Enlace no válido o vencido
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                El enlace de recuperación ya no es válido.
                Solicitá un nuevo enlace para continuar.
              </p>

              <a
                href="/forgot-password"
                className="btn mt-5 inline-block"
              >
                Solicitar nuevo enlace
              </a>

            </div>

          )}

        {/* VOLVER */}

        <div className="mt-7 border-t border-slate-800 pt-5 text-center">

          <a
            href="/login"
            className="text-sm font-bold text-slate-300 hover:text-white"
          >
            Volver a Acceso
          </a>

        </div>

      </div>

    </div>
  );
}
