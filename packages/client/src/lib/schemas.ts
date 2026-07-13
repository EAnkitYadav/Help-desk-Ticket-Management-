import { z } from "zod";

// ── Login ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ── Create Ticket ────────────────────────────────────────────────────────────
export const createTicketSchema = z.object({
  senderEmail: z
    .string()
    .min(1, "Customer email is required")
    .email("Please enter a valid email address"),
  senderName: z.string().optional(),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be under 200 characters"),
  body: z
    .string()
    .min(1, "Description is required")
    .min(10, "Description must be at least 10 characters"),
  category: z.string().optional(),
  priority: z.string().optional(),
});

export type CreateTicketFormData = z.infer<typeof createTicketSchema>;

// ── User Management ──────────────────────────────────────────────────────────
export const userFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().optional(),
  role: z.enum(["ADMIN", "AGENT"]),
});

export type UserFormData = z.infer<typeof userFormSchema>;
