/* =========================================================
   SCOUT GK
   ROLES Y PERMISOS
========================================================= */

export type UserRole =
  | "ADMIN"
  | "SCOUT"
  | "VIEWER";

export type Permission =
  /* DASHBOARD */
  | "dashboard:view"

  /* JUGADORES */
  | "players:view"
  | "players:create"
  | "players:edit"
  | "players:delete"

  /* VIDEOS */
  | "videos:view"
  | "videos:create"
  | "videos:edit"
  | "videos:delete"

  /* ANÁLISIS */
  | "analysis:view"
  | "analysis:create"
  | "analysis:validate"

  /* INFORMES */
  | "reports:view"
  | "reports:create"
  | "reports:edit"
  | "reports:delete"

  /* COMPARACIÓN */
  | "compare:view"

  /* PERFIL */
  | "profile:view"
  | "profile:edit"

  /* USUARIOS */
  | "users:view"
  | "users:manage";

/* =========================================================
   MATRIZ DE PERMISOS
========================================================= */

const ROLE_PERMISSIONS: Record<
  UserRole,
  Permission[]
> = {
  /* =======================================================
     ADMINISTRADOR
  ======================================================= */

  ADMIN: [
    "dashboard:view",

    "players:view",
    "players:create",
    "players:edit",
    "players:delete",

    "videos:view",
    "videos:create",
    "videos:edit",
    "videos:delete",

    "analysis:view",
    "analysis:create",
    "analysis:validate",

    "reports:view",
    "reports:create",
    "reports:edit",
    "reports:delete",

    "compare:view",

    "profile:view",
    "profile:edit",

    "users:view",
    "users:manage",
  ],

  /* =======================================================
     SCOUT
  ======================================================= */

  SCOUT: [
    "dashboard:view",

    "players:view",
    "players:create",
    "players:edit",

    "videos:view",
    "videos:create",
    "videos:edit",

    "analysis:view",
    "analysis:create",
    "analysis:validate",

    "reports:view",
    "reports:create",
    "reports:edit",

    "compare:view",

    "profile:view",
    "profile:edit",
  ],

  /* =======================================================
     CONSULTA
  ======================================================= */

  VIEWER: [
    "dashboard:view",

    "players:view",

    "videos:view",

    "analysis:view",

    "reports:view",

    "compare:view",

    "profile:view",
    "profile:edit",
  ],
};

/* =========================================================
   VALIDAR PERMISO
========================================================= */

export function hasPermission(
  role:
    | UserRole
    | null
    | undefined,
  permission: Permission
) {
  if (!role) {
    return false;
  }

  return (
    ROLE_PERMISSIONS[
      role
    ]?.includes(
      permission
    ) ?? false
  );
}

/* =========================================================
   ETIQUETA DEL ROL
========================================================= */

export function roleLabel(
  role:
    | UserRole
    | null
    | undefined
) {
  switch (role) {
    case "ADMIN":
      return "Administrador";

    case "SCOUT":
      return "Scout";

    case "VIEWER":
      return "Consulta";

    default:
      return "Sin rol";
  }
}

/* =========================================================
   DESCRIPCIÓN DEL ROL
========================================================= */

export function roleDescription(
  role:
    | UserRole
    | null
    | undefined
) {
  switch (role) {
    case "ADMIN":
      return "Control general de la plataforma. Puede gestionar usuarios, roles, jugadores, videos, análisis e informes.";

    case "SCOUT":
      return "Puede registrar y editar jugadores, cargar videos, realizar análisis y generar informes de scouting.";

    case "VIEWER":
      return "Perfil de consulta. Puede acceder a jugadores, videos, informes y comparaciones sin modificar información.";

    default:
      return "No hay un rol asignado.";
  }
}

/* =========================================================
   LISTA DE PERMISOS DE UN ROL
========================================================= */

export function permissionsForRole(
  role:
    | UserRole
    | null
    | undefined
): Permission[] {
  if (!role) {
    return [];
  }

  return [
    ...(ROLE_PERMISSIONS[
      role
    ] ?? []),
  ];
}
