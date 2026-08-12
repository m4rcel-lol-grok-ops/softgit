import { SITE_NAME } from '@/config'
import { cn } from '@/utils/cn'

/** Blue verified check shown after a display name when the user is admin-verified. */
export function VerifiedBadge({
  className,
  size = 16,
}: {
  className?: string
  size?: number
}) {
  const title = `This user has been verified by ${SITE_NAME} administration.`
  return (
    <span
      className={cn(
        'inline-flex items-center align-middle text-[var(--color-accent-fg)]',
        className
      )}
      title={title}
      aria-label={title}
      role="img"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9.585.52a2.678 2.678 0 00-3.17 0l-.865.66a1.178 1.178 0 01-.695.248H3.172a1.678 1.678 0 00-1.679 1.678v1.882c0 .246-.086.485-.248.695l-.66.865a2.678 2.678 0 000 3.17l.66.865c.162.21.248.45.248.695v1.882c0 .927.751 1.678 1.679 1.678h1.882c.246 0 .485.086.695.248l.865.66a2.678 2.678 0 003.17 0l.865-.66a1.178 1.178 0 01.695-.248h1.882a1.678 1.678 0 001.679-1.678V9.664c0-.246.086-.485.248-.695l.66-.865a2.678 2.678 0 000-3.17l-.66-.865a1.178 1.178 0 01-.248-.695V3.106a1.678 1.678 0 00-1.679-1.679H9.664a1.178 1.178 0 01-.695-.248L9.585.52zm-2.207 8.853a.75.75 0 001.06 0l2.5-2.5a.75.75 0 00-1.06-1.06L7.85 7.78 6.78 6.72a.75.75 0 00-1.06 1.06l1.658 1.593z"
        />
      </svg>
    </span>
  )
}

/** Display name + optional verified badge. */
export function UserDisplayName({
  name,
  verified,
  className,
  badgeSize = 16,
}: {
  name: string
  verified?: boolean
  className?: string
  badgeSize?: number
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{name}</span>
      {verified && <VerifiedBadge size={badgeSize} />}
    </span>
  )
}
