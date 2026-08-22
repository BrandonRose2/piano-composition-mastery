import { useState, useMemo } from "react";
import { Folder, ChevronRight, ChevronDown, BookOpen, Loader2 } from "lucide-react";

// Forward-declare types to avoid circular imports
type ProgressSummary = { completedDays: number; totalDays: number; percentage: number };

interface Props {
  compositions: any[];
  progressMap: Record<number, ProgressSummary>;
  isLoading: boolean;
  renderCard: (comp: any, progressSummary: ProgressSummary | null) => React.ReactNode;
  renderFeatured: () => React.ReactNode;
}

export function ComposerFolderLibrary({ compositions, progressMap, isLoading, renderCard, renderFeatured }: Props) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const grouped: [string, any[]][] = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const comp of compositions) {
      const composer = (comp.analysis as any)?.composer?.trim() || "Uncategorized";
      if (!map[composer]) map[composer] = [];
      map[composer].push(comp);
    }
    return Object.entries(map).sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [compositions]);

  const toggleFolder = (composer: string) => {
    setOpenFolders(prev => ({ ...prev, [composer]: !(prev[composer] ?? false) }));
  };

  const isFolderOpen = (composer: string) => openFolders[composer] ?? false;

  if (isLoading) {
    return (
      <div className="nocturne-card p-8 text-center">
        <Loader2 size={24} className="text-[oklch(0.78_0.12_85)] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[oklch(0.72_0.015_265)]">Loading your library…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Built-in La Campanella always at top */}
      {renderFeatured()}

      {compositions.length === 0 ? (
        <div className="nocturne-card p-8 text-center border-dashed">
          <BookOpen size={28} className="text-[oklch(0.35_0.010_265)] mx-auto mb-3" />
          <p className="text-sm text-[oklch(0.68_0.012_265)]">No uploaded compositions yet.</p>
          <p className="text-xs text-[oklch(0.35_0.010_265)] mt-1">Upload a score above to get started.</p>
        </div>
      ) : (
        grouped.map(([composer, comps]) => {
          const open = isFolderOpen(composer);
          const isUncategorized = composer === "Uncategorized";
          return (
            <div key={composer} className="rounded-xl border border-[oklch(0.22_0.014_265)] overflow-hidden">
              {/* Folder header row */}
              <button
                onClick={() => toggleFolder(composer)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[oklch(0.15_0.012_265)] hover:bg-[oklch(0.17_0.014_265)] transition-colors duration-150"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isUncategorized ? 'oklch(0.22 0.010 265)' : 'oklch(0.78 0.12 85 / 0.12)',
                    border: isUncategorized ? '1px solid oklch(0.30 0.010 265)' : '1px solid oklch(0.78 0.12 85 / 0.25)',
                  }}
                >
                  <Folder
                    size={13}
                    className={isUncategorized ? "text-[oklch(0.45_0.010_265)]" : "text-[oklch(0.78_0.12_85)]"}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-semibold truncate font-['Playfair_Display'] ${isUncategorized ? "text-[oklch(0.55_0.010_265)]" : "text-[oklch(0.88_0.01_85)]"}`}>
                    {composer}
                  </p>
                </div>
                <span className="shrink-0 text-[0.65rem] font-mono text-[oklch(0.45_0.012_265)] mr-1">
                  {comps.length} {comps.length === 1 ? "piece" : "pieces"}
                </span>
                {open
                  ? <ChevronDown size={14} className="shrink-0 text-[oklch(0.45_0.012_265)]" />
                  : <ChevronRight size={14} className="shrink-0 text-[oklch(0.45_0.012_265)]" />
                }
              </button>

              {/* Folder contents — shown when open */}
              {open && (
                <div className="border-t border-[oklch(0.20_0.012_265)] divide-y divide-[oklch(0.18_0.010_265)]">
                  {comps.map((comp: any) => (
                    <div key={comp.id} className="px-2 py-1.5">
                      {renderCard(comp, progressMap[comp.id] ?? null)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
