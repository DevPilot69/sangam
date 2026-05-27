import { prisma } from "@sangam/db";
import { requireAuth, validateJson, withApi } from "@sangam/api-kit";
import { Billing } from "@sangam/contracts";
import * as billing from "@/server/billing/billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req) => {
  const user = await requireAuth(req, ["billing:read"]);
  const dto = await validateJson(req, Billing.CreateSubscriptionSchema);
  const dbUser = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { email: true, name: true },
  });
  return billing.createCheckout(
    user.tenantId,
    dbUser ?? { email: user.email ?? "billing@vetan.app", name: "Admin" },
    dto,
  );
});
