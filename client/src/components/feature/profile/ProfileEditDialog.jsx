import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { BRAND } from '@/lib/constants'
import { useFormBaseline } from '@/hooks/useFormBaseline'

/**
 * Shared edit profile modal (Admin / BM / IM / etc.).
 * View card never shows password — only this dialog does.
 * Fields: Photo, Name, User ID or Email, Password, Confirm Password.
 */
export function ProfileEditDialog({
  open,
  onOpenChange,
  initialName = '',
  initialLoginId = '',
  initialImageUrl = null,
  onSubmit,
  loading = false,
}) {
  const [name, setName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [image, setImage] = useState(null)
  const [error, setError] = useState(null)
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    const snapshot = {
      name: initialName || '',
      loginId: initialLoginId || '',
      password: '',
      confirmPassword: '',
      image: null,
    }
    setName(snapshot.name)
    setLoginId(snapshot.loginId)
    setPassword('')
    setConfirmPassword('')
    setImage(null)
    setError(null)
    captureBaseline(snapshot)
  }, [open, initialName, initialLoginId, captureBaseline])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const nextName = name.trim()
    const nextId = loginId.trim()
    const nextPassword = password
    const nextConfirm = confirmPassword

    if (!nextName) {
      setError('Name is required')
      return
    }
    if (!nextId || nextId.length < 3) {
      setError('User ID or Email must be at least 3 characters')
      return
    }

    const changingPassword = Boolean(nextPassword || nextConfirm)
    if (changingPassword) {
      if (!nextPassword || nextPassword.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
      if (nextPassword.length > 72) {
        setError('Password must be at most 72 characters')
        return
      }
      if (nextPassword !== nextConfirm) {
        setError('Password and Confirm Password do not match')
        return
      }
    }

    // Build payload — image File triggers multipart on the API layer
    const payload = { name: nextName, id: nextId }
    if (changingPassword) payload.password = nextPassword
    if (image instanceof File && image.size > 0) payload.image = image

    const result = await onSubmit?.(payload)
    if (result && result.success === false) {
      setError(result.error || 'Update failed')
      return
    }
    onOpenChange?.(false)
  }

  const dirty = isDirty({ name, loginId, password, confirmPassword, image })

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your photo, display name, and login ID. Optionally set a new password (leave blank
            to keep the current one). Role cannot be changed here.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Upload new photo or replace existing one */}
          <ImageUploadField
            id="profile-image"
            label="Profile photo"
            optionalLabel="(optional)"
            value={image}
            existingImageUrl={initialImageUrl}
            onChange={setImage}
          />

          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-login-id">User ID or Email</Label>
            <Input
              id="profile-login-id"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Login ID or email"
              autoComplete="username"
            />
            <p className="text-xs text-slate-500">Used with your password at login.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-password">Password</Label>
            <Input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-confirm-password">Confirm Password</Label>
            <Input
              id="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-500">
              After a temporary password from email, set your own password here.
            </p>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogCancelButton disabled={loading} className="w-full sm:w-auto" />
            <Button
              type="submit"
              disabled={loading}
              style={{ background: BRAND.purple }}
              className="w-full text-white hover:opacity-90 sm:w-auto"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
