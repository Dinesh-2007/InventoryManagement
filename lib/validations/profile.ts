import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().max(30, "Phone must be at most 30 characters").optional().or(z.literal("")),
  avatarUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
