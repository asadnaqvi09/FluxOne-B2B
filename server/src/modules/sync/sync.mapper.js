// Dual cloud + POS field names for bootstrap/delta responses.

function mapUser(user) {
  return {
    ...user,
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

  const company = snapshot.company
    ? {
        ...snapshot.company,
        phone: snapshot.company.contactPhone ?? snapshot.company.phone ?? null,
        address: snapshot.company.address ?? null,
        // Pass through slip policies for POS invoice footer
        slipPolicies: Array.isArray(snapshot.company.slipPolicies)
          ? snapshot.company.slipPolicies
          : snapshot.policies || [],
      }
    : snapshot.company

  return {
    ...snapshot,
    users,
    products,
    taxes,
    productTaxes,
    policies: snapshot.policies || company?.slipPolicies || [],
    company,
  }
}
