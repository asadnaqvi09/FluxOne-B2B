import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom' // ⚠ LoginForm jahan se import karta hai wahi rakho
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'

const LOGIN_PATH = '/login' 

// Sends a POST request to /api/auth/<path> and returns the response data.
// Throws an Error with the server's message if the request fails.
async function callAuth(path, body) {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      (typeof json?.error === 'string' ? json.error : json?.error?.message) ||
      json?.message ||
      'Something went wrong. Please try again.'
    throw new Error(message)
  }
  return json?.data ?? json
}

export function ForgotPasswordForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState('request') // request | verify | reset | done
  const [userId, setUserId] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Resend timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Redirect to login after success
  useEffect(() => {
    if (step !== 'done') return
    const t = setTimeout(() => navigate(LOGIN_PATH), 2500)
    return () => clearTimeout(t)
  }, [step, navigate])

  async function run(task) {
    setLoading(true)
    setError('')
    try {
      await task()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function sendOtp(e) {
    e?.preventDefault()
    if (!userId.trim()) return setError('Please enter your User ID')
    run(async () => {
      const data = await callAuth('forgot-password', { id: userId.trim() })
      setInfo(data?.message || 'An OTP has been sent to your registered email.')
      setOtp('')
      setCooldown(60)
      setStep('verify')
    })
  }

  function verifyOtp(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP')
    run(async () => {
      const data = await callAuth('verify-otp', { id: userId.trim(), otp })
      setResetToken(data.resetToken)
      setInfo('')
      setStep('reset')
    })
  }

  function submitReset(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    run(async () => {
      await callAuth('reset-password', { resetToken, newPassword, confirmPassword })
      setStep('done')
    })
  }

  return (
    <div className="space-y-4">
      {step === 'request' && (
        <form onSubmit={sendOtp} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your User ID and we will email you a verification code.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="fp-userid">User ID</Label>
            <Input
              id="fp-userid"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white"
            style={{ background: BRAND.purple }}
          >
            {loading ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={verifyOtp} className="space-y-4">
          {info ? <p className="text-sm text-slate-600">{info}</p> : null}
          <div className="space-y-1.5">
            <Label htmlFor="fp-otp">6-digit OTP</Label>
            <Input
              id="fp-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white"
            style={{ background: BRAND.purple }}
          >
            {loading ? 'Verifying…' : 'Verify OTP'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="hover:underline"
              onClick={() => {
                setStep('request')
                setError('')
              }}
            >
              Change User ID
            </button>
            <button
              type="button"
              className="font-medium hover:underline disabled:opacity-50"
              disabled={cooldown > 0 || loading}
              onClick={sendOtp}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={submitReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-new">New Password</Label>
            <Input
              id="fp-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fp-confirm">Confirm Password</Label>
            <Input
              id="fp-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white"
            style={{ background: BRAND.purple }}
          >
            {loading ? 'Saving…' : 'Reset Password'}
          </Button>
        </form>
      )}

      {step === 'done' && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Your password has been reset successfully. Redirecting to login…
        </p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {step !== 'done' && (
        <div className="text-center text-sm">
          <Link to={LOGIN_PATH} className="font-medium hover:underline">
            Back to login
          </Link>
        </div>
      )}
    </div>
  )
}