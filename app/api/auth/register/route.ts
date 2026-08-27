import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  timingSafeEqual,
} from "crypto";

/* =========================================================
   SCOUT GK
   REGISTRO INSTITUCIONAL DE USUARIOS
========================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   VARIABLES DE ENTORNO
========================================================= */

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const institutionAccessKey =
  process.env.INSTITUTION_ACCESS_KEY;

/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function validateEmail(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function validatePassword(
  password: string
) {
  if (
    password.length < 8
  ) {
    return "La contraseña debe contener al menos 8 caracteres.";
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return "La contraseña debe contener al menos una letra mayúscula.";
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return "La contraseña debe contener al menos una letra minúscula.";
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return "La contraseña debe contener al menos un número.";
  }

  return null;
}

/* =========================================================
   COMPARACIÓN SEGURA DE CLAVE INSTITUCIONAL
========================================================= */

function secureCompare(
  received:
    string,

  expected:
    string
) {
  const receivedBuffer =
    Buffer.from(
      received,
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      expected,
      "utf8"
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {

    /* =====================================================
       1. CONFIGURACIÓN DEL SERVIDOR
    ===================================================== */

    if (
      !supabaseUrl
    ) {
      console.error(
        "SUPABASE_URL no configurada."
      );

      return NextResponse.json(
        {
          error:
            "Configuración del servidor incompleta.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !serviceRoleKey
    ) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY no configurada."
      );

      return NextResponse.json(
        {
          error:
            "Configuración del servidor incompleta.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !institutionAccessKey
    ) {
      console.error(
        "INSTITUTION_ACCESS_KEY no configurada."
      );

      return NextResponse.json(
        {
          error:
            "La clave institucional no está configurada.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       2. LEER BODY
    ===================================================== */

    const body =
      await request.json();

    const fullName =
      String(
        body.fullName ||
        ""
      ).trim();

    const email =
      normalizeEmail(
        String(
          body.email ||
          ""
        )
      );

    const password =
      String(
        body.password ||
        ""
      );

    const confirmPassword =
      String(
        body.confirmPassword ||
        ""
      );

    const institutionalKey =
      String(
        body.institutionalKey ||
        ""
      ).trim();

    /* =====================================================
       3. VALIDACIONES
    ===================================================== */

    if (
      fullName.length <
      3
    ) {
      return NextResponse.json(
        {
          error:
            "Ingresá nombre y apellido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !validateEmail(
        email
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ingresá un correo electrónico válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Las contraseñas no coinciden.",
        },
        {
          status: 400,
        }
      );
    }

    const passwordError =
      validatePassword(
        password
      );

    if (
      passwordError
    ) {
      return NextResponse.json(
        {
          error:
            passwordError,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !institutionalKey
    ) {
      return NextResponse.json(
        {
          error:
            "Ingresá la clave institucional.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       4. VALIDAR CLAVE INSTITUCIONAL
    ===================================================== */

    const validInstitutionKey =
      secureCompare(
        institutionalKey,
        institutionAccessKey
      );

    if (
      !validInstitutionKey
    ) {
      return NextResponse.json(
        {
          error:
            "Clave institucional incorrecta.",
        },
        {
          status: 403,
        }
      );
    }

    /* =====================================================
       5. CLIENTE ADMINISTRADOR
    ===================================================== */

    const admin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      );

    /* =====================================================
       6. CREAR USUARIO EN SUPABASE AUTH
    ===================================================== */

    const {
      data:
        createUserData,

      error:
        createUserError,
    } =
      await admin.auth.admin
        .createUser(
          {
            email,
            password,

            /*
             * Al usar registro institucional,
             * habilitamos el correo directamente.
             */
            email_confirm:
              true,

            user_metadata: {
              full_name:
                fullName,

              role:
                "SCOUT",
            },
          }
        );

    if (
      createUserError
    ) {
      console.error(
        "Error creando usuario:",
        createUserError
      );

      const lowerMessage =
        createUserError.message
          .toLowerCase();

      if (
        lowerMessage.includes(
          "already"
        ) ||
        lowerMessage.includes(
          "registered"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Ya existe una cuenta registrada con ese correo electrónico.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "No fue posible crear la cuenta.",
        },
        {
          status: 400,
        }
      );
    }

    const newUser =
      createUserData.user;

    if (
      !newUser
    ) {
      return NextResponse.json(
        {
          error:
            "No fue posible crear el usuario.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       7. CREAR PERFIL
    ===================================================== */

    const now =
      new Date()
        .toISOString();

    const {
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles"
        )
        .insert({
          id:
            newUser.id,

          full_name:
            fullName,

          email,

          role:
            "SCOUT",

          active:
            true,

          created_at:
            now,

          updated_at:
            now,

          last_login_at:
            null,
        });

    /* =====================================================
       8. ROLLBACK SI FALLA EL PERFIL
    ===================================================== */

    if (
      profileError
    ) {
      console.error(
        "Error creando profile:",
        profileError
      );

      await admin.auth.admin
        .deleteUser(
          newUser.id
        );

      return NextResponse.json(
        {
          error:
            "La cuenta no pudo completarse y fue cancelada.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       9. RESPUESTA
    ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Cuenta creada correctamente. Ya podés iniciar sesión.",

        user: {
          id:
            newUser.id,

          fullName,

          email,

          role:
            "SCOUT",
        },
      },
      {
        status: 201,
      }
    );

  } catch (
    error
  ) {
    console.error(
      "Error inesperado en /api/auth/register:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Se produjo un error inesperado al crear la cuenta.",
      },
      {
        status: 500,
      }
    );
  }
}
