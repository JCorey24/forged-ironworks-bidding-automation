import type { LineItemScope } from "../models/scope";

/**
 * Standard company-level scope exceptions.
 *
 * Keep this list small. Project-specific decisions belong in explicitScope,
 * passed to resolveLineItemScope().
 */
export const CATEGORY_SCOPE_OVERRIDES: Readonly<
  Record<string, Partial<LineItemScope>>
> = {
  LOOSE_LINTEL: {
    furnish: "YES",
    fabricate: "YES",
    erect: "NO",
    providedBy: "FIW",
    installedBy: "MASONRY",
    resolutionStatus: "RESOLVED",
    scopeSource: "Forged Ironworks loose-lintel policy",
  },

  PIPE_BOLLARD_FURNISH_ONLY: {
    furnish: "YES",
    fabricate: "YES",
    erect: "NO",
    providedBy: "FIW",
    installedBy: "GC",
    resolutionStatus: "RESOLVED",
    scopeSource: "Project scope: furnish-only pipe bollard",
  },

  ANCHOR_BOLT_FURNISH_ONLY: {
    furnish: "YES",
    fabricate: "NO",
    erect: "NO",
    providedBy: "FIW",
    installedBy: "GC",
    resolutionStatus: "RESOLVED",
    scopeSource: "Project scope: furnish-only anchor bolts and embeds",
  },
} as const;
