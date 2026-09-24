// Dual cloud + POS field names for bootstrap/delta responses.
//
// FluxOne-POS invoice slip policies:
// See ./posSlipPolicies.contract.js — after sync, print company.slipPolicies
// (or returnInstructions fallback) on the sale receipt footer.

import {
  POS_SLIP_POLICY_FIELDS,
  resolveSlipPoliciesForPrint,
  formatSlipPolicyPrintLines,
} from './posSlipPolicies.contract.js'

export {
  POS_SLIP_POLICY_FIELDS,
  resolveSlipPoliciesForPrint,
  formatSlipPolicyPrintLines,
}

function mapUser(user) {
  // Never ship password hashes to POS — offline auth must use a separate mechanism
  const { passwordHash: _passwordHash, password_hash: _password_hash, ...safe } = user
  return {
    ...safe,
    name: user.fullName,
    email: user.loginId,
  }
}

function mapProduct(product) {
  const isActive = product.status === 'active'
  return {
    ...product,
    sku: product.itemCode,
    price: product.sellingPrice,
    isActive,
  }
}

function mapTax(tax) {
  return {
    ...tax,
    rate: tax.ratePercent,
  }
}

function flattenProductTaxes(products) {
  const productTaxes = []
  for (const product of products) {
    for (const taxId of product.taxIds || []) {
      productTaxes.push({ productId: product.id, taxId })
    }
  }
  return productTaxes
}

export function mapSnapshotForPos(snapshot) {
  const users = (snapshot.users || []).map(mapUser)
  const products = (snapshot.products || []).map(mapProduct)
  const taxes = (snapshot.taxes || []).map(mapTax)
  const productTaxes = flattenProductTaxes(products)

  // Enabled Admin policies for POS receipt footer (FluxOne-POS must print these)
  const slipPolicies = Array.isArray(snapshot.company?.slipPolicies)
    ? snapshot.company.slipPolicies
    : snapshot.policies || []

  const company = snapshot.company
    ? {
        ...snapshot.company,
        phone: snapshot.company.contactPhone ?? snapshot.company.phone ?? null,
        address: snapshot.company.address ?? null,
        slipPolicies,
      }
    : snapshot.company

  return {
    ...snapshot,
    users,
    products,
    taxes,
    productTaxes,
    policies: slipPolicies,
    company,
  }
}
