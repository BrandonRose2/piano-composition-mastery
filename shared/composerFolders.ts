export const UNCATEGORIZED_COMPOSER_FOLDER = "Uncategorized";

type ComposerFolderSource = {
  composer?: unknown;
  analysis?: unknown;
};

export function normalizeComposerFolderName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 256);
}

/**
 * A manually assigned composer folder always wins. If no manual assignment exists,
 * fall back to the composer inferred by the score analysis.
 */
export function resolveComposerFolder(source: ComposerFolderSource): string {
  const manualComposer = typeof source.composer === "string"
    ? normalizeComposerFolderName(source.composer)
    : "";
  if (manualComposer) return manualComposer;

  const analysis = source.analysis;
  if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) {
    const inferredComposer = (analysis as { composer?: unknown }).composer;
    if (typeof inferredComposer === "string") {
      const normalized = normalizeComposerFolderName(inferredComposer);
      if (normalized) return normalized;
    }
  }

  return UNCATEGORIZED_COMPOSER_FOLDER;
}

/** Group library items for display, keeping Uncategorized at the end. */
export function groupCompositionsByComposer<T extends ComposerFolderSource>(compositions: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const composition of compositions) {
    const composer = resolveComposerFolder(composition);
    groups.set(composer, [...(groups.get(composer) ?? []), composition]);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === UNCATEGORIZED_COMPOSER_FOLDER) return 1;
    if (b === UNCATEGORIZED_COMPOSER_FOLDER) return -1;
    return a.localeCompare(b);
  });
}
