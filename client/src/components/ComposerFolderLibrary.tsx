import { useState, useMemo } from "react";
import { Folder, ChevronRight, ChevronDown, BookOpen, Loader2, GripVertical } from "lucide-react";
import { groupCompositionsByComposer, resolveComposerFolder } from "@shared/composerFolders";

// Forward-declare types to avoid circular imports
type ProgressSummary = { completedDays: number; totalDays: number; percentage: number };

interface Props {
  compositions: any[];
  progressMap: Record<number, ProgressSummary>;
  isLoading: boolean;
  renderCard: (comp: any, progressSummary: ProgressSummary | null) => React.ReactNode;
  renderFeatured: () => React.ReactNode;
  onMoveToComposer: (compositionId: number, composer: string) => Promise<void>;
}

export function ComposerFolderLibrary({ compositions, progressMap, isLoading, renderCard, renderFeatured, onMoveToComposer }: Props) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [draggedComposition, setDraggedComposition] = useState<any | null>(null);
  const [activeDropComposer, setActiveDropComposer] = useState<string | null>(null);
  const [movingCompositionId, setMovingCompositionId] = useState<number | null>(null);

  const grouped: [string, any[]][] = useMemo(() => groupCompositionsByComposer(compositions), [compositions]);

  const toggleFolder = (composer: string) => {
    setOpenFolders(prev => ({ ...prev, [composer]: !(prev[composer] ?? false) }));
  };

  const isFolderOpen = (composer: string) => openFolders[composer] ?? false;

  const moveComposition = async (composition: any, destinationComposer: string) => {
    const currentComposer = resolveComposerFolder(composition);
    if (currentComposer === destinationComposer || movingCompositionId !== null) return;
    setMovingCompositionId(composition.id);
    try {
      await onMoveToComposer(composition.id, destinationComposer);
    } finally {
      setMovingCompositionId(null);
      setActiveDropComposer(null);
      setDraggedComposition(null);
    }
  };

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
        <>
          <p className="px-1 text-[0.65rem] font-mono text-[oklch(0.44_0.012_265)]">
            Drag a score card onto another composer folder to file it there. Use the <span className="text-[oklch(0.68_0.08_85)]">Move to</span> menu beneath a score if you prefer.
          </p>
          {grouped.map(([composer, comps]) => {
          const open = isFolderOpen(composer);
          const isUncategorized = composer === "Uncategorized";
          const isActiveDropTarget = activeDropComposer === composer && draggedComposition && resolveComposerFolder(draggedComposition) !== composer;
          return (
            <div
              key={composer}
              onDragOver={(event) => {
                const draggedId = Number(event.dataTransfer.getData("text/plain"));
                const dragSource = draggedComposition ?? compositions.find((item) => item.id === draggedId);
                if (!dragSource || resolveComposerFolder(dragSource) === composer) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setActiveDropComposer(composer);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) setActiveDropComposer(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = Number(event.dataTransfer.getData("text/plain"));
                const dragSource = draggedComposition ?? compositions.find((item) => item.id === draggedId);
                if (dragSource) void moveComposition(dragSource, composer);
              }}
              className={`rounded-xl border overflow-hidden transition-[border-color,box-shadow,background-color] duration-150 motion-reduce:transition-none ${
                isActiveDropTarget
                  ? "border-[oklch(0.78_0.12_85)] bg-[oklch(0.78_0.12_85/0.08)] shadow-[0_0_0_2px_oklch(0.78_0.12_85/0.15)]"
                  : "border-[oklch(0.22_0.014_265)]"
              }`}
            >
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
                    <div
                      key={comp.id}
                      draggable={movingCompositionId === null}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(comp.id));
                        setDraggedComposition(comp);
                      }}
                      onDragEnd={() => {
                        setDraggedComposition(null);
                        setActiveDropComposer(null);
                      }}
                      className={`group/drag relative px-2 py-1.5 transition-opacity duration-150 motion-reduce:transition-none ${
                        draggedComposition?.id === comp.id ? "opacity-45" : ""
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/drag:opacity-70 group-focus-within/drag:opacity-70 transition-opacity duration-150 motion-reduce:transition-none text-[oklch(0.78_0.12_85)]"
                      >
                        <GripVertical size={15} />
                      </div>
                      {renderCard(comp, progressMap[comp.id] ?? null)}
                      <label className="mt-1.5 ml-10 flex items-center gap-2 text-[0.6rem] font-mono text-[oklch(0.42_0.012_265)]">
                        <span>Move to</span>
                        <select
                          value={composer}
                          disabled={movingCompositionId === comp.id}
                          aria-label={`Move ${comp.title} to a composer folder`}
                          onChange={(event) => void moveComposition(comp, event.target.value)}
                          className="max-w-52 bg-[oklch(0.14_0.012_265)] border border-[oklch(0.28_0.014_265)] rounded-md px-2 py-1 text-[0.65rem] text-[oklch(0.72_0.015_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_85/0.55)] disabled:opacity-50"
                        >
                          {grouped.map(([optionComposer]) => (
                            <option key={optionComposer} value={optionComposer}>{optionComposer}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          })}
        </>
      )}
    </div>
  );
}
