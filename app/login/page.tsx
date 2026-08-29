"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../../lib/supabase";

/* =========================================================
   SCOUT GK
   ACCESO + REGISTRO INSTITUCIONAL
========================================================= */

type Mode =
  | "login"
  | "signup";

type MessageType =
  | "success"
  | "error"
  | "";

/* =========================================================
   COMPONENTE
========================================================= */

export default function LoginPage() {
  const [mode, setMode] =
    useState<Mode>("login");

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    institutionalKey,
    setInstitutionalKey,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<MessageType>("");

  const [
    sessionEmail,
    setSessionEmail,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
     SESIÓN ACTUAL
  ======================================================= */

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSessionEmail(
          data.session
            ?.user.email ??
            null
        );
      });

    const {
      data: authListener,
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            session
          ) => {
            setSessionEmail(
              session
                ?.user.email ??
                null
            );
          }
        );

    return () => {
      authListener
        .subscription
        .unsubscribe();
    };
  }, []);

  /* =======================================================
     CAMBIAR LOGIN / REGISTRO
  ======================================================= */

  function changeMode(
    nextMode: Mode
  ) {
    setMode(nextMode);

    setMessage("");
    setMessageType("");

    setPassword("");
    setConfirmPassword("");
    setInstitutionalKey("");
  }

  /* =======================================================
     LOGIN
  ======================================================= */

  async function login() {
    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        "Ingresá tu correo electrónico."
      );
    }

    if (!password) {
      throw new Error(
        "Ingresá tu contraseña."
      );
    }

    const {
      data: loginData,
      error: loginError,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            normalizedEmail,

          password,
        });

    if (loginError) {
      throw new Error(
        "Correo electrónico o contraseña incorrectos."
      );
    }

    const user =
      loginData.user;

    if (!user) {
      throw new Error(
        "No fue posible iniciar sesión."
      );
    }

    /* =====================================================
       VERIFICAR PERFIL ACTIVO
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          active
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    /*
     * Permitimos temporalmente cuentas antiguas
     * que todavía no tengan profiles.
     */

    if (
      !profileError &&
      profile &&
      profile.active ===
        false
    ) {
      await supabase.auth
        .signOut();

      throw new Error(
        "Esta cuenta se encuentra deshabilitada."
      );
    }

    /* =====================================================
       ACTUALIZAR ÚLTIMO INGRESO
    ===================================================== */

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          last_login_at:
            new Date()
              .toISOString(),

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          user.id
        );
    }

    window.location.href =
      "/";
  }

  /* =======================================================
     REGISTRO
  ======================================================= */

  async function register() {
    if (
      fullName
        .trim()
        .length < 3
    ) {
      throw new Error(
        "Ingresá nombre y apellido."
      );
    }

    if (!email.trim()) {
      throw new Error(
        "Ingresá un correo electrónico."
      );
    }

    if (
      password !==
      confirmPassword
    ) {
      throw new Error(
        "Las contraseñas no coinciden."
      );
    }

    if (
      password.length < 8
    ) {
      throw new Error(
        "La contraseña debe contener al menos 8 caracteres."
      );
    }

    if (
      !/[A-Z]/.test(
        password
      )
    ) {
      throw new Error(
        "La contraseña debe contener una letra mayúscula."
      );
    }

    if (
      !/[a-z]/.test(
        password
      )
    ) {
      throw new Error(
        "La contraseña debe contener una letra minúscula."
      );
    }

    if (
      !/[0-9]/.test(
        password
      )
    ) {
      throw new Error(
        "La contraseña debe contener un número."
      );
    }

    if (
      !institutionalKey
        .trim()
    ) {
      throw new Error(
        "Ingresá la clave institucional."
      );
    }

    const response =
      await fetch(
        "/api/auth/register",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              fullName:
                fullName
                  .trim(),

              email:
                email
                  .trim()
                  .toLowerCase(),

              password,

              confirmPassword,

              institutionalKey:
                institutionalKey
                  .trim(),
            }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "No fue posible crear la cuenta."
      );
    }

    setMessageType(
      "success"
    );

    setMessage(
      "Cuenta creada correctamente. Ya podés iniciar sesión."
    );

    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setInstitutionalKey("");

    window.setTimeout(
      () => {
        setMode(
          "login"
        );

        setMessage(
          "Cuenta creada correctamente. Ingresá con tu correo y contraseña."
        );

        setMessageType(
          "success"
        );
      },
      1000
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      if (
        mode ===
        "login"
      ) {
        await login();
      } else {
        await register();
      }
    } catch (error) {
      console.error(
        error
      );

      setMessageType(
        "error"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Se produjo un error."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    await supabase.auth
      .signOut();

    setSessionEmail(
      null
    );

    setMessageType(
      "success"
    );

    setMessage(
      "Sesión cerrada correctamente."
    );
  }

  /* =======================================================
     SESIÓN ACTIVA
  ======================================================= */

  if (sessionEmail) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Scout GK
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Sesión activa
          </h1>

          <p className="mt-3 text-slate-400">
            Actualmente ingresaste como:
          </p>

          <div className="mt-2 font-bold">
            {sessionEmail}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">

            <a
              href="/"
              className="btn"
            >
              Dashboard
            </a>

            <a
              href="/players"
              className="rounded-lg border border-slate-700 px-4 py-2 font-bold transition hover:border-slate-500"
            >
              Jugadores
            </a>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-red-900/70 px-4 py-2 font-bold text-red-300 transition hover:border-red-700 hover:bg-red-950/30"
            >
              Cerrar sesión
            </button>

          </div>

        </div>

      </div>
    );
  }

  /* =======================================================
     FORMULARIO
  ======================================================= */

  return (
    <div className="mx-auto max-w-xl">

      <div className="card">

        {/* MARCA */}

        <div className="text-center">

          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Athlon Base Scouting
          </div>

          <h1 className="mt-2 text-3xl font-black">
            SCOUT GK
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Inteligencia y valoración de arqueros
          </p>

        </div>

        {/* SELECTOR */}

        <div className="mt-8 grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/40 p-1">

          <button
            type="button"
            onClick={() =>
              changeMode(
                "login"
              )
            }
            className={
              mode === "login"
                ? "rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950"
                : "rounded-lg px-4 py-3 text-sm font-bold text-slate-400 hover:text-white"
            }
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={() =>
              changeMode(
                "signup"
              )
            }
            className={
              mode === "signup"
                ? "rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950"
                : "rounded-lg px-4 py-3 text-sm font-bold text-slate-400 hover:text-white"
            }
          >
            Crear cuenta
          </button>

        </div>

        {/* DESCRIPCIÓN */}

        <div className="mt-7">

          <h2 className="text-2xl font-black">

            {mode ===
            "login"
              ? "Bienvenido"
              : "Registro de usuario"}

          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">

            {mode ===
            "login"
              ? "Ingresá con tu correo electrónico y contraseña personal."
              : "Creá tu cuenta personal para acceder a Scout GK. El alta requiere autorización institucional."}

          </p>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >

          {/* NOMBRE */}

          {mode ===
            "signup" && (

            <div>

              <label className="label">
                Nombre y apellido
              </label>

              <input
                className="input"
                type="text"
                autoComplete="name"
                placeholder="Ej. Juan Pérez"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                required
              />

            </div>

          )}

          {/* EMAIL */}

          <div>

            <label className="label">
              Correo electrónico
            </label>

            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />

          </div>

          {/* PASSWORD */}

          <div>

            <label className="label">
              Contraseña personal
            </label>

            <div className="relative">

              <input
                className="input pr-24"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                placeholder="••••••••"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-white"
              >

                {showPassword
                  ? "Ocultar"
                  : "Mostrar"}

              </button>

            </div>

            {/* =============================================
                RECUPERAR CONTRASEÑA
                SOLO EN MODO LOGIN
            ============================================= */}

            {mode ===
              "login" && (

              <div className="mt-3 text-right">

                <a
                  href="/forgot-password"
                  className="text-sm font-bold text-slate-400 transition hover:text-white"
                >
                  ¿Olvidaste tu contraseña?
                </a>

              </div>

            )}

            {mode ===
              "signup" && (

              <p className="mt-2 text-xs text-slate-500">
                Mínimo 8 caracteres, una mayúscula,
                una minúscula y un número.
              </p>

            )}

          </div>

          {/* CONFIRMACIÓN */}

          {mode ===
            "signup" && (

            <div>

              <label className="label">
                Confirmar contraseña
              </label>

              <input
                className="input"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
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

          )}

          {/* CLAVE INSTITUCIONAL */}

          {mode ===
            "signup" && (

            <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">

              <div className="font-black">
                Clave institucional
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Esta clave se solicita exclusivamente
                para autorizar la creación de una nueva cuenta.
                No será necesaria para futuros ingresos.
              </p>

              <div className="mt-4">

                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder="Clave institucional"
                  value={
                    institutionalKey
                  }
                  onChange={(event) =>
                    setInstitutionalKey(
                      event.target.value
                    )
                  }
                  required
                />

              </div>

            </div>

          )}

          {/* MENSAJES */}

          {message && (

            <div
              className={
                messageType ===
                  "success"
                  ? "rounded-lg border border-emerald-800/70 bg-emerald-950/20 p-4 text-sm text-emerald-300"
                  : "rounded-lg border border-red-900/70 bg-red-950/20 p-4 text-sm text-red-300"
              }
            >
              {message}
            </div>

          )}

          {/* BOTÓN */}

          <button
            type="submit"
            className="btn w-full"
            disabled={loading}
          >

            {loading
              ? "Procesando..."
              : mode ===
                  "login"
                ? "Ingresar"
                : "Crear cuenta"}

          </button>

        </form>

        {/* AVISO */}

        {mode ===
          "signup" && (

          <div className="mt-6 border-t border-slate-800 pt-5">

            <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              Registro restringido
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              La creación de usuarios está habilitada
              exclusivamente para integrantes autorizados
              de Athlon Base Scouting.
            </p>

          </div>

        )}

      </div>

    </div>
  );
}
