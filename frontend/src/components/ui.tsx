import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

export function Button({
  className,
  variant = 'default',
  size = 'md',
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}) {
  const variants = {
    default:
      'bg-[var(--color-btn-bg)] border border-[var(--color-btn-border)] text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-subtle)]',
    primary:
      'bg-[var(--color-btn-primary-bg)] border border-transparent text-[var(--color-btn-primary-text)] hover:bg-[var(--color-btn-primary-hover)]',
    danger:
      'bg-[var(--color-danger-emphasis)] border border-transparent text-white hover:opacity-90',
    ghost: 'bg-transparent border border-transparent text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-subtle)]',
    outline:
      'bg-transparent border border-[var(--color-border-default)] text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-subtle)]',
  }
  const sizes = {
    sm: 'h-7 px-2 text-xs rounded-md',
    md: 'h-8 px-3 text-sm rounded-md',
    lg: 'h-10 px-4 text-sm rounded-md',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-8 px-3 text-sm rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-accent-emphasis)] focus:ring-1 focus:ring-[var(--color-accent-emphasis)]',
          className
        )}
        {...props}
      />
    )
  }
)

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-accent-emphasis)] focus:ring-1 focus:ring-[var(--color-accent-emphasis)]',
        className
      )}
      {...props}
    />
  )
}

export function Avatar({
  src,
  name,
  size = 24,
  className,
}: {
  src?: string
  name: string
  size?: number
  className?: string
}) {
  const initials = name.slice(0, 2).toUpperCase()
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white bg-[var(--color-accent-emphasis)]',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initials}
    </div>
  )
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'danger' | 'attention' | 'counter'
  className?: string
}) {
  const variants = {
    default: 'bg-[var(--color-canvas-subtle)] text-[var(--color-fg-muted)] border-[var(--color-border-default)]',
    success: 'bg-[var(--color-success-emphasis)]/15 text-[var(--color-success-fg)] border-transparent',
    danger: 'bg-[var(--color-danger-emphasis)]/15 text-[var(--color-danger-fg)] border-transparent',
    attention: 'bg-[var(--color-attention-fg)]/15 text-[var(--color-attention-fg)] border-transparent',
    counter: 'bg-[var(--color-counter-bg)] text-[var(--color-fg-muted)] border-transparent',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-[var(--color-fg-muted)]', className)} />
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <h3 className="text-lg font-semibold text-[var(--color-fg-default)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-fg-muted)] max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <h3 className="text-lg font-semibold text-[var(--color-danger-fg)] mb-1">Something went wrong</h3>
      <p className="text-sm text-[var(--color-fg-muted)] max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-semibold text-[var(--color-fg-default)] mb-1', className)}>
      {children}
    </label>
  )
}
