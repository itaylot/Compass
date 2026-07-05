"use client";

/**
 * UpscalerLayout — single-asset enhancer scaffold for a `type: "app"` product that
 * takes one file and returns an improved version (upscale, restore, relight,
 * background removal). A dropzone slot on top, an options row, one primary action,
 * and a labelled before/after comparison. Purely presentational: the page wires
 * its own file input and handlers. Copy into a route and adapt.
 *
 * fnf-react wiring recipe (see app/packages/fnf-react/ai/AGENTS.md):
 * - Upload: const attachments = useAttachments(mediaClient); render your file input
 *   inside the dropzone slot (children), call attachments.add(files, { role }) and
 *   preview the local file as `beforeUrl`.
 * - Action: const run = useGenerationRun(jobClient, { scopeKey }); in onAction, await
 *   attachments.settled() for refs, then run.start({ model, media: { image: refs },
 *   settings }); busy={run.status === "submitting" || run.status === "generating"}.
 * - Result: read the finished generation (run.generations or generationQueryOptions)
 *   and pass its raw URL as `afterUrl`.
 */

import type { ReactNode } from "react";
import { Button } from "@higgsfield/quanta/button";
import { Loader } from "@higgsfield/quanta/loader";
import { cn } from "@/lib/utils";

export interface UpscalerLayoutProps {
  title: string;
  subtitle?: string;
  /** Dropzone content — the page wires its own file input / drag-and-drop. */
  children: ReactNode;
  /** Settings row under the dropzone (scale factor, model, format…). */
  options?: ReactNode;
  actionLabel?: string;
  onAction: () => void;
  actionDisabled?: boolean;
  /** Enhancement in flight: the action locks and shows a loader. */
  busy?: boolean;
  /** Source asset preview URL (shown as the left pane). */
  beforeUrl?: string;
  /** Enhanced result URL (shown as the right pane). */
  afterUrl?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

function ComparisonPane({
  label,
  url,
  placeholder,
}: {
  label: string;
  url?: string;
  placeholder: string;
}) {
  return (
    <figure className="flex min-w-0 flex-1 flex-col gap-2">
      <figcaption className="text-q-label-sm-medium text-q-text-secondary">{label}</figcaption>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-q-background-tertiary">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <p className="max-w-52 px-4 text-center text-q-body-sm-regular text-q-text-tertiary">
            {placeholder}
          </p>
        )}
      </div>
    </figure>
  );
}

export function UpscalerLayout({
  title,
  subtitle,
  children,
  options,
  actionLabel = "Enhance",
  onAction,
  actionDisabled = false,
  busy = false,
  beforeUrl,
  afterUrl,
  beforeLabel = "Original",
  afterLabel = "Enhanced",
  className,
}: UpscalerLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center bg-q-background-primary px-4 py-10 text-q-text-primary",
        className,
      )}
    >
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-1 text-center">
          <h1 className="text-q-headline-md-semi-bold">{title}</h1>
          {subtitle ? (
            <p className="text-q-body-md-regular text-q-text-secondary">{subtitle}</p>
          ) : null}
        </header>

        <section
          aria-label="Upload"
          className="rounded-lg border border-dashed border-q-border-default bg-q-background-secondary p-6"
        >
          {children}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {options ? <div className="flex flex-wrap items-center gap-3">{options}</div> : <div />}
          <Button
            variant="primary"
            size="md"
            disabled={actionDisabled || busy}
            start={busy ? <Loader size="xs" color="neutral" aria-label="Working" /> : undefined}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>

        <section aria-label="Comparison" className="flex flex-col gap-4 sm:flex-row">
          <ComparisonPane
            label={beforeLabel}
            url={beforeUrl}
            placeholder="Add a file above to see it here."
          />
          <ComparisonPane
            label={afterLabel}
            url={afterUrl}
            placeholder={
              busy ? "Enhancing your file now." : "The enhanced version appears here after a run."
            }
          />
        </section>
      </div>
    </div>
  );
}
