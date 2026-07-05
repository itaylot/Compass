"use client";

/**
 * SimpleAppLayout — one-screen tool scaffold for a small `type: "app"` product:
 * a centered column with a title, the tool's inputs (children slot), one primary
 * action, a result panel, and an optional history strip of past generations.
 * Purely presentational: all data and handlers arrive via props. Copy into a
 * route and adapt.
 *
 * fnf-react wiring recipe (see app/packages/fnf-react/ai/AGENTS.md):
 * - Action: const run = useGenerationRun(jobClient, { scopeKey }); pass
 *   onAction={() => run.start(input)} and busy={run.status === "submitting" ||
 *   run.status === "generating"}.
 * - Result: render the freshest run.generations entry (or poll it with
 *   generationQueryOptions) into the `result` slot.
 * - History: jobsFeedQueryOptions(jobClient, { size: 12 }, { scopeKey }) +
 *   flattenFeedPages for `generations`, and prependGenerations after each run
 *   so new work lands on the strip immediately.
 */

import type { ReactNode } from "react";
import type { Generation } from "@higgsfield/fnf/client";
import { Button } from "@higgsfield/quanta/button";
import { Grid } from "@higgsfield/quanta/grid";
import { Loader } from "@higgsfield/quanta/loader";
import { HiggsfieldGenerationCard } from "@/components/higgsfield-generation-card";
import { cn } from "@/lib/utils";

export interface SimpleAppLayoutProps {
  title: string;
  subtitle?: string;
  /** The tool's input controls (fields, selects, sliders). */
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  /** Generation in flight: the action locks and shows a loader. */
  busy?: boolean;
  /** Result panel content; a quiet placeholder shows while it is empty. */
  result?: ReactNode;
  /** Placeholder copy for the empty result panel. */
  resultPlaceholder?: string;
  /** Optional history strip of recent generations. */
  generations?: Generation[];
  onRefreshGeneration?: (generation: Generation) => void;
  className?: string;
}

export function SimpleAppLayout({
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
  actionDisabled = false,
  busy = false,
  result,
  resultPlaceholder = "Your result appears here once it is ready.",
  generations = [],
  onRefreshGeneration,
  className,
}: SimpleAppLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center bg-q-background-primary px-4 py-10 text-q-text-primary",
        className,
      )}
    >
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1 text-center">
          <h1 className="text-q-headline-md-semi-bold">{title}</h1>
          {subtitle ? (
            <p className="text-q-body-md-regular text-q-text-secondary">{subtitle}</p>
          ) : null}
        </header>

        <section className="flex flex-col gap-4 rounded-lg border border-q-border-subtle bg-q-background-secondary p-5">
          {children}
          <Button
            variant="primary"
            size="md"
            disabled={actionDisabled || busy}
            start={busy ? <Loader size="xs" color="neutral" aria-label="Working" /> : undefined}
            onClick={onAction}
            className="self-end"
          >
            {actionLabel}
          </Button>
        </section>

        <section
          aria-label="Result"
          className="rounded-lg border border-q-border-subtle bg-q-background-secondary p-5"
        >
          {result ?? (
            <p className="py-10 text-center text-q-body-sm-regular text-q-text-tertiary">
              {resultPlaceholder}
            </p>
          )}
        </section>

        {generations.length > 0 ? (
          <section aria-label="Recent results" className="flex flex-col gap-3">
            <h2 className="text-q-title-sm-semi-bold">Recent</h2>
            <Grid cols="auto-fit" minColWidth="10rem" gap={3}>
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
          </section>
        ) : null}
      </div>
    </div>
  );
}
