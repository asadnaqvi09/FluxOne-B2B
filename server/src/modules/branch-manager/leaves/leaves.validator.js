import { z } from 'zod'
import { empty, idParams, optionalUuid } from '../shared.validator.js'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

function withOrderedDates(schema) {
  return schema.superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date',
        path: ['endDate'],
      })
    }
  })
}

const leaveDatesFields = z.object({
  startDate: isoDate,
  endDate: isoDate,
  reason: z.string().trim().max(500).optional().nullable(),
})

// BM appoints leave for one or more staff employees
export const createStaffLeaveSchema = z.object({
  body: withOrderedDates(
    leaveDatesFields.extend({
      employeeIds: z.array(z.string().uuid()).min(1, 'Select at least one employee'),
    }),
  ),
  query: empty,
  params: empty,
})

// BM self leave request (pending Admin approval)
export const createMyLeaveSchema = z.object({
  body: withOrderedDates(leaveDatesFields),
  query: empty,
  params: empty,
})

export const updateStaffLeaveSchema = z.object({
  body: z.object({
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    reason: z.string().trim().max(500).optional().nullable(),
    status: z.enum(['approved', 'cancelled', 'rejected']).optional(),
  }),
  query: empty,
  params: idParams,
})

export const updateMyLeaveSchema = z.object({
  body: z.object({
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    reason: z.string().trim().max(500).optional().nullable(),
  }),
  query: empty,
  params: idParams,
})

export const listStaffLeavesSchema = z.object({
  body: empty,
  query: z.object({
    designationId: optionalUuid,
  }),
  params: empty,
})

export const leaveIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})
