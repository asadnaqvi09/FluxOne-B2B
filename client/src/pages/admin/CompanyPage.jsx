import { useState, useMemo } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  sanitizePhoneInput,
  validatePhone,
  validateUrl,
} from '@/lib/validation/formValidators'
import {
  INITIAL_COMPANY_DETAILS,
  INITIAL_POLICIES_DATA,
} from '@/data/adminCompanyMock'
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
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  FileText,
  Store,
} from 'lucide-react'

const CATEGORIES = [
  'all',
  'Retail Operations',
  'Finance & Billing',
  'Inventory & Procurement',
  'Security & Compliance',
]

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

export function CompanyPage() {
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'policies'

  // Company Details Form State
  const [companyDetails, setCompanyDetails] = useState(INITIAL_COMPANY_DETAILS)

  // Policies State
  const [policies, setPolicies] = useState(INITIAL_POLICIES_DATA)
  const [policySearch, setPolicySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [policyForm, setPolicyForm] = useState({ name: '', detail: '', category: 'Retail Operations' })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState(null)

  // Save Company Details
  function handleSaveCompanyDetails(e) {
    e.preventDefault()
    if (!companyDetails.name.trim()) {
      toastError('Please enter the registered company name')
      return
    }

    if (!companyDetails.contactNumbers.trim()) {
      toastError('Please provide company contact numbers')
      return
    }

    // Validate WhatsApp number if provided
    if (companyDetails.whatsappNumber?.trim()) {
      const waErr = validatePhone(companyDetails.whatsappNumber, {
        required: false,
        fieldName: 'WhatsApp number',
      })
      if (waErr) {
        toastError(waErr)
        return
      }
    }

    // Validate Social URLs
    if (companyDetails.facebookUrl?.trim()) {
      const fbErr = validateUrl(companyDetails.facebookUrl, {
        required: false,
        fieldName: 'Facebook URL',
      })
      if (fbErr) {
        toastError(fbErr)
        return
      }
    }

    if (companyDetails.instagramUrl?.trim()) {
      const igErr = validateUrl(companyDetails.instagramUrl, {
        required: false,
        fieldName: 'Instagram URL',
      })
      if (igErr) {
        toastError(igErr)
        return
      }
    }

    toastSuccess('Company details and registration credentials saved successfully!')
  }

  // Open Add Policy Modal
  function handleOpenAddPolicy() {
    setEditingPolicy(null)
    setPolicyForm({ name: '', detail: '', category: 'Retail Operations' })
    setPolicyDialogOpen(true)
  }

  // Open Edit Policy Modal
  function handleOpenEditPolicy(policy) {
    setEditingPolicy(policy)
    setPolicyForm({
      name: policy.name,
      detail: policy.detail,
      category: policy.category || 'Retail Operations',
    })
    setPolicyDialogOpen(true)
  }

  // Trigger Delete Confirmation Prompt
  function handlePromptDelete(policy) {
    setDeleteTargetPolicy(policy)
    setDeleteConfirmOpen(true)
  }

  // Confirm Delete
  function handleConfirmDelete() {
    if (!deleteTargetPolicy) return
    setPolicies((prev) => prev.filter((p) => p.id !== deleteTargetPolicy.id))
    toastSuccess(`Policy "${deleteTargetPolicy.name}" deleted successfully`)
    setDeleteTargetPolicy(null)
    setDeleteConfirmOpen(false)
  }

  // Submit Policy Form
  function handleSubmitPolicy(e) {
    e.preventDefault()
    if (!policyForm.name.trim() || !policyForm.detail.trim()) {
      toastError('Please provide a policy name and description')
      return
    }

    if (editingPolicy) {
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === editingPolicy.id
            ? {
                ...p,
                name: policyForm.name.trim(),
                detail: policyForm.detail.trim(),
                category: policyForm.category,
              }
            : p,
        ),
      )
      toastSuccess('Policy updated successfully')
    } else {
      const now = new Date()
      const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      const newPolicy = {
        id: `POL-0${policies.length + 1}`,
        name: policyForm.name.trim(),
        detail: policyForm.detail.trim(),
        category: policyForm.category,
        createdAt: formattedDate,
        isActive: true,
      }
      setPolicies((prev) => [newPolicy, ...prev])
      toastSuccess('New policy created and published to all branches')
    }

    setPolicyDialogOpen(false)
  }

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory
      const q = policySearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.detail.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
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
        />
      </MotionHeader>

      {/* Main Tab Toggle */}
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

      {/* TAB 1: COMPANY DETAILS */}
      {activeTab === 'details' && (
        <MotionReveal delay={0.1}>
          <SurfaceCard
            title="Company Information & Contact Channels"
            description="Official corporate registration details and customer service links displayed across invoices and receipts"
          >
            <form onSubmit={handleSaveCompanyDetails} className="space-y-5">
              {/* Logo & Name Section */}
              <div className="flex flex-col sm:flex-row items-start gap-4 pb-4 border-b border-slate-100">
                <img
                  src={companyDetails.logoUrl}
                  alt="Company Logo"
                  className="size-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="companyName" className="text-xs font-semibold">
                    Registered Company Name *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyDetails.name}
                    onChange={(e) =>
                      setCompanyDetails({ ...companyDetails, name: e.target.value })
                    }
                    placeholder="e.g. FluxOne Enterprise Solutions Ltd."
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    This name appears on wholesale supplier bills, tax invoices, and branch headers.
                  </p>
                </div>
              </div>

              {/* Contacts & Channels Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contacts" className="text-xs font-semibold flex items-center gap-1.5">
                    <Phone className="size-3.5 text-purple-600" />
                    Official Contact Numbers *
                  </Label>
                  <Input
                    id="contacts"
                    value={companyDetails.contactNumbers}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        contactNumbers: e.target.value,
                      })
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
                  <Input
                    id="whatsapp"
                    value={companyDetails.whatsappNumber}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        whatsappNumber: sanitizePhoneInput(e.target.value),
                      })
                    }
                    placeholder="03001234567"
                    maxLength={13}
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
                    value={companyDetails.facebookUrl}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        facebookUrl: e.target.value,
                      })
                    }
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
                    value={companyDetails.instagramUrl}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        instagramUrl: e.target.value,
                      })
                    }
                    placeholder="https://instagram.com/your-business"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="taxReg" className="text-xs font-semibold flex items-center gap-1.5">
                    <FileCheck className="size-3.5 text-slate-700" />
                    Company Registration / NTN / Tax Identification Number (Optional)
                  </Label>
                  <Input
                    id="taxReg"
                    value={companyDetails.registrationTaxId}
                    onChange={(e) =>
                      setCompanyDetails({
                        ...companyDetails,
                        registrationTaxId: e.target.value,
                      })
                    }
                    placeholder="e.g. NTN-8923410-7 (FBR Registered)"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  className="text-white font-semibold cursor-pointer gap-1.5 shadow-sm"
                  style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
                >
                  <Save className="size-4" />
                  Save Company Details
                </Button>
              </div>
            </form>
          </SurfaceCard>
        </MotionReveal>
      )}

      {/* TAB 2: POLICIES (EXECUTIVE FULL-WIDTH DOCUMENT CARDS) */}
      {activeTab === 'policies' && (
        <MotionReveal delay={0.1}>
          <div className="space-y-5">
            {/* Action & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search policies by name, clause, ID, or category..."
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleOpenAddPolicy}
                  className="text-white font-semibold cursor-pointer shadow-xs"
                  style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
                >
                  <Plus className="mr-1.5 size-4" />
                  Add New Policy
                </Button>
              </div>
            </div>

            {/* Category Filter Pills */}
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

            {/* List of Policies (Full-Width Document Cards) */}
            <div className="space-y-4">
              {filteredPolicies.length === 0 ? (
                <div className="rounded-2xl border border-border bg-white p-12 text-center text-slate-400">
                  <FileText className="mx-auto size-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No corporate policies found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Try searching with a different keyword or create a new policy.</p>
                </div>
              ) : (
                filteredPolicies.map((p) => {
                  const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG['Retail Operations']
                  const CategoryIcon = cfg.icon

                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-2xs hover:shadow-sm border-l-4 ${cfg.accentBorder} transition-all duration-200 space-y-4`}
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} border border-slate-200/60`}>
                            <CategoryIcon className="size-4" />
                          </div>

                          <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-100 whitespace-nowrap">
                            {p.id}
                          </span>

                          <Badge variant="outline" className={`text-xs font-semibold ${cfg.badgeClass}`}>
                            {p.category}
                          </Badge>

                          <h4 className="font-bold text-slate-900 text-base sm:text-lg">
                            {p.name}
                          </h4>
                        </div>

                        {/* Actions & Timestamp */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-1">
                            {p.createdAt}
                          </span>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditPolicy(p)}
                            className="h-8 px-3 text-xs font-semibold cursor-pointer border-purple-200 text-purple-900 hover:bg-purple-50"
                          >
                            <Edit2 className="mr-1.5 size-3.5" />
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromptDelete(p)}
                            className="h-8 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="mr-1.5 size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Policy Detail Clause Box */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <p className="whitespace-pre-line font-normal">{p.detail}</p>
                      </div>

                      {/* Footer Policy Governance Status */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          Active Governance Policy · Enforced across all branches
                        </span>
                        <span className="font-medium text-slate-400">
                          Corporate Protocol
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </MotionReveal>
      )}

      {/* Delete Policy Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-purple-950 flex items-center gap-2">
              <Trash2 className="size-5 text-purple-700" />
              Delete Corporate Policy
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              Are you sure you want to delete <strong>&quot;{deleteTargetPolicy?.name}&quot;</strong> ({deleteTargetPolicy?.id})?
              <br />
              This action cannot be undone and will immediately unpublish this policy across all branch portals.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="text-white font-semibold cursor-pointer shadow-sm"
              style={{ background: BRAND.purple }}
            >
              Delete Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Policy Dialog */}
      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
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
              <Input
                id="polCat"
                placeholder="e.g. Retail Operations / Returns"
                value={policyForm.category}
                onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
              />
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPolicyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white font-semibold"
                style={{ background: BRAND.purple }}
              >
                {editingPolicy ? 'Update Policy' : 'Save & Publish Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CompanyPage
