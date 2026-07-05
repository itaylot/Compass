"use client";

/**
 * StepperLayout — centered wizard scaffold for a multi-step `type: "app"` product
 * (onboarding-style generators: pick a template, add assets, review, generate).
 * Purely presentational: steps, the active step, and all handlers arrive via props;
 * the active step's body is a render-prop slot. Back-navigation goes through
 * `onStepChange`; forward movement only happens through the primary action
 * (`onContinue`), so a page can validate before advancing. Copy into a route and adapt.
 *
 * fnf-react wiring recipe (see app/packages/fnf-react/ai/AGENTS.md):
 * - Keep the wizard state (active step id, collected inputs) in the page.
 * - On the final step, submit with useGenerationRun: const run = useGenerationRun(jobClient,
 *   { scopeKey }); onContinue={() => run.start(input)} and busy={run.status === "submitting"
 *   || run.status === "generating"}.
 * - Show progress/results on the last step body via generationQueryOptions(jobClient, id,
 *   { scopeKey }) or the run.generations snapshot, and prependGenerations into a feed if the
 *   app also has a gallery.
 */

import type { ReactNode } from "react";
import { Button } from "@higgsfield/quanta/button";
import { Card } from "@higgsfield/quanta/card";
import { Loader } from "@higgsfield/quanta/loader";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  title: string;
}

export interface StepperLayoutProps {
  /** Wizard heading above the card. */
  title: string;
  description?: string;
  steps: StepperStep[];
  /** Id of the active step (must be one of `steps`). */
  activeStep: string;
  /**
   * Back-navigation only: fires with an EARLIER step's id (Back button or a click on a
   * completed step marker). Forward movement goes through `onContinue`.
   */
  onStepChange: (stepId: string) => void;
  /** Renders the active step's body inside the card. */
  children: (step: StepperStep) => ReactNode;
  /** Primary action: advance to the next step, or submit on the last one. */
  onContinue: () => void;
  continueLabel?: string;
  /** Label of the primary action on the last step. */
  finishLabel?: string;
  continueDisabled?: boolean;
  /** Submitting state: the primary action locks and shows a loader. */
  busy?: boolean;
  className?: string;
}

export function StepperLayout({
  title,
  description,
  steps,
  activeStep,
  onStepChange,
  children,
  onContinue,
  continueLabel = "Continue",
  finishLabel = "Generate",
  continueDisabled = false,
  busy = false,
  className,
}: StepperLayoutProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStep),
  );
  const active = steps[activeIndex];
  const isLast = activeIndex === steps.length - 1;
  const progressPct = steps.length > 0 ? ((activeIndex + 1) / steps.length) * 100 : 0;

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
          {description ? (
            <p className="text-q-body-md-regular text-q-text-secondary">{description}</p>
          ) : null}
        </header>

        <nav aria-label="Steps" className="flex flex-col gap-3">
          <ol className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {steps.map((step, index) => {
              const done = index < activeIndex;
              const current = index === activeIndex;
              return (
                <li key={step.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!done}
                    aria-current={current ? "step" : undefined}
                    onClick={done ? () => onStepChange(step.id) : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5",
                      done && "cursor-pointer bg-q-background-secondary text-q-text-secondary",
                      current && "bg-q-brand-primary text-q-text-inverse",
                      !done && !current && "text-q-text-tertiary",
                    )}
                  >
                    <span className="text-q-label-sm-semi-bold">{index + 1}</span>
                    <span className="text-q-label-sm-medium">{step.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={activeIndex + 1}
            aria-label="Wizard progress"
            className="h-1 w-full overflow-hidden rounded-full bg-q-background-tertiary"
          >
            <div
              className="h-full rounded-full bg-q-brand-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </nav>

        <Card surface="solid">
          <Card.Header title={active ? active.title : title} />
          <Card.Body>{active ? children(active) : null}</Card.Body>
          <Card.Footer className="justify-between">
            <Button
              variant="ghost"
              disabled={activeIndex === 0 || busy}
              onClick={() => {
                const previous = steps[activeIndex - 1];
                if (previous) onStepChange(previous.id);
              }}
            >
              Back
            </Button>
            <Button
              variant="primary"
              disabled={continueDisabled || busy}
              start={busy ? <Loader size="xs" color="neutral" aria-label="Working" /> : undefined}
              onClick={onContinue}
            >
              {isLast ? finishLabel : continueLabel}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}
