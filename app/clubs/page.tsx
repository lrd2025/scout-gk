"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../../lib/supabase";

import {
  useCurrentUser,
} from "../../lib/useCurrentUser";

/* =========================================================
   TIPOS
========================================================= */

type Club = {
  id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ClubForm = {
  name: string;
  short_name: string;
  country: string;
  province: string;
  city: string;
};

const EMPTY_FORM: ClubForm = {
  name: "",
  short_name: "",
  country: "Argentina",
  province: "",
  city: "",
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function ClubsPage() {
  const {
    profile,
    loading: profileLoading,
  } =
    useCurrentUser();

  const [
    clubs,
    setClubs,
  ] =
    useState<Club[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    countryFilter,
    setCountryFilter,
  ] =
    useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("ACTIVE");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState<ClubForm>(
      EMPTY_FORM
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    showForm,
    setShowForm,
  ] =
    useState(false);

  /* =======================================================
     ROLES
  ======================================================= */

  const canManageClubs =
    profile?.role ===
      "ADMIN" ||
    profile?.role ===
      "SCOUT";

  const isAdmin =
    profile?.role ===
    "ADMIN";

  /* =======================================================
     CARGA
  ======================================================= */

  useEffect(() => {
    if (
      profileLoading
    ) {
      return;
    }

    if (
      !profile
    ) {
      setLoading(
        false
      );

      return;
    }

    loadClubs();
  }, [
    profileLoading,
    profile,
  ]);

  async function loadClubs() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "clubs"
          )
          .select(`
            id,
            name,
            short_name,
            country,
            province,
            city,
            active,
            created_at,
            updated_at
          `)
          .order(
            "name",
            {
              ascending:
                true,
            }
          );

      if (
        error
      ) {
        throw error;
      }

      setClubs(
        (
          data ||
          []
        ) as Club[]
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "Error cargando clubes:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los clubes."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     ACTUALIZAR FORMULARIO
  ======================================================= */

  function updateForm(
    field: keyof ClubForm,
    value: string
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  /* =======================================================
     NUEVO CLUB
  ======================================================= */

  function startNewClub() {
    setEditingId(
      null
    );

    setForm({
      ...EMPTY_FORM,
    });

    setMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    setShowForm(
      true
    );
  }

  /* =======================================================
     EDITAR CLUB
  ======================================================= */

  function startEditClub(
    club: Club
  ) {
    if (
      !canManageClubs
    ) {
      return;
    }

    setEditingId(
      club.id
    );

    setForm({
      name:
        club.name ||
        "",

      short_name:
        club.short_name ||
        "",

      country:
        club.country ||
        "Argentina",

      province:
        club.province ||
        "",

      city:
        club.city ||
        "",
    });

    setMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    setShowForm(
      true
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  /* =======================================================
     CANCELAR
  ======================================================= */

  function cancelForm() {
    setEditingId(
      null
    );

    setForm({
      ...EMPTY_FORM,
    });

    setShowForm(
      false
    );

    setMessage(
      ""
    );
  }

  /* =======================================================
     GUARDAR
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /* -----------------------------------------------------
       SEGUNDA BARRERA
    ----------------------------------------------------- */

    if (
      !canManageClubs
    ) {
      setMessage(
        "No tenés permisos para crear o modificar clubes."
      );

      return;
    }

    const cleanName =
      form.name
        .trim();

    const cleanShortName =
      form.short_name
        .trim();

    const cleanCountry =
      form.country
        .trim();

    const cleanProvince =
      form.province
        .trim();

    const cleanCity =
      form.city
        .trim();

    /* -----------------------------------------------------
       VALIDACIÓN
    ----------------------------------------------------- */

    if (
      cleanName.length <
      2
    ) {
      setMessage(
        "Ingresá el nombre del club."
      );

      return;
    }

    if (
      cleanShortName.length >
      20
    ) {
      setMessage(
        "La abreviatura no debe superar los 20 caracteres."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      /* ---------------------------------------------------
         EVITAR DUPLICADOS POR NOMBRE
      --------------------------------------------------- */

      const {
        data:
          duplicateData,
        error:
          duplicateError,
      } =
        await supabase
          .from(
            "clubs"
          )
          .select(
            "id,name"
          )
          .ilike(
            "name",
            cleanName
          );

      if (
        duplicateError
      ) {
        throw duplicateError;
      }

      const duplicate =
        (
          duplicateData ||
          []
        ).find(
          (
            club
          ) =>
            club.id !==
              editingId &&
            club.name
              .trim()
              .toLowerCase() ===
              cleanName
                .toLowerCase()
        );

      if (
        duplicate
      ) {
        throw new Error(
          "Ya existe un club con ese nombre."
        );
      }

      const payload = {
        name:
          cleanName,

        short_name:
          cleanShortName ||
          null,

        country:
          cleanCountry ||
          null,

        province:
          cleanProvince ||
          null,

        city:
          cleanCity ||
          null,

        updated_at:
          new Date()
            .toISOString(),
      };

      /* ---------------------------------------------------
         EDITAR
      --------------------------------------------------- */

      if (
        editingId
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "clubs"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingId
            );

        if (
          error
        ) {
          throw error;
        }

        setSuccessMessage(
          "Club actualizado correctamente."
        );
      }

      /* ---------------------------------------------------
         CREAR
      --------------------------------------------------- */

      else {
        const {
          error,
        } =
          await supabase
            .from(
              "clubs"
            )
            .insert({
              ...payload,
              active:
                true,
            });

        if (
          error
        ) {
          throw error;
        }

        setSuccessMessage(
          "Club creado correctamente."
        );
      }

      setEditingId(
        null
      );

      setForm({
        ...EMPTY_FORM,
      });

      setShowForm(
        false
      );

      await loadClubs();
    } catch (
      error: unknown
    ) {
      console.error(
        "Error guardando club:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el club."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     FILTROS
  ======================================================= */

  const countries =
    useMemo(
      () => {
        return Array.from(
          new Set(
            clubs
              .map(
                (
                  club
                ) =>
                  club.country
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(
                    value
                  )
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b
            )
        );
      },
      [
        clubs,
      ]
    );

  const filteredClubs =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        return clubs.filter(
          (
            club
          ) => {
            const searchableText =
              [
                club.name,
                club.short_name,
                club.country,
                club.province,
                club.city,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase();

            const matchesSearch =
              !term ||
              searchableText.includes(
                term
              );

            const matchesCountry =
              countryFilter ===
                "ALL" ||
              club.country ===
                countryFilter;

            const matchesStatus =
              statusFilter ===
                "ALL" ||
              (
                statusFilter ===
                  "ACTIVE" &&
                club.active
              ) ||
              (
                statusFilter ===
                  "INACTIVE" &&
                !club.active
              );

            return (
              matchesSearch &&
              matchesCountry &&
              matchesStatus
            );
          }
        );
      },
      [
        clubs,
        search,
        countryFilter,
        statusFilter,
      ]
    );

  /* =======================================================
     ESTADÍSTICAS
  ======================================================= */

  const totalClubs =
    clubs.length;

  const activeClubs =
    clubs.filter(
      (
        club
      ) =>
        club.active
    ).length;

  const argentinaClubs =
    clubs.filter(
      (
        club
      ) =>
        club.country
          ?.toLowerCase() ===
        "argentina"
    ).length;

  const provincesCount =
    new Set(
      clubs
        .filter(
          (
            club
          ) =>
            club.active
        )
        .map(
          (
            club
          ) =>
            club.province
              ?.trim()
        )
        .filter(
          Boolean
        )
    ).size;

  /* =======================================================
     CARGANDO
  ======================================================= */

  if (
    profileLoading
  ) {
    return (
      <div className="card">
        Verificando permisos...
      </div>
    );
  }

  /* =======================================================
     SIN SESIÓN
  ======================================================= */

  if (
    !profile
  ) {
    return (
      <div className="mx-auto max-w-xl">

        <div className="card">

          <h1 className="text-2xl font-black">
            Acceso requerido
          </h1>

          <p className="mt-3 text-slate-400">
            Para consultar la base de clubes necesitás iniciar sesión.
          </p>

          <a
            href="/login"
            className="btn mt-5"
          >
            Ingresar
          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-7">

      {/* ===================================================
          CABECERA
      =================================================== */}

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <div className="text-sm text-slate-400">
            Base maestra
          </div>

          <h1 className="mt-1 text-3xl font-black">
            Clubes
          </h1>

          <p className="mt-2 text-slate-400">
            Base institucional de clubes utilizados en el seguimiento de jugadores.
          </p>

        </div>

        {canManageClubs && (

          <button
            type="button"
            className="btn"
            onClick={
              startNewClub
            }
          >
            + Nuevo club
          </button>

        )}

      </div>

      {/* ===================================================
          FORMULARIO
      =================================================== */}

      {showForm &&
        canManageClubs && (

        <section className="card">

          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>

              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                {editingId
                  ? "Edición"
                  : "Alta"}
              </div>

              <h2 className="mt-1 text-xl font-black">

                {editingId
                  ? "Editar club"
                  : "Nuevo club"}

              </h2>

            </div>

            <button
              type="button"
              onClick={
                cancelForm
              }
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cerrar
            </button>

          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-6 grid gap-5 md:grid-cols-2"
          >

            {/* NOMBRE */}

            <div>

              <label className="label">
                Nombre del club *
              </label>

              <input
                className="input"
                value={
                  form.name
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    "name",
                    event.target.value
                  )
                }
                placeholder="Ej. Club Atlético River Plate"
                required
              />

            </div>

            {/* ABREVIATURA */}

            <div>

              <label className="label">
                Nombre corto / abreviatura
              </label>

              <input
                className="input"
                value={
                  form.short_name
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    "short_name",
                    event.target.value
                  )
                }
                placeholder="Ej. River / CARP"
                maxLength={
                  20
                }
              />

            </div>

            {/* PAÍS */}

            <div>

              <label className="label">
                País
              </label>

              <input
                className="input"
                value={
                  form.country
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    "country",
                    event.target.value
                  )
                }
                placeholder="Argentina"
              />

            </div>

            {/* PROVINCIA */}

            <div>

              <label className="label">
                Provincia / Estado
              </label>

              <input
                className="input"
                value={
                  form.province
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    "province",
                    event.target.value
                  )
                }
                placeholder="Buenos Aires"
              />

            </div>

            {/* CIUDAD */}

            <div className="md:col-span-2">

              <label className="label">
                Ciudad
              </label>

              <input
                className="input"
                value={
                  form.city
                }
                onChange={(
                  event
                ) =>
                  updateForm(
                    "city",
                    event.target.value
                  )
                }
                placeholder="Ej. Lomas de Zamora"
              />

            </div>

            {/* MENSAJE */}

            {message && (

              <div className="md:col-span-2 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-200">
                {message}
              </div>

            )}

            {/* ACCIONES */}

            <div className="md:col-span-2 flex justify-end gap-3">

              <button
                type="button"
                onClick={
                  cancelForm
                }
                className="rounded-lg border border-slate-600 px-5 py-3"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn px-6 py-3"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Guardando..."
                  : editingId
                  ? "Guardar cambios"
                  : "Crear club"}
              </button>

            </div>

          </form>

        </section>

      )}

      {/* ===================================================
          MENSAJE DE ÉXITO
      =================================================== */}

      {successMessage && (

        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">

          <div className="flex items-start justify-between gap-4">

            <div className="text-sm text-emerald-200">
              {successMessage}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

      {/* ===================================================
          ERROR GENERAL
      =================================================== */}

      {message &&
        !showForm && (

        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">

          <div className="flex items-start justify-between gap-4">

            <div className="text-sm text-red-200">
              {message}
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage(
                  ""
                )
              }
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

      {/* ===================================================
          ESTADÍSTICAS
      =================================================== */}

      <section className="grid gap-4 md:grid-cols-4">

        <StatCard
          label="Clubes"
          value={
            totalClubs
          }
        />

        <StatCard
          label="Activos"
          value={
            activeClubs
          }
        />

        <StatCard
          label="Argentina"
          value={
            argentinaClubs
          }
        />

        <StatCard
          label="Provincias"
          value={
            provincesCount
          }
        />

      </section>

      {/* ===================================================
          FILTROS
      =================================================== */}

      <section className="card">

        <div className="grid gap-4 lg:grid-cols-[1fr_220px_200px]">

          <div>

            <label className="label">
              Buscar
            </label>

            <input
              className="input"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Club, abreviatura, ciudad, provincia..."
            />

          </div>

          <div>

            <label className="label">
              País
            </label>

            <select
              className="input"
              value={
                countryFilter
              }
              onChange={(
                event
              ) =>
                setCountryFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                Todos
              </option>

              {countries.map(
                (
                  country
                ) => (

                  <option
                    key={
                      country
                    }
                    value={
                      country
                    }
                  >
                    {country}
                  </option>

                )
              )}

            </select>

          </div>

          <div>

            <label className="label">
              Estado
            </label>

            <select
              className="input"
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              <option value="ACTIVE">
                Activos
              </option>

              <option value="INACTIVE">
                Inactivos
              </option>

              <option value="ALL">
                Todos
              </option>

            </select>

          </div>

        </div>

      </section>

      {/* ===================================================
          LISTADO
      =================================================== */}

      <section className="card overflow-x-auto">

        {loading ? (

          <p className="text-sm text-slate-400">
            Cargando clubes...
          </p>

        ) : filteredClubs.length ===
          0 ? (

          <div>

            <h2 className="text-xl font-black">
              No hay clubes
            </h2>

            <p className="mt-2 text-sm text-slate-400">

              {clubs.length ===
              0
                ? canManageClubs
                  ? "Todavía no se cargaron clubes. Podés registrar el primero desde esta pantalla."
                  : "Todavía no existen clubes disponibles para consultar."
                : "No hay clubes que coincidan con los filtros seleccionados."}

            </p>

            {clubs.length ===
              0 &&
              canManageClubs && (

              <button
                type="button"
                className="btn mt-5"
                onClick={
                  startNewClub
                }
              >
                + Nuevo club
              </button>

            )}

          </div>

        ) : (

          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="border-b border-slate-700 text-slate-400">

              <tr>

                <th className="py-3 pr-5">
                  Club
                </th>

                <th className="py-3 pr-5">
                  Abreviatura
                </th>

                <th className="py-3 pr-5">
                  País
                </th>

                <th className="py-3 pr-5">
                  Provincia
                </th>

                <th className="py-3 pr-5">
                  Ciudad
                </th>

                <th className="py-3 pr-5">
                  Estado
                </th>

                {canManageClubs && (

                  <th className="py-3 text-right">
                    Acciones
                  </th>

                )}

              </tr>

            </thead>

            <tbody>

              {filteredClubs.map(
                (
                  club
                ) => (

                  <tr
                    key={
                      club.id
                    }
                    className="border-b border-slate-800"
                  >

                    <td className="py-4 pr-5">

                      <div className="font-bold">
                        {club.name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        ID{" "}
                        {club.id.slice(
                          0,
                          8
                        )}
                        …
                      </div>

                    </td>

                    <td className="py-4 pr-5">

                      {club.short_name ||
                        "—"}

                    </td>

                    <td className="py-4 pr-5">

                      {club.country ||
                        "—"}

                    </td>

                    <td className="py-4 pr-5">

                      {club.province ||
                        "—"}

                    </td>

                    <td className="py-4 pr-5">

                      {club.city ||
                        "—"}

                    </td>

                    <td className="py-4 pr-5">

                      {club.active ? (

                        <span className="rounded-full border border-emerald-800 bg-emerald-950/20 px-3 py-1 text-xs font-bold text-emerald-300">
                          Activo
                        </span>

                      ) : (

                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-400">
                          Inactivo
                        </span>

                      )}

                    </td>

                    {canManageClubs && (

                      <td className="py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            startEditClub(
                              club
                            )
                          }
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold transition hover:border-slate-500 hover:bg-slate-800"
                        >
                          Editar
                        </button>

                      </td>

                    )}

                  </tr>

                )
              )}

            </tbody>

          </table>

        )}

      </section>

      {/* ===================================================
          ACLARACIÓN ADMIN
      =================================================== */}

      {isAdmin && (

        <div className="text-xs leading-5 text-slate-500">

          La desactivación de clubes se incorporará como baja lógica.
          Los clubes vinculados históricamente a jugadores no se eliminarán
          físicamente de la base.

        </div>

      )}

    </div>
  );
}

/* =========================================================
   COMPONENTE ESTADÍSTICA
========================================================= */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="card">

      <div className="text-sm text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>

    </div>
  );
}
