import { z } from 'zod'

// Single login form: id + password only.
// Tenant/company is resolved server-side from the user record.
export const loginSchema = z
  .object({
    body: z.object({
      id: z.string().min(1).optional(),
      email: z.string().optional(),
      password: z.string().min(8).max(72),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  })
  .superRefine((data, ctx) => {
    const loginId = (data.body.id || data.body.email || '').trim()
    if (!loginId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'id is required',
        path: ['body', 'id'],
      })
    }
  })

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8).max(72),
    newPassword: z.string().min(8).max(72),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})

// Self-service profile: name + login ID; optional password.
// Image-only updates are allowed (multer file checked in controller).
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    id: z.string().min(3).max(190).optional(),
    password: z.string().min(8).max(72).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})
