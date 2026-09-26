import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or login ID"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    loginId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._-]{3,32}$/, "3–32 characters: letters, numbers, dot, dash or underscore"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotSchema = z.object({ email: z.email("Enter a valid email address").trim().toLowerCase() });

export const resetSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    otp: z.string().trim().regex(/^\d{6,10}$/, "Enter the code from your email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
