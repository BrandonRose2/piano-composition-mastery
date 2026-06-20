/**
 * La Campanella — Piano Mastery Portal
 * Home page: drag-and-drop upload + composition library
 * Design: Nocturne (Dark Velvet Recital Hall)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Music, Upload, BookOpen, ChevronRight, Loader2, AlertCircle, CheckCircle2, Clock, Trash2, Youtube, ExternalLink, LogOut, User, Search, FileText, ExternalLink as LinkIcon, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Asset URLs ────────────────────────────────────────────────────────────────
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/hero_bg-DDCWpXMzKGFmMUM3oU8SpS.webp";
const LOGO_TREBLE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/logo_treble-Ys7HU4Ydwkc3JS4KPHV5db.webp";

// ── Sheet Music Search ───────────────────────────────────────────────────
function SheetMusicSearch() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [open, setOpen] = useState(false);

  const { data: results = [], isFetching } = trpc.sheetMusic.search.useQuery(
    { query: submitted },
    { enabled: submitted.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    setSubmitted("");
    setOpen(false);
  };

  return (
    <div className="mb-16">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[oklch(0.78_0.12_85)]">♪</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[oklch(0.78_0.12_85/0.4)] to-transparent" />
        <p className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">Find Sheet Music</p>
        <div className="flex-1 h-px bg-gradient-to-l from-[oklch(0.78_0.12_85/0.4)] to-transparent" />
        <span className="text-[oklch(0.78_0.12_85)]">♪</span>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-4 text-[oklch(0.50_0.012_265)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for any piano composition or composer… e.g. Chopin Ballade No. 1"
            className="w-full pl-10 pr-28 py-3.5 rounded-xl bg-[oklch(0.16_0.018_265)] border border-[oklch(0.26_0.016_265)] text-[oklch(0.88_0.01_85)] placeholder-[oklch(0.40_0.012_265)] text-sm focus:outline-none focus:border-[oklch(0.78_0.12_85/0.6)] focus:ring-1 focus:ring-[oklch(0.78_0.12_85/0.3)] transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-[5.5rem] text-[oklch(0.40_0.012_265)] hover:text-[oklch(0.65_0.015_265)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isFetching}
            className="absolute right-2 px-4 py-2 rounded-lg bg-[oklch(0.78_0.12_85)] text-[oklch(0.12_0.018_265)] text-xs font-mono font-bold uppercase tracking-wider hover:bg-[oklch(0.85_0.10_85)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            {isFetching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Search
          </button>
        </div>
        <p className="text-[0.65rem] text-[oklch(0.38_0.010_265)] mt-2 ml-1">
          Searches IMSLP — the world’s largest free sheet music library. Results open on IMSLP where you can download the PDF.
        </p>
      </form>

      {/* Results */}
      {open && submitted && (
        <div className="mt-5">
          {isFetching ? (
            <div className="nocturne-card p-8 text-center">
              <Loader2 size={24} className="text-[oklch(0.78_0.12_85)] animate-spin mx-auto mb-3" />
              <p className="text-sm text-[oklch(0.55_0.015_265)]">Searching IMSLP for “{submitted}”…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="nocturne-card p-8 text-center border-dashed">
              <FileText size={28} className="text-[oklch(0.35_0.010_265)] mx-auto mb-3" />
              <p className="text-sm text-[oklch(0.55_0.015_265)]">No results found for “{submitted}” on IMSLP.</p>
              <p className="text-xs text-[oklch(0.38_0.010_265)] mt-1">Try a different spelling or search by composer name only.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="text-[0.65rem] font-mono text-[oklch(0.45_0.012_265)] uppercase tracking-wider mb-1">
                {results.length} result{results.length !== 1 ? "s" : ""} from IMSLP
              </p>
              {results.map((r, i) => (
                <a
                  key={i}
                  href={r.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nocturne-card p-4 flex items-start gap-4 hover:border-[oklch(0.78_0.12_85/0.50)] hover:bg-[oklch(0.17_0.016_265)] transition-all duration-150 group/result"
                >
                  <div className="w-8 h-8 rounded-lg bg-[oklch(0.78_0.12_85/0.10)] border border-[oklch(0.78_0.12_85/0.20)] flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={14} className="text-[oklch(0.78_0.12_85)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-['Playfair_Display'] font-semibold text-[oklch(0.88_0.01_85)] text-sm truncate group-hover/result:text-[oklch(0.78_0.12_85)] transition-colors">
                      {r.title}
                    </p>
                    {r.snippet && (
                      <p className="text-xs text-[oklch(0.45_0.012_265)] line-clamp-2 leading-relaxed mt-0.5">
                        {r.snippet}
                      </p>
                    )}
                    <p className="text-[0.6rem] font-mono text-[oklch(0.78_0.12_85/0.7)] mt-1.5 flex items-center gap-1">
                      <ExternalLink size={9} /> Open on IMSLP — free PDF download
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-[oklch(0.35_0.010_265)] group-hover/result:text-[oklch(0.78_0.12_85)] transition-colors shrink-0 mt-1" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Nav Bar ──────────────────────────────────────────────────────────────────
function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="flex items-center justify-between mb-16">
      <div className="flex items-center gap-3">
        <img src={LOGO_TREBLE} alt="Treble clef" className="h-9 w-auto" />
        <span className="font-['Playfair_Display'] font-semibold text-[oklch(0.78_0.12_85)] text-sm tracking-wide">
          Piano Mastery Portal
        </span>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[oklch(0.50_0.012_265)]">
            <User size={12} className="text-[oklch(0.78_0.12_85)]" />
            <span className="hidden sm:inline">{user.name ?? user.email ?? "Pianist"}</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
              text-[oklch(0.45_0.012_265)] border border-[oklch(0.22_0.016_265)]
              hover:text-[oklch(0.70_0.012_265)] hover:border-[oklch(0.35_0.016_265)]
              transition-all duration-150 active:scale-95"
            title="Sign out"
          >
            <LogOut size={11} /> Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

// ── PDF text extraction (client-side, best-effort) ───────────────────────────
async function extractTextFromFile(file: File): Promise<string> {
  // Text extraction from PDF/images is now done server-side via pdftotext.
  // For plain text files, we can still read them directly.
  if (file.type === "text/plain") {
    try { return await file.text(); } catch { /* ignore */ }
  }
  return "";
}

// ── File to base64 ────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
        <CheckCircle2 size={10} /> Ready
      </span>
    );
  }
  if (status === "analyzing") {
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
        <Loader2 size={10} className="animate-spin" /> Analyzing…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2 py-0.5">
        <AlertCircle size={10} /> Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono text-slate-400 bg-slate-400/10 border border-slate-400/20 rounded-full px-2 py-0.5">
      <Clock size={10} /> Pending
    </span>
  );
}

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center group
        ${dragging
          ? "border-[oklch(0.78_0.12_85)] bg-[oklch(0.78_0.12_85/0.06)] scale-[1.01]"
          : "border-[oklch(0.30_0.018_265)] hover:border-[oklch(0.55_0.08_85)] hover:bg-[oklch(0.78_0.12_85/0.03)]"
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
        className="hidden"
        onChange={handleChange}
      />

      {/* Animated glow ring when dragging */}
      {dragging && (
        <div className="absolute inset-0 rounded-2xl bg-[oklch(0.78_0.12_85/0.04)] pointer-events-none" />
      )}

      <div className="flex flex-col items-center gap-5">
        <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-300
          ${dragging
            ? "border-[oklch(0.78_0.12_85)] bg-[oklch(0.78_0.12_85/0.12)]"
            : "border-[oklch(0.30_0.018_265)] group-hover:border-[oklch(0.55_0.08_85)] group-hover:bg-[oklch(0.78_0.12_85/0.06)]"
          }`}>
          <Upload
            size={32}
            className={`transition-colors duration-300 ${dragging ? "text-[oklch(0.78_0.12_85)]" : "text-[oklch(0.40_0.012_265)] group-hover:text-[oklch(0.65_0.08_85)]"}`}
          />
        </div>

        <div>
          <p className="font-['Playfair_Display'] text-xl font-semibold text-[oklch(0.88_0.01_85)] mb-2">
            {dragging ? "Release to upload" : "Drop your piano score here"}
          </p>
          <p className="text-sm text-[oklch(0.55_0.015_265)] mb-1">
            or <span className="text-[oklch(0.78_0.12_85)] underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-xs text-[oklch(0.40_0.012_265)]">
            Supports PDF, PNG, JPG, WEBP — any piano composition
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {["Beethoven Sonatas", "Chopin Études", "Bach Inventions", "Mozart Variations", "Schubert Impromptus"].map((ex) => (
            <span key={ex} className="text-[0.65rem] font-mono text-[oklch(0.45_0.010_265)] border border-[oklch(0.24_0.016_265)] rounded-full px-2.5 py-1">
              {ex}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Composition Card ──────────────────────────────────────────────────────────
function CompositionCard({ composition, progressSummary }: { composition: any; progressSummary: { completedDays: number; totalDays: number; percentage: number } | null }) {
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const analysis = composition.analysis as any;
  const utils = trpc.useUtils();

  // Poll while pending or analyzing; also poll once on error to get the message
  const { data: statusData } = trpc.compositions.status.useQuery(
    { id: composition.id },
    {
      enabled: composition.status === "analyzing" || composition.status === "pending" || composition.status === "error",
      refetchInterval: (query) => {
        const s = (query.state.data as any)?.status;
        return (s === "analyzing" || s === "pending") ? 3000 : false;
      },
    }
  );

  const deleteMutation = trpc.compositions.delete.useMutation({
    onSuccess: () => {
      utils.compositions.list.invalidate();
      toast.success("Composition removed from your library.");
    },
    onError: (err) => {
      toast.error("Failed to remove: " + err.message);
      setConfirmDelete(false);
    },
  });

  const currentStatus = statusData?.status ?? composition.status;
  const errorMsg = statusData?.errorMessage ?? null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      deleteMutation.mutate({ id: composition.id });
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="relative group/card">
      <button
        onClick={() => currentStatus === "complete" && navigate(`/composition/${composition.id}`)}
        disabled={currentStatus !== "complete"}
        className={`w-full text-left nocturne-card p-5 transition-all duration-200 group
          ${currentStatus === "complete"
            ? "hover:border-[oklch(0.50_0.06_85)] hover:bg-[oklch(0.17_0.016_265)] cursor-pointer"
            : "cursor-default opacity-80"
          }`}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[oklch(0.78_0.12_85/0.10)] border border-[oklch(0.78_0.12_85/0.20)] flex items-center justify-center shrink-0">
            <Music size={18} className="text-[oklch(0.78_0.12_85)]" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-['Playfair_Display'] font-semibold text-[oklch(0.88_0.01_85)] truncate">
                {analysis?.title ?? composition.title}
              </p>
              <StatusBadge status={currentStatus} />
            </div>
            {analysis?.composer && (
              <p className="text-xs text-[oklch(0.55_0.015_265)] mb-1">{analysis.composer}</p>
            )}
            {analysis?.overview ? (
              <p className="text-xs text-[oklch(0.45_0.012_265)] line-clamp-2 leading-relaxed">
                {analysis.overview}
              </p>
            ) : currentStatus === "analyzing" ? (
              <p className="text-xs text-amber-400/70 italic">AI is generating your analysis and 30-day framework…</p>
            ) : currentStatus === "error" ? (
              <p className="text-xs text-red-400/70 italic">
                {errorMsg ? `Error: ${errorMsg.slice(0, 120)}` : "Analysis failed. Please try uploading again."}
              </p>
            ) : (
              <p className="text-xs text-[oklch(0.40_0.012_265)] italic">Queued for analysis…</p>
            )}
            {/* Progress bar — only shown for complete compositions that have been started */}
            {currentStatus === "complete" && progressSummary && progressSummary.completedDays > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.6rem] font-mono text-[oklch(0.78_0.12_85)] uppercase tracking-wider">30-Day Progress</span>
                  <span className="text-[0.6rem] font-mono text-[oklch(0.78_0.12_85)]">
                    {progressSummary.completedDays}/30 days · {progressSummary.percentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[oklch(0.20_0.016_265)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[oklch(0.65_0.10_85)] to-[oklch(0.78_0.12_85)] transition-all duration-500"
                    style={{ width: `${progressSummary.percentage}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2">
              {analysis?.difficulty && (
                <span className="text-[0.6rem] font-mono text-[oklch(0.50_0.012_265)] border border-[oklch(0.24_0.016_265)] rounded px-1.5 py-0.5">
                  {analysis.difficulty}
                </span>
              )}
              {analysis?.key && (
                <span className="text-[0.6rem] font-mono text-[oklch(0.50_0.012_265)]">{analysis.key}</span>
              )}
              <span className="text-[0.6rem] font-mono text-[oklch(0.35_0.010_265)]">
                {new Date(composition.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          {currentStatus === "complete" && (
            <ChevronRight size={16} className="text-[oklch(0.40_0.012_265)] group-hover:text-[oklch(0.78_0.12_85)] transition-colors shrink-0 mt-1" />
          )}
        </div>
      </button>

      {/* Delete button — appears on hover */}
      <button
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        title={confirmDelete ? "Click again to confirm removal" : "Remove from library"}
        className={`absolute top-3 right-3 p-1.5 rounded-md transition-all duration-150
          opacity-0 group-hover/card:opacity-100 focus:opacity-100
          ${
            confirmDelete
              ? "bg-red-500/20 border border-red-500/50 text-red-400 opacity-100"
              : "bg-[oklch(0.18_0.016_265)] border border-[oklch(0.26_0.016_265)] text-[oklch(0.45_0.012_265)] hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10"
          }
        `}
      >
        {deleteMutation.isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Trash2 size={13} />
        )}
      </button>

      {/* Confirm tooltip */}
      {confirmDelete && (
        <div className="absolute top-10 right-3 z-20 bg-[oklch(0.16_0.018_265)] border border-red-500/30 rounded-md px-2.5 py-1.5 text-[0.65rem] text-red-300 whitespace-nowrap shadow-lg pointer-events-none">
          Click again to confirm
        </div>
      )}
    </div>
  );
}

// ── La Campanella built-in card ───────────────────────────────────────────────
function LaCampanellaCard() {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate("/composition/la-campanella")}
      className="w-full text-left nocturne-card p-5 border-[oklch(0.78_0.12_85/0.30)] hover:border-[oklch(0.78_0.12_85/0.60)] hover:bg-[oklch(0.17_0.016_265)] transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[oklch(0.78_0.12_85/0.15)] border border-[oklch(0.78_0.12_85/0.35)] flex items-center justify-center shrink-0">
          <span className="text-[oklch(0.78_0.12_85)] text-lg font-['Playfair_Display']">♪</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-['Playfair_Display'] font-semibold text-[oklch(0.88_0.01_85)]">La Campanella</p>
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono text-[oklch(0.78_0.12_85)] bg-[oklch(0.78_0.12_85/0.10)] border border-[oklch(0.78_0.12_85/0.25)] rounded-full px-2 py-0.5">
              <CheckCircle2 size={10} /> Featured
            </span>
          </div>
          <p className="text-xs text-[oklch(0.55_0.015_265)] mb-1">Franz Liszt · S. 141 No. 3</p>
          <p className="text-xs text-[oklch(0.45_0.012_265)] line-clamp-2 leading-relaxed">
            The definitive 1851 G-sharp minor version — one of the most celebrated and technically demanding works in the piano repertoire.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[0.6rem] font-mono text-[oklch(0.50_0.012_265)] border border-[oklch(0.24_0.016_265)] rounded px-1.5 py-0.5">Advanced</span>
            <span className="text-[0.6rem] font-mono text-[oklch(0.50_0.012_265)]">G-sharp minor</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[oklch(0.40_0.012_265)] group-hover:text-[oklch(0.78_0.12_85)] transition-colors shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const [uploading, setUploading] = useState(false);
  const utils = trpc.useUtils();

  const { data: compositions = [], isLoading } = trpc.compositions.list.useQuery();
  const { data: progressSummaries = [] } = trpc.progress.summaryAll.useQuery();

  // Build a lookup map: compositionId → { completedDays, percentage }
  const progressMap = Object.fromEntries(
    progressSummaries.map((s) => [s.compositionId, s])
  );

  const uploadMutation = trpc.compositions.upload.useMutation({
    onSuccess: () => {
      utils.compositions.list.invalidate();
      toast.success("Score uploaded! AI analysis is running — it will be ready in about 30 seconds.");
    },
    onError: (err) => {
      toast.error("Upload failed: " + err.message);
    },
  });

  const handleUpload = useCallback(async (file: File) => {
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      toast.error("File is too large. Please upload a file under 15MB.");
      return;
    }

    setUploading(true);
    try {
      const [base64Data, extractedText] = await Promise.all([
        fileToBase64(file),
        extractTextFromFile(file),
      ]);

      await uploadMutation.mutateAsync({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64Data,
        extractedText,
      });
    } catch (err) {
      // error handled by onError
    } finally {
      setUploading(false);
    }
  }, [uploadMutation]);

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_265)] text-[oklch(0.92_0.01_85)]">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.018_265/0.6)] to-[oklch(0.12_0.018_265)]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 sm:py-24">
          {/* Nav */}
          <NavBar />

          {/* Hero text */}
          <div className="max-w-3xl">
            <p className="font-mono text-[0.65rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em] mb-4">
              AI-Powered Practice Framework Generator
            </p>
            <h1 className="font-['Playfair_Display'] font-black text-5xl sm:text-6xl lg:text-7xl leading-none mb-6">
              <span className="text-[oklch(0.92_0.01_85)]">Master Any</span>
              <br />
              <span className="text-[oklch(0.78_0.12_85)] italic">Piano Composition</span>
            </h1>
            <p className="text-[oklch(0.65_0.015_265)] text-lg max-w-xl leading-relaxed">
              Upload any piano score — PDF or image — and receive a complete technical analysis, targeted Hanon exercise mapping, and a personalized 30-day practice framework generated by AI.
            </p>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 pb-24">

        {/* How it works */}
        <div className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { step: "01", title: "Upload Your Score", desc: "Drag and drop any piano score as a PDF or image file." },
            { step: "02", title: "AI Analyzes the Piece", desc: "Our AI identifies technical challenges, key, difficulty, and relevant Hanon exercises." },
            { step: "03", title: "Get Your 30-Day Plan", desc: "Receive a personalized daily practice schedule with milestones and goals." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="nocturne-card p-5">
              <p className="font-mono text-[oklch(0.78_0.12_85)] text-2xl font-bold mb-3">{step}</p>
              <h3 className="font-['Playfair_Display'] font-semibold text-[oklch(0.88_0.01_85)] mb-2">{title}</h3>
              <p className="text-sm text-[oklch(0.55_0.015_265)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[oklch(0.78_0.12_85)]">♪</span>
            <div className="flex-1 h-px bg-gradient-to-r from-[oklch(0.78_0.12_85/0.4)] to-transparent" />
            <p className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">Upload a Score</p>
            <div className="flex-1 h-px bg-gradient-to-l from-[oklch(0.78_0.12_85/0.4)] to-transparent" />
            <span className="text-[oklch(0.78_0.12_85)]">♪</span>
          </div>

          {uploading ? (
            <div className="rounded-2xl border-2 border-dashed border-[oklch(0.78_0.12_85/0.4)] p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="text-[oklch(0.78_0.12_85)] animate-spin" />
                <p className="font-['Playfair_Display'] text-xl text-[oklch(0.88_0.01_85)]">Uploading your score…</p>
                <p className="text-sm text-[oklch(0.55_0.015_265)]">Sending to AI for analysis</p>
              </div>
            </div>
          ) : (
            <UploadZone onUpload={handleUpload} />
          )}
        </div>

        {/* Sheet music search */}
        <SheetMusicSearch />

        {/* Composition library */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[oklch(0.78_0.12_85)]">♪</span>
            <div className="flex-1 h-px bg-gradient-to-r from-[oklch(0.78_0.12_85/0.4)] to-transparent" />
            <p className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">Your Library</p>
            <div className="flex-1 h-px bg-gradient-to-l from-[oklch(0.78_0.12_85/0.4)] to-transparent" />
            <span className="text-[oklch(0.78_0.12_85)]">♪</span>
          </div>

          <div className="grid gap-3">
            {/* Built-in La Campanella */}
            <LaCampanellaCard />

            {/* Uploaded compositions */}
            {isLoading ? (
              <div className="nocturne-card p-8 text-center">
                <Loader2 size={24} className="text-[oklch(0.78_0.12_85)] animate-spin mx-auto mb-3" />
                <p className="text-sm text-[oklch(0.55_0.015_265)]">Loading your library…</p>
              </div>
            ) : compositions.length === 0 ? (
              <div className="nocturne-card p-8 text-center border-dashed">
                <BookOpen size={28} className="text-[oklch(0.35_0.010_265)] mx-auto mb-3" />
                <p className="text-sm text-[oklch(0.45_0.012_265)]">No uploaded compositions yet.</p>
                <p className="text-xs text-[oklch(0.35_0.010_265)] mt-1">Upload a score above to get started.</p>
              </div>
            ) : (
              compositions.map((comp) => (
                <CompositionCard
                  key={comp.id}
                  composition={comp}
                  progressSummary={progressMap[comp.id] ?? null}
                />
              ))
            )}
          </div>
        </div>

      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[oklch(0.20_0.014_265)] py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_TREBLE} alt="" className="h-6 w-auto" />
            <p className="text-xs text-[oklch(0.40_0.012_265)]">Piano Mastery Portal</p>
          </div>
          <p className="text-xs text-[oklch(0.30_0.010_265)]">Powered by AI · Hanon 60 Exercises</p>
        </div>
      </footer>
    </div>
  );
}
