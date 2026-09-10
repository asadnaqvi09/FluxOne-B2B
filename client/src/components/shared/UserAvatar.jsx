import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BRAND } from '@/lib/constants'
import { getInitials } from '@/lib/nav'
import { cn } from '@/lib/utils'

// Profile avatar — image when available, otherwise initials (fallback on load error)
export function UserAvatar({
  name = '',
  loginId = '',
  imageUrl = null,
  className,
  fallbackClassName,
}) {
  const initials = getInitials(name, loginId)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  return (
    <Avatar className={cn('shrink-0', className)}>
      {showImage ? (
        <AvatarImage
          src={imageUrl}
          alt={name || 'Profile'}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <AvatarFallback
          className={cn('text-xs font-bold text-white', fallbackClassName)}
          style={{ background: BRAND.purple }}
        >
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
