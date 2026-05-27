import { prisma } from "@sangam/db";
import { validateQuery, withApi } from "@sangam/api-kit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo-mode inbox: lists the MockEmail rows so testers can read OTPs /
 * password-reset tokens / invite links.
 *
 * Unauthenticated on purpose — this only exists when DEMO_MODE=true and is
 * intended for end-to-end demos. In production (DEMO_MODE=false) returns 404.
 *
 * A polished UI will land in Phase 4 (`/platform/inbox`).
 */

const QuerySchema = z.object({
  email: z.string().email().optional(),
  category: z.string().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
});

export const GET = withApi(async (req) => {
  if ((process.env.DEMO_MODE ?? "true").toLowerCase() === "false") {
    return new Response("Not Found", { status: 404 });
  }
  const { email, category, take } = await validateQuery(req, QuerySchema);

  return prisma.mockEmail.findMany({
    where: {
      ...(email ? { toEmail: email.toLowerCase() } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      toEmail: true,
      fromEmail: true,
      subject: true,
      body: true,
      category: true,
      metadata: true,
      createdAt: true,
    },
  });
});
