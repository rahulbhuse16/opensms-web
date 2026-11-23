import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  labelledBy: string
  onClose: () => void
  children: ReactNode
  className?: string
  layer?: 'default' | 'top'
}

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Dialog({ labelledBy, onClose, children, className = 'max-w-lg', layer = 'default' }: Props) {
  const layerClass = layer === 'top' ? 'z-50' : 'z-40'
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => element.getAttribute('aria-hidden') !== 'true')
    focusable()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
      if (event.key === 'Tab') {
        const items = focusable()
        if (items.length === 0) {
          event.preventDefault()
          dialog?.focus()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <div className={`fixed inset-0 ${layerClass} flex items-center justify-center overflow-y-auto bg-navy-950/60 p-4`}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} className={`my-auto w-full rounded-lg border border-line bg-white p-5 shadow-xl focus:outline-none sm:p-6 ${className}`}>
        {children}
      </section>
    </div>
  )
}
