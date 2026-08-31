import { resolveComposerFolder } from "./composerFolders";

export type LibrarySearchSource = {
  id: number;
  title?: unknown;
  fileName?: unknown;
  composer?: unknown;
  analysis?: unknown;
};

export function normalizeLibrarySearch(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[àáâãäåæ]/g, "a")
    .replace(/[ç]/g, "c")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[ñ]/g, "n")
    .replace(/[òóôõöø]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compositionSearchText(composition: LibrarySearchSource): string {
  return normalizeLibrarySearch([
    typeof composition.title === "string" ? composition.title : "",
    typeof composition.fileName === "string" ? composition.fileName : "",
    resolveComposerFolder(composition),
  ].join(" "));
}

/** All words must match, so suggestions become more precise as the user types. */
export function compositionMatchesSearch(composition: LibrarySearchSource, query: string): boolean {
  const tokens = normalizeLibrarySearch(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = compositionSearchText(composition);
  return tokens.every((token) => haystack.includes(token));
}

export function getLibrarySearchSuggestions<T extends LibrarySearchSource>(
  compositions: T[],
  query: string,
  limit = 6,
): T[] {
  const normalizedQuery = normalizeLibrarySearch(query);
  if (!normalizedQuery) return [];

  return compositions
    .filter((composition) => compositionMatchesSearch(composition, normalizedQuery))
    .sort((a, b) => {
      const aTitle = normalizeLibrarySearch(typeof a.title === "string" ? a.title : "");
      const bTitle = normalizeLibrarySearch(typeof b.title === "string" ? b.title : "");
      const aStartsWith = aTitle.startsWith(normalizedQuery) ? 0 : 1;
      const bStartsWith = bTitle.startsWith(normalizedQuery) ? 0 : 1;
      return aStartsWith - bStartsWith || aTitle.localeCompare(bTitle);
    })
    .slice(0, limit);
}
