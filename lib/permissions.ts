/* =========================================================
   SCOUT GK
   ROLES Y PERMISOS
========================================================= */

export type UserRole =
  | "ADMIN"
  | "SCOUT"
  | "VIEWER";

export type Permission =
  | "dashboard:view"

  | "players:view"
  | "players:create"
  | "players:edit"
  | "players:delete"

  | "videos:view"
  | "videos:create"
  | "videos:edit"
  | "videos:delete"

  | "analysis:view"
  | "analysis:create"
  | "analysis:validate"

  | "reports:view"
  | "reports:create"
  | "reports:edit"

  | "compare:view"

  | "profile:view"
  | "profile:edit"

  | "users:view"
  | "users:manage";

/* =========================================================
   MATRIZ DE PERMISOS
========================================================= */

const ROLE_PERMISSIONS: Record<
  UserRole,
  Permission[]
> = {
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

    "compare:view",

    "profile:view",
    "profile:edit",

    "users:view",
    "users:manage",
  ],

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
   NOMBRE DEL ROL
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
      return "Administración general de Scout GK, incluyendo usuarios, roles, jugadores, videos, análisis e informes.";

    case "SCOUT":
      return "Puede registrar y evaluar jugadores, cargar videos, generar informes y validar análisis de scouting.";

    case "VIEWER":
      return "Perfil de consulta. Puede acceder a información y evaluaciones, sin modificar contenido de scouting.";

    default:
      return "No hay un rol institucional asignado.";
  }
}
