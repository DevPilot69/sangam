import { prisma } from "@sangam/db";
import { isDemoMode } from "./demo-mode";

/**
 * Email provider — pluggable. In demo mode, inserts into MockEmail so the
 * /platform/inbox UI surfaces every "sent" mail (OTPs, password resets, invites).
 * In production, swap `realEmailProvider` for SendGrid / Resend.
 */

export type EmailMessage = {
  to: string;
  from?: string;
  subject: string;
  body: string;
  /** Category tag used by the inbox UI (e.g. "verify-email", "reset-password"). */
  category?: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
};

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}

const mockProvider: EmailProvider = {
  async send(msg) {
    const row = await prisma.mockEmail.create({
      data: {
        tenantId: msg.tenantId ?? null,
        toEmail: msg.to,
        fromEmail: msg.from ?? "no-reply@sangam.local",
        subject: msg.subject,
        body: msg.body,
        category: msg.category ?? null,
        metadata: (msg.metadata as object | undefined) ?? undefined,
      },
    });
    if (process.env.DEV_AUTH_VERBOSE === "true") {
      console.log(
        `[mock-email] -> ${msg.to} | ${msg.subject} (id=${row.id})`,
      );
    }
    return { id: row.id };
  },
};

const realProvider: EmailProvider = {
  async send() {
    throw new Error(
      "Real email provider not wired yet. Set DEMO_MODE=true or implement SendGrid client.",
    );
  },
};

export const email: EmailProvider = isDemoMode() ? mockProvider : realProvider;
