import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/ui/select'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PhoneInput } from '@/components/shared/PhoneInput'
import { PoliciesTable } from '@/components/feature/admin/company/PoliciesTable'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useAdminPolicies } from '@/hooks/useAdminPolicies'
import { BRAND } from '@/lib/constants'
import { referenceFromUuid } from '@/lib/formatDisplayId'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  validatePhone,
  validateUrl,
} from '@/lib/validation/formValidators'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import {
  Building2,
  Phone,
  Globe,
  Share2,
  MessageCircle,
  FileCheck,
  ShieldAlert,
  Plus,
  Search,
  Save,
  FileText,
  Store,
  MapPin,
  Mail,
  Loader2,
} from 'lucide-react'

const CATEGORIES = [
  'all',
  'Retail Operations',
  'Finance & Billing',
  'Inventory & Procurement',
  'Security & Compliance',
]

const POLICY_CATEGORY_OPTIONS = CATEGORIES.filter((c) => c !== 'all')

const CATEGORY_CONFIG = {
  'Retail Operations': {
    icon: Store,
    accentBorder: 'border-l-purple-600',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-50 text-purple-700',
  },
  'Finance & Billing': {
    icon: FileText,
    accentBorder: 'border-l-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-700',
  },
  'Inventory & Procurement': {
    icon: Building2,
    accentBorder: 'border-l-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-50 text-blue-700',
  },
  'Security & Compliance': {
    icon: ShieldAlert,
    accentBorder: 'border-l-amber-600',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-50 text-amber-700',
  },
}

const EMPTY_FORM = {
  name: '',
  contactNumbers: '',
  whatsappNumber: '',
  facebookUrl: '',
  instagramUrl: '',
  registrationTaxId: '',
  businessAddress: '',
  supportEmail: '',
  logoFile: null,
}

export function CompanyPage() {
  const [activeTab, setActiveTab] = useState('details')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formHydrated, setFormHydrated] = useState(false)

  const {
    company,
    loading: companyLoading,
    mutating: companyMutating,
    error: companyError,
    updateCompany,
  } = useAdminCompany()

  const [policySearch, setPolicySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [policyForm, setPolicyForm] = useState({
    name: '',
    detail: '',
    category: 'Retail Operations',
    printOnSlip: false,
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState(null)
  const [viewPolicy, setViewPolicy] = useState(null)

  const {
    items: policies,
    loading: policiesLoading,
    mutating: policiesMutating,
    error: policiesError,
    createPolicy,
    updatePolicy,
    setPrintOnSlip,
    deletePolicy,
  } = useAdminPolicies({ limit: 100 })

  const { captureBaseline, isDirty } = useFormBaseline(policyDialogOpen)
  const slowCompany = useSlowLoadingHint(companyLoading)
  const slowPolicies = useSlowLoadingHint(policiesLoading)

  useEffect(() => {
    if (!policyDialogOpen) return
    captureBaseline(policyForm)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per open
  }, [policyDialogOpen, captureBaseline])

  useEffect(() => {
    if (companyLoading || formHydrated) return
    setForm({
      name: company.name || '',
      contactNumbers: company.contactNumbers || '',
      whatsappNumber: company.whatsappNumber || '',
      facebookUrl: company.facebookUrl || '',
      instagramUrl: company.instagramUrl || '',
      registrationTaxId: company.registrationTaxId || '',
      businessAddress: company.businessAddress || '',
      supportEmail: company.supportEmail || '',
      logoFile: null,
    })
    setFormHydrated(true)
  }, [company, companyLoading, formHydrated])

  async function handleSaveCompanyDetails(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toastError('Please enter the registered company name')
      return
    }
    if (!form.contactNumbers.trim()) {
      toastError('Please provide company contact numbers')
      return
    }

    if (form.whatsappNumber?.trim()) {
      const waErr = validatePhone(form.whatsappNumber, {
        required: false,
        fieldName: 'WhatsApp number',
      })
      if (waErr) {
        toastError(waErr)
        return
      }
    }

    if (form.facebookUrl?.trim()) {
      const fbErr = validateUrl(form.facebookUrl, {
        required: false,
        fieldName: 'Facebook URL',
      })
      if (fbErr) {
        toastError(fbErr)
        return
      }
    }

    if (form.instagramUrl?.trim()) {
      const igErr = validateUrl(form.instagramUrl, {
        required: false,
        fieldName: 'Instagram URL',
      })
      if (igErr) {
        toastError(igErr)
        return
      }
    }

    const result = await updateCompany({
      name: form.name,
      contactNumbers: form.contactNumbers,
      whatsappNumber: form.whatsappNumber,
      facebookUrl: form.facebookUrl,
      instagramUrl: form.instagramUrl,
      registrationTaxId: form.registrationTaxId,
      businessAddress: form.businessAddress,
      supportEmail: form.supportEmail,
      logo: form.logoFile || undefined,
    })

    if (!result.success) {
      toastError(result.error || 'Failed to save company details')
      return
    }

    setForm((prev) => ({ ...prev, logoFile: null }))
    toastSuccess('Company details saved successfully')
  }

  function handleOpenAddPolicy() {
    setEditingPolicy(null)
    setPolicyForm({
      name: '',
      detail: '',
      category: 'Retail Operations',
      printOnSlip: false,
    })
    setPolicyDialogOpen(true)
  }

  function handleOpenEditPolicy(policy) {
    setEditingPolicy(policy)
    setPolicyForm({
      name: policy.name,
      detail: policy.detail,
      category: policy.category || 'Retail Operations',
      printOnSlip: Boolean(policy.printOnSlip),
    })
    setPolicyDialogOpen(true)
  }

  function handlePromptDelete(policy) {
    setDeleteTargetPolicy(policy)
    setDeleteConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deleteTargetPolicy) return
    const result = await deletePolicy(deleteTargetPolicy.id)
    if (!result.success) {
      toastError(result.error || 'Failed to delete policy')
      return
    }
    toastSuccess(`Policy "${deleteTargetPolicy.name}" deleted successfully`)
    setDeleteTargetPolicy(null)
    setDeleteConfirmOpen(false)
  }

  async function handleTogglePrintOnSlip(policy, next) {
    const result = await setPrintOnSlip(policy.id, next)
    if (!result.success) {
      toastError(result.error || 'Failed to update print-on-slip setting')
      return
    }
    toastSuccess(
      next
        ? `"${policy.name}" will print on POS slips`
        : `"${policy.name}" removed from POS slips`,
    )
  }

  async function handleSubmitPolicy(e) {
    e.preventDefault()
    if (!policyForm.name.trim() || !policyForm.detail.trim()) {
      toastError('Please provide a policy name and description')
      return
    }

    if (editingPolicy) {
      const result = await updatePolicy(editingPolicy.id, policyForm)
      if (!result.success) {
        toastError(result.error || 'Failed to update policy')
        return
      }
      toastSuccess('Policy updated successfully')
    } else {
      const result = await createPolicy(policyForm)
      if (!result.success) {
        toastError(result.error || 'Failed to create policy')
        return
      }
      toastSuccess('New policy created and published')
    }

    setPolicyDialogOpen(false)
  }

  // Client-side filter for snappy search within loaded page
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory
      const q = policySearch.toLowerCase().trim()
      const displayId = referenceFromUuid(p.id, 'POL').toLowerCase()
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.detail?.toLowerCase().includes(q) ||
        displayId.includes(q) ||
        String(p.id).toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [policies, selectedCategory, policySearch])

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Corporate Identity & Governance"
          title="Company Details & Policies"
          description="Manage corporate entity profiles, social presence, tax registrations, and store policy handbooks"
          actions={
            <Button
              type="button"
              onClick={() => {
                setActiveTab('policies')
                handleOpenAddPolicy()
              }}
              disabled={policiesLoading}
              className="text-white font-semibold cursor-pointer shadow-xs"
              style={{
                background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
              }}
            >
              <Plus className="mr-1.5 size-4" />
              Add New Policy
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal delay={0.05}>
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="size-4" />
            Company Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'policies'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="size-4" />
            Policies & Governance ({policies.length})
          </button>
        </div>
      </MotionReveal>

      {activeTab === 'details' && (
        <MotionReveal delay={0.1}>
          {companyError ? (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {companyError}
            </p>
          ) : null}
          {slowCompany ? <SlowLoadingBanner show className="mb-3" /> : null}

          <SurfaceCard
            title="Company Information & Contact Channels"
            description="Official corporate registration details and customer service links displayed across invoices and receipts"
          >
            {companyLoading && !formHydrated ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading company details…
              </div>
            ) : (
              <form onSubmit={handleSaveCompanyDetails} className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start gap-4 pb-4 border-b border-slate-100">
                  <div className="w-full sm:flex-1">
                    <ImageUploadField
                      id="companyLogo"
                      label="Company logo"
                      optionalLabel="(optional)"
                      value={form.logoFile}
                      existingImageUrl={company.logoUrl || null}
                      onChange={(file) => setForm({ ...form, logoFile: file })}
                    />
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <Label htmlFor="companyName" className="text-xs font-semibold">
                      Registered Company Name *
                    </Label>
                    <Input
                      id="companyName"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. FluxOne Enterprise Solutions Ltd."
                      required
                    />
                    <p className="text-[11px] text-slate-400">
                      This name appears on wholesale supplier bills, tax invoices, and branch headers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contacts" className="text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="size-3.5 text-purple-600" />
                      Official Contact Numbers *
                    </Label>
                    <Input
                      id="contacts"
                      value={form.contactNumbers}
                      onChange={(e) =>
                        setForm({ ...form, contactNumbers: e.target.value })
                      }
                      placeholder="+92 51 2223344, +92 300 1234567"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp" className="text-xs font-semibold flex items-center gap-1.5">
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      WhatsApp Customer Care (Optional)
                    </Label>
                    <PhoneInput
                      id="whatsapp"
                      value={form.whatsappNumber}
                      onChange={(val) => setForm({ ...form, whatsappNumber: val })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="facebook" className="text-xs font-semibold flex items-center gap-1.5">
                      <Globe className="size-3.5 text-blue-600" />
                      Facebook Page Link (Optional URL)
                    </Label>
                    <Input
                      id="facebook"
                      type="url"
                      value={form.facebookUrl}
                      onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/your-business"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="instagram" className="text-xs font-semibold flex items-center gap-1.5">
                      <Share2 className="size-3.5 text-pink-600" />
                      Instagram Page Link (Optional URL)
                    </Label>
                    <Input
                      id="instagram"
                      type="url"
                      value={form.instagramUrl}
                      onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/your-business"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supportEmail" className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="size-3.5 text-slate-700" />
                      Support Email (Optional)
                    </Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={form.supportEmail}
                      onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                      placeholder="support@company.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxReg" className="text-xs font-semibold flex items-center gap-1.5">
                      <FileCheck className="size-3.5 text-slate-700" />
                      Registration / NTN / Tax ID (Optional)
                    </Label>
                    <Input
                      id="taxReg"
                      value={form.registrationTaxId}
                      onChange={(e) =>
                        setForm({ ...form, registrationTaxId: e.target.value })
                      }
                      placeholder="e.g. NTN-8923410-7 (FBR Registered)"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address" className="text-xs font-semibold flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-slate-700" />
                      Business Address (Optional)
                    </Label>
                    <Textarea
                      id="address"
                      rows={2}
                      value={form.businessAddress}
                      onChange={(e) =>
                        setForm({ ...form, businessAddress: e.target.value })
                      }
                      placeholder="Registered office / HQ address"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={companyMutating}
                    className="text-white font-semibold cursor-pointer gap-1.5 shadow-sm"
                    style={{
                      background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
                    }}
                  >
                    {companyMutating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {companyMutating ? 'Saving…' : 'Save Company Details'}
                  </Button>
                </div>
              </form>
            )}
          </SurfaceCard>
        </MotionReveal>
      )}

      {activeTab === 'policies' && (
        <MotionReveal delay={0.1}>
          {policiesError ? (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {policiesError}
            </p>
          ) : null}
          {slowPolicies ? <SlowLoadingBanner show className="mb-3" /> : null}

          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-2xs">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search policies by name, clause, ID, or category..."
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-border shadow-2xs">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat
                const count =
                  cat === 'all'
                    ? policies.length
                    : policies.filter((p) => p.category === cat).length

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-900 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat === 'all' ? 'All Policies' : cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-4">
              {policiesLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-12 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading policies…
                </div>
              ) : (
                <PoliciesTable
                  items={filteredPolicies}
                  loading={false}
                  mutating={policiesMutating}
                  categoryConfig={CATEGORY_CONFIG}
                  onView={setViewPolicy}
                  onEdit={handleOpenEditPolicy}
                  onDelete={handlePromptDelete}
                  onTogglePrintOnSlip={handleTogglePrintOnSlip}
                />
              )}
            </div>
          </div>
        </MotionReveal>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setDeleteTargetPolicy(null)
        }}
        title="Delete Corporate Policy"
        description={
          deleteTargetPolicy ? (
            <>
              Are you sure you want to delete &quot;{deleteTargetPolicy.name}&quot; (
              {referenceFromUuid(deleteTargetPolicy.id, 'POL')})?
            </>
          ) : null
        }
        warning="This action cannot be undone and will immediately unpublish this policy across all branch portals."
        confirmLabel="Delete Policy"
        variant="destructive"
        loading={policiesMutating}
        onConfirm={handleConfirmDelete}
      />

      <Dialog open={Boolean(viewPolicy)} onOpenChange={(open) => !open && setViewPolicy(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewPolicy?.name || 'Policy details'}</DialogTitle>
            <DialogDescription>
              {viewPolicy
                ? `${referenceFromUuid(viewPolicy.id, 'POL')} · ${viewPolicy.category || 'Uncategorized'}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700">
            <p className="whitespace-pre-line">{viewPolicy?.detail}</p>
          </div>
          {viewPolicy ? (
            <p className="text-xs text-slate-500">
              Print on slip:{' '}
              <strong className={viewPolicy.printOnSlip ? 'text-emerald-700' : 'text-slate-600'}>
                {viewPolicy.printOnSlip ? 'On' : 'Off'}
              </strong>
            </p>
          ) : null}
          <DialogFooter>
            <DialogCancelButton />
            <Button
              type="button"
              className="text-white font-semibold"
              style={{ background: BRAND.purple }}
              onClick={() => {
                const policy = viewPolicy
                setViewPolicy(null)
                if (policy) handleOpenEditPolicy(policy)
              }}
            >
              Edit Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        dirty={isDirty(policyForm)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit Policy' : 'Add New Corporate Policy'}
            </DialogTitle>
            <DialogDescription>
              Define customer return policies, wholesale terms, or branch compliance guidelines
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPolicy} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="polName" className="text-xs font-semibold">
                Policy Name *
              </Label>
              <Input
                id="polName"
                placeholder="e.g. 7-Day Return & Replacement Policy"
                value={policyForm.name}
                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="polCat" className="text-xs font-semibold">
                Category
              </Label>
              <NativeSelect
                id="polCat"
                value={policyForm.category}
                onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
              >
                {POLICY_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="polDetail" className="text-xs font-semibold">
                Policy Details & Rules *
              </Label>
              <Textarea
                id="polDetail"
                rows={4}
                placeholder="Describe the conditions, timeframe, receipts required, and branch handling procedures..."
                value={policyForm.detail}
                onChange={(e) => setPolicyForm({ ...policyForm, detail: e.target.value })}
                required
              />
            </div>

            <label
              htmlFor="polPrintOnSlip"
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
            >
              <Checkbox
                id="polPrintOnSlip"
                checked={Boolean(policyForm.printOnSlip)}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, printOnSlip: e.target.checked })
                }
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  Print on slip / invoice
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  When enabled, this policy syncs to POS and prints on the customer receipt after a sale.
                </span>
              </span>
            </label>

            <DialogFooter className="pt-2">
              <DialogCancelButton disabled={policiesMutating} />
              <Button
                type="submit"
                disabled={policiesMutating}
                className="text-white font-semibold"
                style={{ background: BRAND.purple }}
              >
                {policiesMutating
                  ? 'Saving…'
                  : editingPolicy
                    ? 'Update Policy'
                    : 'Save & Publish Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CompanyPage
