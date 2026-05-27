import { z } from "zod";

export const loginSchema = z.object({
  tenantSlug: z
    .string()
    .min(2, "Workspace slug is required")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  email: z
    .string()
    .min(2, "Enter your email or username")
    .max(120, "Login is too long"),
  password: z.string().min(8, "At least 8 characters"),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    companyName: z.string().min(2, "Company name is required"),
    email: z.string().email("Valid email required"),
    password: z
      .string()
      .min(8, "Min 8 characters")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number")
      .regex(/[^A-Za-z0-9]/, "Add a special character"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, { message: "Accept terms to continue" }),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords must match", path: ["confirm"] });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
