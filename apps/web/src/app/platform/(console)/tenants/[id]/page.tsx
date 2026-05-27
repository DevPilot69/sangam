"use client";

import { useParams } from "next/navigation";

import { TenantProfileView } from "@/components/platform/tenant-profile-view";

export default function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <TenantProfileView tenantId={id} />;
}
