import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

type UserRole =
  | "ADMIN"
  | "SCOUT"
  | "VIEWER";

/* =========================================================
   CLIENTE ADMINISTRATIVO SUPABASE
========================================================= */

function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL no está configurada."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/* =========================================================
   OBTENER TOKEN BEARER
========================================================= */

function getBearerToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (!authorization) {
    return null;
  }

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim();
}

/* =========================================================
   VALIDAR ADMINISTRADOR
========================================================= */

async function requireAdmin(
  request: NextRequest
) {
  const token =
    getBearerToken(
      request
    );

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error:
        "No se encontró una sesión válida.",
    };
  }

  const admin =
    getAdminClient();

  const {
    data: userData,
    error: userError,
  } =
    await admin.auth
      .getUser(
        token
      );

  if (
    userError ||
    !userData.user
  ) {
    return {
      ok: false as const,
      status: 401,
      error:
        "La sesión venció o no es válida.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(
        "id, role, active"
      )
      .eq(
        "id",
        userData.user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        "No se encontró el perfil del usuario.",
    };
  }

  if (
    profile.active !== true
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        "La cuenta se encuentra deshabilitada.",
    };
  }

  if (
    profile.role !== "ADMIN"
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        "No tenés permisos de administrador.",
    };
  }

  return {
    ok: true as const,
    admin,
    user:
      userData.user,
    profile,
  };
}

/* =========================================================
   GET
   LISTAR USUARIOS
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return NextResponse.json(
        {
          error:
            auth.error,
        },
        {
          status:
            auth.status,
        }
      );
    }

    const {
      data,
      error,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(`
          id,
          full_name,
          email,
          role,
          active,
          created_at,
          updated_at,
          last_login_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (error) {
      console.error(
        "Error obteniendo usuarios:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron cargar los usuarios.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        users:
          data ?? [],
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Error GET /api/admin/users:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   MODIFICAR ROL O ESTADO
========================================================= */

export async function PATCH(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return NextResponse.json(
        {
          error:
            auth.error,
        },
        {
          status:
            auth.status,
        }
      );
    }

    const body =
      await request.json();

    const userId =
      String(
        body.userId ||
        ""
      ).trim();

    const requestedRole =
      body.role as
        | UserRole
        | undefined;

    const requestedActive =
      typeof body.active ===
      "boolean"
        ? body.active
        : undefined;

    /* =====================================================
       VALIDAR USUARIO
    ===================================================== */

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Usuario no especificado.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       VALIDAR ROL
    ===================================================== */

    if (
      requestedRole !==
        undefined &&
      ![
        "ADMIN",
        "SCOUT",
        "VIEWER",
      ].includes(
        requestedRole
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Rol no válido.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       EVITAR AUTOBLOQUEO
    ===================================================== */

    if (
      userId ===
      auth.user.id
    ) {
      if (
        requestedRole !==
          undefined &&
        requestedRole !==
          "ADMIN"
      ) {
        return NextResponse.json(
          {
            error:
              "No podés quitarte tu propio rol de Administrador.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        requestedActive ===
        false
      ) {
        return NextResponse.json(
          {
            error:
              "No podés desactivar tu propia cuenta.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* =====================================================
       BUSCAR USUARIO OBJETIVO
    ===================================================== */

    const {
      data: targetUser,
      error: targetError,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .select(
          "id, full_name, email, role, active"
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (
      targetError ||
      !targetUser
    ) {
      return NextResponse.json(
        {
          error:
            "El usuario seleccionado no existe.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       VALIDAR QUE HAYA CAMBIOS
    ===================================================== */

    if (
      requestedRole ===
        undefined &&
      requestedActive ===
        undefined
    ) {
      return NextResponse.json(
        {
          error:
            "No se especificaron cambios.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       CONSTRUIR ACTUALIZACIÓN
    ===================================================== */

    const updates: {
      role?: UserRole;
      active?: boolean;
      updated_at: string;
    } = {
      updated_at:
        new Date()
          .toISOString(),
    };

    if (
      requestedRole !==
      undefined
    ) {
      updates.role =
        requestedRole;
    }

    if (
      requestedActive !==
      undefined
    ) {
      updates.active =
        requestedActive;
    }

    /* =====================================================
       ACTUALIZAR PERFIL
    ===================================================== */

    const {
      data: updatedUser,
      error: updateError,
    } =
      await auth.admin
        .from(
          "profiles"
        )
        .update(
          updates
        )
        .eq(
          "id",
          userId
        )
        .select(`
          id,
          full_name,
          email,
          role,
          active,
          created_at,
          updated_at,
          last_login_at
        `)
        .single();

    if (updateError) {
      console.error(
        "Error actualizando usuario:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo actualizar el usuario.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user:
          updatedUser,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Error PATCH /api/admin/users:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado.",
      },
      {
        status: 500,
      }
    );
  }
}
