import bcrypt from 'bcryptjs'
import {
  createBranchWithManager,
  generateTemporaryPassword,
  getBranchById,
  getTenantName,
  listBranches,
  resetBranchManagerPassword,
  setBranchStatus,
  updateBranch,
} from './branches.model.js'
import { sendLoginCredentialsEmail } from '../../../mail/mail.service.js'
import { fail, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'

function normalizeManager(body) {
  if (body.manager) return body.manager
  if (!body.managerName && !body.managerEmail) return null
  return {
    name: body.managerName,
    email: body.managerEmail,
    contact: body.managerContact,
    otherContact: body.managerOtherContact,
    gender: body.managerGender,
    address: body.managerAddress,
  }
}

function loginAppUrl() {
  const base = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim()
  return `${base.replace(/\/$/, '')}/login`
}

function maybeIncludeTempPassword(temporaryPassword) {
  if (process.env.NODE_ENV === 'production') return undefined
  return temporaryPassword
}

async function deliverCredentials({ branch, temporaryPassword, companyName, roleLabel }) {
  if (!branch?.manager?.email) {
    return { sent: false, stubbed: true }
  }
  return sendLoginCredentialsEmail({
    recipientName: branch.manager.name,
    loginEmail: branch.manager.email,
    temporaryPassword,
    branchName: branch.name,
    companyName,
    loginUrl: loginAppUrl(),
    roleLabel,
  })
}

export async function branchesList(req, res) {
  const result = await listBranches(req.tenantId, req.validated.query)
  return success(res, paginatedResult(result.items, result))
}

export async function branchDetail(req, res) {
  const row = await getBranchById(req.tenantId, req.validated.params.id)
  if (!row) return fail(res, 'Branch not found', 404)
  return success(res, row)
}

export async function createBranch(req, res) {
  const body = req.validated.body
  const manager = normalizeManager(body)
  if (!manager?.name?.trim() || !manager?.email?.trim()) {
    return fail(res, 'manager name and email are required', 400)
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 10)

  let created
  try {
    created = await createBranchWithManager(req.tenantId, {
      name: body.name,
      location: body.location,
      image: body.image || body.imageUrl,
      status: body.status,
      manager,
      passwordHash,
    })
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status)
    throw err
  }

  const companyName = await getTenantName(req.tenantId)
  const mail = await deliverCredentials({
    branch: created,
    temporaryPassword,
    companyName,
    roleLabel: 'Branch Manager',
  })

  return success(
    res,
    {
      ...created,
      credentials: {
        email: created.manager?.email,
        emailed: mail.sent,
        stubbed: mail.stubbed,
        temporaryPassword: maybeIncludeTempPassword(temporaryPassword),
      },
    },
    201,
  )
}

export async function patchBranch(req, res) {
  const body = req.validated.body
  const manager = normalizeManager(body)

  let row
  try {
    row = await updateBranch(req.tenantId, req.validated.params.id, {
      name: body.name,
      location: body.location,
      image: body.image || body.imageUrl,
      manager: manager || undefined,
    })
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status)
    throw err
  }

  if (!row) return fail(res, 'Branch not found', 404)
  return success(res, row)
}

export async function patchBranchStatus(req, res) {
  try {
    const row = await setBranchStatus(
      req.tenantId,
      req.validated.params.id,
      req.validated.body.status,
    )
    return success(res, row)
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status)
    throw err
  }
}

export async function resetPassword(req, res) {
  const override = req.validated.body?.password
  const temporaryPassword = override || generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 10)

  let branch
  try {
    branch = await resetBranchManagerPassword(
      req.tenantId,
      req.validated.params.id,
      passwordHash,
    )
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status)
    throw err
  }

  const companyName = await getTenantName(req.tenantId)
  const mail = await deliverCredentials({
    branch,
    temporaryPassword,
    companyName,
    roleLabel: 'Branch Manager',
  })

  return success(res, {
    id: branch.id,
    manager: {
      id: branch.manager?.id,
      email: branch.manager?.email,
      name: branch.manager?.name,
    },
    credentials: {
      email: branch.manager?.email,
      emailed: mail.sent,
      stubbed: mail.stubbed,
      temporaryPassword: maybeIncludeTempPassword(temporaryPassword),
    },
  })
}
