import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PromptBox } from './index.ts'

/** The standard composition under test: input + toolbar + actions cluster. */
function Composition(props: Parameters<typeof PromptBox.Root>[0]) {
  return (
    <PromptBox.Root {...props}>
      <PromptBox.Attachments data-testid="attachments" />
      <PromptBox.Input aria-label="Prompt" placeholder="Describe your idea" />
      <PromptBox.Toolbar>
        <PromptBox.Actions>
          <PromptBox.Counter />
          <PromptBox.Submit />
        </PromptBox.Actions>
      </PromptBox.Toolbar>
    </PromptBox.Root>
  )
}

describe('<PromptBox>', () => {
  it('renders the panel with input, attachments, toolbar, actions and submit', () => {
    const { container } = render(<Composition />)
    const input = screen.getByLabelText('Prompt')
    expect(input.tagName).toBe('TEXTAREA')
    expect(input).toHaveClass('q-prompt-box-input')
    expect(input).toHaveAttribute('placeholder', 'Describe your idea')
    expect(container.querySelector('.q-prompt-box')).toBeInTheDocument()
    expect(screen.getByTestId('attachments')).toHaveClass('q-prompt-box-attachments')
    expect(container.querySelector('.q-prompt-box-toolbar')).toBeInTheDocument()
    expect(container.querySelector('.q-prompt-box-actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate' })).toHaveClass('q-button', 'q-button-primary', 'q-button-sm')
  })

  it('updates the value while typing and notifies onValueChange', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Composition onValueChange={onValueChange} />)
    const input = screen.getByLabelText('Prompt')
    await user.type(input, 'Hi')
    expect(input).toHaveValue('Hi')
    expect(onValueChange).toHaveBeenLastCalledWith('Hi')
  })

  it('submits once on Enter; Shift+Enter inserts a newline instead', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Composition onSubmit={onSubmit} />)
    const input = screen.getByLabelText('Prompt')

    await user.type(input, 'A sunset over the sea{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('A sunset over the sea')
    expect(input).toHaveValue('A sunset over the sea') // Enter did not insert a newline

    await user.type(input, '{Shift>}{Enter}{/Shift}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue('A sunset over the sea\n')
  })

  it('does not submit an empty or whitespace-only prompt', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Composition onSubmit={onSubmit} />)
    const input = screen.getByLabelText('Prompt')
    await user.type(input, '{Enter}')
    await user.type(input, '  {Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clamps typed input to maxLength', async () => {
    const user = userEvent.setup()
    render(<Composition maxLength={5} />)
    const input = screen.getByLabelText('Prompt')
    await user.type(input, 'HelloWorld')
    expect(input).toHaveValue('Hello')
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })

  it('disables Submit while the prompt is empty, enables it after typing', async () => {
    const user = userEvent.setup()
    render(<Composition />)
    const submit = screen.getByRole('button', { name: 'Generate' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Prompt'), 'Go')
    expect(submit).toBeEnabled()
  })

  it('fires onSubmit with the current prompt when Submit is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Composition defaultValue="Northern lights" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Generate' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('Northern lights')
  })

  it('locks the surface while submitting and shows a loader in Submit', () => {
    render(<Composition defaultValue="Northern lights" submitting />)
    expect(screen.getByLabelText('Prompt')).toBeDisabled()
    const submit = screen.getByRole('button', { name: /Generate/ })
    expect(submit).toBeDisabled()
    expect(screen.getByRole('status', { name: 'Generating' })).toHaveClass('q-loader')
  })

  it('disables everything under disabled', () => {
    render(<Composition defaultValue="Northern lights" disabled />)
    expect(screen.getByLabelText('Prompt')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled()
  })

  it('renders the counter from context (length only without a cap)', async () => {
    const user = userEvent.setup()
    render(<Composition maxLength={100} />)
    expect(screen.getByText('0 / 100')).toHaveClass('q-prompt-box-counter')
    await user.type(screen.getByLabelText('Prompt'), 'Hello')
    expect(screen.getByText('5 / 100')).toBeInTheDocument()
  })

  it('seeds the input from defaultValue when uncontrolled', () => {
    render(<Composition defaultValue="A red fox in the snow" />)
    expect(screen.getByLabelText('Prompt')).toHaveValue('A red fox in the snow')
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled()
  })

  it('keeps a controlled value authoritative and reports edits upward', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Composition value="Northern lights" onValueChange={onValueChange} />)
    const input = screen.getByLabelText('Prompt')
    await user.type(input, '!')
    expect(onValueChange).toHaveBeenCalledWith('Northern lights!')
    expect(input).toHaveValue('Northern lights') // parent did not accept the edit
  })

  it('allows overriding the Submit label and variant', () => {
    render(
      <PromptBox.Root defaultValue="Ready">
        <PromptBox.Submit variant="secondary" size="md">Create video</PromptBox.Submit>
      </PromptBox.Root>,
    )
    const submit = screen.getByRole('button', { name: 'Create video' })
    expect(submit).toHaveClass('q-button-secondary', 'q-button-md')
    expect(submit).toBeEnabled()
  })
})
