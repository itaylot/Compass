'use client'

import type { ComponentProps, ReactNode, Ref } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ButtonSize, ButtonVariant } from '../button/index.ts'
import { Button } from '../button/index.ts'
import { Loader } from '../loader/index.ts'
import { cx } from '../utils/cx.ts'

/**
 * PromptBox — the generation prompt surface for AI apps: one rounded panel that
 * holds the prompt textarea, the settings toolbar the app drops in (model
 * select, aspect ratio, …), and the submit cluster. Modeled on the anatomy of
 * the fnf-web marketing prompt composition (prompt area + settings + submit),
 * generalized and dependency-free (no mention/editor system).
 *
 * `Root` owns the shared state — prompt value (controlled via `value` +
 * `onValueChange`, or uncontrolled via `defaultValue`), `maxLength`, `disabled`,
 * `submitting`, and `onSubmit` — and broadcasts it to the parts via context.
 * `Input` auto-grows with its content, submits on Enter and inserts a newline
 * on Shift+Enter. `Submit` is a wired quanta Button: disabled while the prompt
 * is empty (or the box is disabled/submitting) and swaps in a Loader while
 * `submitting`.
 *
 *   <PromptBox.Root value={prompt} onValueChange={setPrompt} maxLength={1000}
 *     onSubmit={generate} submitting={run.pending}>
 *     <PromptBox.Attachments>{referenceChips}</PromptBox.Attachments>
 *     <PromptBox.Input placeholder="Describe the shot you want" />
 *     <PromptBox.Toolbar>
 *       {modelSelect}
 *       {aspectRatioSelect}
 *       <PromptBox.Actions>
 *         {costHint}
 *         <PromptBox.Counter />
 *         <PromptBox.Submit />
 *       </PromptBox.Actions>
 *     </PromptBox.Toolbar>
 *   </PromptBox.Root>
 */

/* ── Shared state (owned by Root, consumed by the parts) ───────────────────── */
type PromptBoxContextValue = {
  value: string
  setValue: (next: string) => void
  maxLength: number | undefined
  disabled: boolean
  submitting: boolean
  /** True when a non-empty prompt can be submitted right now. */
  canSubmit: boolean
  /** Fire `onSubmit` with the current prompt (no-op while it can't submit). */
  submit: () => void
}
const PromptBoxContext = createContext<PromptBoxContextValue | null>(null)

function usePromptBoxContext(part: string): PromptBoxContextValue {
  const ctx = useContext(PromptBoxContext)
  if (!ctx) throw new Error(`${part} must be used within <PromptBox.Root>`)
  return ctx
}

/** Local ref merger — same pattern as modal/slider/cmdk. */
function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function')
        ref(node)
      else if (ref)
        (ref as { current: T | null }).current = node
    }
  }
}

/** Cached `field-sizing: content` support probe (SSR-safe: false on the server). */
let fieldSizingSupport: boolean | undefined
function supportsFieldSizing(): boolean {
  fieldSizingSupport ??= typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('field-sizing', 'content')
  return fieldSizingSupport
}

/* ── Root ──────────────────────────────────────────────────────────────────── */
export type PromptBoxRootProps = Omit<ComponentProps<'div'>, 'onSubmit' | 'defaultValue'> & {
  /** Prompt text (controlled — pair with `onValueChange`). */
  value?: string
  /** Initial prompt text when uncontrolled. */
  defaultValue?: string
  /** Fires with the next prompt text on every edit (clamped to `maxLength`). */
  onValueChange?: (value: string) => void
  /** Hard cap on prompt length — Input enforces it, Counter displays it. */
  maxLength?: number
  /** Disable the whole surface (input + submit). */
  disabled?: boolean
  /** A generation is in flight: the input locks and Submit shows a Loader. */
  submitting?: boolean
  /** Fires with the current prompt on Enter / Submit click. Never fires empty. */
  onSubmit?: (value: string) => void
}
function Root({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  maxLength,
  disabled = false,
  submitting = false,
  onSubmit,
  className,
  children,
  ...props
}: PromptBoxRootProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = valueProp != null
  const value = isControlled ? valueProp : internalValue

  const setValue = useCallback((next: string) => {
    const clamped = maxLength != null ? next.slice(0, maxLength) : next
    if (!isControlled) setInternalValue(clamped)
    onValueChange?.(clamped)
  }, [isControlled, maxLength, onValueChange])

  const canSubmit = !disabled && !submitting && value.trim().length > 0
  const submit = useCallback(() => {
    if (disabled || submitting || value.trim().length === 0) return
    onSubmit?.(value)
  }, [disabled, submitting, value, onSubmit])

  const context = useMemo<PromptBoxContextValue>(
    () => ({ value, setValue, maxLength, disabled, submitting, canSubmit, submit }),
    [value, setValue, maxLength, disabled, submitting, canSubmit, submit],
  )

  return (
    <PromptBoxContext.Provider value={context}>
      <div className={cx('q-prompt-box', className)} {...props}>
        {children}
      </div>
    </PromptBoxContext.Provider>
  )
}

/* ── Input: the auto-growing prompt textarea ───────────────────────────────── */
export type PromptBoxInputProps = Omit<ComponentProps<'textarea'>, 'value' | 'defaultValue' | 'maxLength' | 'children'>
/**
 * The prompt `<textarea>`. Borderless — the Root panel is the field chrome.
 * Auto-grows with its content: `field-sizing: content` where the engine has it,
 * a scrollHeight fallback elsewhere. Enter submits, Shift+Enter inserts a
 * newline; locked while the box is `disabled` or `submitting`.
 */
function Input({ className, disabled, rows = 1, onChange, onKeyDown, ref, ...props }: PromptBoxInputProps) {
  const ctx = usePromptBoxContext('PromptBox.Input')
  const innerRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow fallback: sync the element height to its content after every
  // value change when the engine lacks `field-sizing: content`.
  useEffect(() => {
    const el = innerRef.current
    if (el == null || supportsFieldSizing()) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ctx.value])

  return (
    <textarea
      ref={mergeRefs(innerRef, ref)}
      rows={rows}
      value={ctx.value}
      maxLength={ctx.maxLength}
      disabled={disabled || ctx.disabled || ctx.submitting}
      className={cx('q-prompt-box-input', className)}
      onChange={(event) => {
        onChange?.(event)
        if (!event.defaultPrevented) ctx.setValue(event.target.value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault()
          ctx.submit()
        }
      }}
      {...props}
    />
  )
}

/* ── Structural rows (pure passthrough parts) ──────────────────────────────── */
export type PromptBoxToolbarProps = ComponentProps<'div'>
/** Bottom settings row — drop model selects, ratio chips, etc. in here. */
function Toolbar({ className, ...props }: PromptBoxToolbarProps) {
  return <div className={cx('q-prompt-box-toolbar', className)} {...props} />
}

export type PromptBoxActionsProps = ComponentProps<'div'>
/** Right-aligned cluster inside the toolbar row: cost text, counter, submit. */
function Actions({ className, ...props }: PromptBoxActionsProps) {
  return <div className={cx('q-prompt-box-actions', className)} {...props} />
}

export type PromptBoxAttachmentsProps = ComponentProps<'div'>
/** Strip above the toolbar for upload / reference chips. */
function Attachments({ className, ...props }: PromptBoxAttachmentsProps) {
  return <div className={cx('q-prompt-box-attachments', className)} {...props} />
}

/* ── Counter: prompt length readout ────────────────────────────────────────── */
export type PromptBoxCounterProps = Omit<ComponentProps<'span'>, 'children'>
/** Character counter — `length / maxLength` (just the length when no cap). */
function Counter({ className, ...props }: PromptBoxCounterProps) {
  const ctx = usePromptBoxContext('PromptBox.Counter')
  return (
    <span className={cx('q-prompt-box-counter', className)} {...props}>
      {ctx.maxLength != null ? `${ctx.value.length} / ${ctx.maxLength}` : `${ctx.value.length}`}
    </span>
  )
}

/* ── Submit: the wired generate button ─────────────────────────────────────── */
export type PromptBoxSubmitProps = Omit<ComponentProps<'button'>, 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** The label — defaults to "Generate". */
  children?: ReactNode
  /** Leading slot forwarded to the Button (replaced by a Loader while submitting). */
  start?: ReactNode
  /** Trailing slot forwarded to the Button. */
  end?: ReactNode
}
/**
 * The submit Button, wired to the Root: disabled while the prompt is empty or
 * the box is disabled/submitting, shows a Loader while `submitting`, and fires
 * the Root's `onSubmit` on click. All Button props remain overridable.
 */
function Submit({
  variant = 'primary',
  size = 'sm',
  disabled = false,
  onClick,
  children = 'Generate',
  start,
  end,
  ...props
}: PromptBoxSubmitProps) {
  const ctx = usePromptBoxContext('PromptBox.Submit')
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || !ctx.canSubmit}
      start={ctx.submitting ? <Loader size="xs" color="neutral" aria-label="Generating" /> : start}
      end={end}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) ctx.submit()
      }}
      {...props}
    >
      {children}
    </Button>
  )
}

export const PromptBox = {
  Root,
  Input,
  Toolbar,
  Actions,
  Attachments,
  Counter,
  Submit,
}
