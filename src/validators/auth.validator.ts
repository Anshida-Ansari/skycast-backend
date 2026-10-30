import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email({ message: 'Invalid email address format' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters long' })
      .max(100, { message: 'Password cannot exceed 100 characters' }),
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(70, { message: 'Full name cannot exceed 70 characters' }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email({ message: 'Invalid email address format' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, { message: 'Password is required' }),
  }),
});

