"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "./supabase";

import {
  hasPermission,
  Permission,
  UserRole,
} from "./permissions";

/* =========================================================
   TIPOS
========================================================= */

export type CurrentProfile = {
  id: string;

  full_name: string;

  email: string;

  role: UserRole;

  active: boolean;

  created_at: string;

  updated_at: string;

  last_login_at:
    | string
    | null;
};

/* =========================================================
   HOOK
========================================================= */

export function useCurrentUser() {
  const [
    profile,
    setProfile,
  ] =
    useState<
      CurrentProfile | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     CARGAR PERFIL
  ======================================================= */

  const loadProfile =
    useCallback(
      async () => {
        setLoading(true);

        setError("");

        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await supabase.auth
            .getSession();

        if (
          sessionError
        ) {
          setError(
            sessionError.message
          );

          setProfile(
            null
          );

          setLoading(
            false
          );

          return;
        }

        const user =
          sessionData.session
            ?.user;

        if (!user) {
          setProfile(
            null
          );

          setLoading(
            false
          );

          return;
        }

        const {
          data,
          error:
            profileError,
        } =
          await supabase
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
            .eq(
              "id",
              user.id
            )
            .maybeSingle();

        if (
          profileError
        ) {
          console.error(
            "Error cargando perfil:",
            profileError
          );

          setError(
            profileError.message
          );

          setProfile(
            null
          );

          setLoading(
            false
          );

          return;
        }

        if (!data) {
          setError(
            "No se encontró el perfil asociado a esta cuenta."
          );

          setProfile(
            null
          );

          setLoading(
            false
          );

          return;
        }

        if (
          data.active ===
          false
        ) {
          await supabase.auth
            .signOut();

          setError(
            "La cuenta se encuentra deshabilitada."
          );

          setProfile(
            null
          );

          setLoading(
            false
          );

          return;
        }

        setProfile(
          data as CurrentProfile
        );

        setLoading(
          false
        );
      },
      []
    );

  /* =======================================================
     INICIALIZACIÓN
  ======================================================= */

  useEffect(
    () => {
      loadProfile();

      const {
        data:
          authListener,
      } =
        supabase.auth
          .onAuthStateChange(
            () => {
              loadProfile();
            }
          );

      return () => {
        authListener
          .subscription
          .unsubscribe();
      };
    },
    [
      loadProfile,
    ]
  );

  /* =======================================================
     PERMISOS
  ======================================================= */

  function can(
    permission:
      Permission
  ) {
    return hasPermission(
      profile?.role,
      permission
    );
  }

  return {
    profile,

    role:
      profile?.role ??
      null,

    loading,

    error,

    can,

    reload:
      loadProfile,
  };
}
