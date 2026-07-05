/**
 * Lucide replacement for `@higgsfield-ai/icons` (template-only).
 *
 * The vendored `@higgsfield/quanta` components import their glyphs from the
 * private, Nexus-only `@higgsfield-ai/icons` package. Generated websites build on
 * the PUBLIC npm registry and must not depend on the internal registry, so
 * `@higgsfield-ai/icons/*` is aliased to THIS module (see `vite.config.ts`
 * `resolve.alias` + `tsconfig.json` paths). Each export mirrors the
 * `@higgsfield-ai/icons/<Name>` subpath a quanta component imports, mapped to its
 * closest lucide-react equivalent. lucide icons are `SVGProps<SVGSVGElement>`
 * components, so they drop straight into quanta's `<Icon as={…}>` (which sizes +
 * colors the glyph via CSS tokens on the svg element).
 *
 * Only the 17 generic UI glyphs the SHIPPED quanta components use are mapped; the
 * brand/model glyphs live only in quanta's dev-only stories/scripts, which are
 * trimmed from the vendored copy. If a future quanta sync adds a new glyph to a
 * component, add it here (the build will fail with an unresolved export otherwise).
 */
import type { IconGlyph } from "@higgsfield/quanta/icon";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  CircleCheck,
  CircleX,
  Folder,
  Info,
  Pin,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

// TYPE BRIDGE, not a runtime change: lucide components are typed against the
// app's @types/react while quanta types glyphs against its own vendored copy
// (`IconGlyph`). The two copies are nominally incompatible on ref callbacks
// (unique-symbol cleanup type), so a plain `export { Search as Icon… }` fails
// tsc as soon as app code renders a quanta component that imports a glyph
// (e.g. Sidebar). Runtime is unaffected — lucide glyphs just spread props onto
// the <svg> — so re-export each icon cast to quanta's IconGlyph.
const glyph = (icon: unknown): IconGlyph => icon as IconGlyph;

export const IconMagnifyingGlass2Outlined = glyph(Search);
export const IconMagnifyingGlassOutlined = glyph(Search);
export const IconFolder1Outlined = glyph(Folder);
export const IconCheckmark2MediumOutlined = glyph(Check);
export const IconPlusMediumOutlined = glyph(Plus);
export const IconPinFilledThin = glyph(Pin);
export const IconExclamationTriangleOutlined = glyph(TriangleAlert);
export const IconCrossMediumOutlined = glyph(X);
export const IconCircleXOutlined = glyph(CircleX);
export const IconCircleOutlined = glyph(Circle);
export const IconCircleInfoOutlined = glyph(Info);
export const IconCircleCheckOutlined = glyph(CircleCheck);
export const IconChevronRightMediumOutlined = glyph(ChevronRight);
export const IconChevronLeftMediumOutlined = glyph(ChevronLeft);
export const IconChevronGrabberVerticalOutlined = glyph(ChevronsUpDown);
export const IconChevronDownMediumOutlined = glyph(ChevronDown);
export const IconChevronBottomOutlined = glyph(ChevronDown);
