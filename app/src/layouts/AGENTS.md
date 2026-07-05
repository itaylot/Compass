# App layout scaffolds

Prop-driven, presentational starting points for the four standard shapes of a
`type: "app"` product. None of them is imported by any route on purpose — the
blank template stays blank. When you build an app, COPY the closest layout into
your route (or compose it from a route file) and adapt it freely; a fully custom
layout is fine whenever the user asks for something these shapes don't cover.

## The four shapes

| File                          | Product shape              | Anatomy                                                                                                                            |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `marketing-studio-layout.tsx` | Studio/workspace generator | Sidebar nav rail, header row, responsive generation grid, bottom-docked PromptBox with a settings toolbar slot                     |
| `stepper-layout.tsx`          | Multi-step wizard          | Centered step markers + progress bar, Card body per step (render prop), Back/Continue footer — forward only via the primary action |
| `simple-app-layout.tsx`       | One-screen tool            | Centered column: title, inputs slot, one primary action, result panel, optional history strip                                      |
| `upscaler-layout.tsx`         | Single-asset enhancer      | Dropzone slot, options row, primary action, labelled before/after comparison                                                       |

## Rules

- Everything arrives via props: data, handlers, and slot nodes. The layouts
  import only Quanta components (including `@higgsfield/quanta/prompt-box`),
  `HiggsfieldGenerationCard`, and `cn` — never `@higgsfield/fnf-react`.
- Keep the conventions when adapting: Quanta components before custom markup,
  `q-` semantic utilities for color/type, native Tailwind spacing (`p-4`,
  `gap-3`), real copy in every state (empty, busy, error) — no placeholder
  tokens.
- Generation feeds render `HiggsfieldGenerationCard` inside a Quanta `Grid`
  with `cols="auto-fit"` — resize `minColWidth` rather than adding breakpoint
  class ladders.

## Wiring the data (fnf-react)

Each layout's header comment carries its exact recipe. In short, from
`app/packages/fnf-react/ai/AGENTS.md`:

- Submit prompts/runs with `useGenerationRun(jobClient, { scopeKey })`; map its
  status to the layout's `submitting`/`busy` prop.
- Read feeds with `jobsFeedQueryOptions` + `flattenFeedPages`; poll one job with
  `generationQueryOptions`.
- After a run resolves, call `prependGenerations` so fresh work appears at the
  top of the grid; upload files with `useAttachments` and pass refs to
  `run.start`.
