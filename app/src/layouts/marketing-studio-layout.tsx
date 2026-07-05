"use client";

/**
 * MarketingStudioLayout — workspace scaffold for a studio-shaped `type: "app"` product:
 * a Sidebar nav rail, a header row, a responsive generation grid, and a bottom-docked
 * PromptBox. Purely presentational: every piece of data and every handler arrives via
 * props. Copy this file into a route and adapt it; it is a starting point, not a runtime
 * dependency (no route imports it in the blank template).
 *
 * fnf-react wiring recipe (see app/packages/fnf-react/ai/AGENTS.md):
 * - Submit: const run = useGenerationRun(jobClient, { scopeKey }); pass
 *   onSubmit={(prompt) => run.start({ model, prompt: { instruction: prompt }, settings })}
 *   and submitting={run.status === "submitting" || run.status === "generating"}.
 * - Grid data: useInfiniteQuery({ ...jobsFeedQueryOptions(jobClient, { size: 20 }, { scopeKey }),
 *   select: flattenFeedPages }) and pass the flattened list as `generations`.
 * - Fresh work on top: after run.start resolves, call
 *   prependGenerations(queryClient, feedInput, generations, { scopeKey }).
 * - Single-card refresh: invalidate generationQueryOptions(jobClient, generation.id, { scopeKey })
 *   from `onRefreshGeneration`.
 */

import type { ReactNode } from "react";
import type { Generation } from "@higgsfield/fnf/client";
import { Grid } from "@higgsfield/quanta/grid";
import { PromptBox } from "@higgsfield/quanta/prompt-box";
import { Sidebar } from "@higgsfield/quanta/sidebar";
import { HiggsfieldGenerationCard } from "@/components/higgsfield-generation-card";
import { cn } from "@/lib/utils";

export interface MarketingStudioNavItem {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}

export interface MarketingStudioLayoutProps {
  /** Product name shown in the sidebar switcher. */
  appName: string;
  /** Brand mark next to the product name (any node, ~20px). */
  appLogo?: ReactNode;
  navItems: MarketingStudioNavItem[];
  /** Header row heading. */
  title: string;
  description?: string;
  /** Right side of the header row (filters, view switches, credits). */
  headerActions?: ReactNode;
  /** Feed of generations to render as cards; empty state shows when the list is empty. */
  generations: Generation[];
  onRefreshGeneration?: (generation: Generation) => void;
  /** Replaces the built-in empty state. */
  emptyState?: ReactNode;
  /** Prompt state — controlled by the page. */
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (value: string) => void;
  submitting?: boolean;
  promptPlaceholder?: string;
  maxPromptLength?: number;
  /** Settings controls dropped into the PromptBox toolbar (model select, aspect ratio…). */
  promptToolbar?: ReactNode;
  /** Cost / credits hint rendered next to the submit button. */
  promptCost?: ReactNode;
  /** Attachment chips strip (wire useAttachments in the page and render chips here). */
  promptAttachments?: ReactNode;
  className?: string;
}

export function MarketingStudioLayout({
  appName,
  appLogo,
  navItems,
  title,
  description,
  headerActions,
  generations,
  onRefreshGeneration,
  emptyState,
  prompt,
  onPromptChange,
  onSubmit,
  submitting = false,
  promptPlaceholder = "Describe the visual you want to create",
  maxPromptLength,
  promptToolbar,
  promptCost,
  promptAttachments,
  className,
}: MarketingStudioLayoutProps) {
  return (
    <div className={cn("flex min-h-dvh bg-q-background-primary text-q-text-primary", className)}>
      <Sidebar.Root product="marketing-studio" flush className="sticky top-0 h-dvh shrink-0">
        <Sidebar.Header>
          <Sidebar.Switcher>
            {appLogo ? <Sidebar.Logo>{appLogo}</Sidebar.Logo> : null}
            <Sidebar.Title>{appName}</Sidebar.Title>
          </Sidebar.Switcher>
        </Sidebar.Header>
        <Sidebar.Body>
          <Sidebar.Section>
            <Sidebar.SectionItems>
              {navItems.map((item) => (
                <Sidebar.Item
                  key={item.label}
                  start={item.icon}
                  title={item.label}
                  selected={item.selected}
                  onClick={item.onSelect}
                />
              ))}
            </Sidebar.SectionItems>
          </Sidebar.Section>
        </Sidebar.Body>
      </Sidebar.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-q-border-subtle px-6 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-q-title-lg-semi-bold">{title}</h1>
            {description ? (
              <p className="text-q-body-sm-regular text-q-text-secondary">{description}</p>
            ) : null}
          </div>
          {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5">
          {generations.length > 0 ? (
            <Grid cols="auto-fit" minColWidth="16rem" gap={4}>
              {generations.map((generation) => (
                <HiggsfieldGenerationCard
                  key={generation.id}
                  generation={generation}
                  onRefresh={
                    onRefreshGeneration ? () => onRefreshGeneration(generation) : undefined
                  }
                />
              ))}
            </Grid>
          ) : (
            (emptyState ?? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                <p className="text-q-title-sm-semi-bold">Nothing generated yet</p>
                <p className="max-w-96 text-q-body-sm-regular text-q-text-tertiary">
                  Describe what you want in the prompt below and press Generate. Finished results
                  appear here.
                </p>
              </div>
            ))
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-q-border-subtle bg-q-background-primary px-6 py-4">
          <PromptBox.Root
            value={prompt}
            onValueChange={onPromptChange}
            onSubmit={onSubmit}
            submitting={submitting}
            maxLength={maxPromptLength}
          >
            {promptAttachments ? (
              <PromptBox.Attachments>{promptAttachments}</PromptBox.Attachments>
            ) : null}
            <PromptBox.Input aria-label="Prompt" placeholder={promptPlaceholder} />
            <PromptBox.Toolbar>
              {promptToolbar}
              <PromptBox.Actions>
                {promptCost}
                {maxPromptLength != null ? <PromptBox.Counter /> : null}
                <PromptBox.Submit />
              </PromptBox.Actions>
            </PromptBox.Toolbar>
          </PromptBox.Root>
        </footer>
      </div>
    </div>
  );
}
