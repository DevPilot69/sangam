"use client";

import { useEffect, useRef } from "react";

import { fetchSessionUser } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/lib/auth/auth-store";

/** Refreshes user + permissions from GET /v1/auth/me (e.g. after deploy or new permissions). */
export function SessionProfileSync() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      lastSynced.current = null;
      return;
    }
    if (lastSynced.current === token) return;
    lastSynced.current = token;
    void fetchSessionUser(token)
      .then((u) => setUser(u))
      .catch(() => {
        lastSynced.current = null;
      });
  }, [token, setUser]);

  return null;
}
