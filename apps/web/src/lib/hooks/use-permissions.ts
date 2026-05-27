"use client";

import { useMemo } from "react";

import { Permission, permissionsForRole, type PermissionKey } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/auth/auth-store";

const permissionValues = new Set<string>(Object.values(Permission));

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);
  const apiPermissions = useAuthStore((s) => s.user?.permissions);

  return useMemo(() => {
    const set = new Set<PermissionKey>();
    if (apiPermissions?.length) {
      for (const p of apiPermissions) {
        if (permissionValues.has(p)) set.add(p as PermissionKey);
      }
    } else {
      for (const p of permissionsForRole(role ?? "")) set.add(p);
    }
    return {
      hasPermission: (perm: PermissionKey) => set.has(perm),
    };
  }, [role, apiPermissions]);
}
