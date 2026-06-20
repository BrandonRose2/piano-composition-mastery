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
// Platform definitions for streaming links
const STREAMING_PLATFORMS = [
  {
    name: "Spotify",
    color: "#1DB954",
    bg: "oklch(0.42_0.14_145/0.15)",
    border: "oklch(0.42_0.14_145/0.35)",
    textColor: "oklch(0.72_0.14_145)",
    getUrl: (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  {
    name: "Apple Music",
    color: "#FC3C44",
    bg: "oklch(0.45_0.20_20/0.15)",
    border: "oklch(0.45_0.20_20/0.35)",
    textColor: "oklch(0.72_0.18_20)",
    getUrl: (q: string) => `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a5.485 5.485 0 00-.36 1.548c-.06.625-.068 1.252-.078 1.878v9.908c.01.59.013 1.18.06 1.77.124 1.51.73 2.777 1.896 3.758a5.04 5.04 0 002.207.99c.65.12 1.308.148 1.966.15h9.99c.658-.002 1.316-.03 1.966-.15a5.04 5.04 0 002.207-.99c1.166-.98 1.772-2.248 1.896-3.758.047-.59.05-1.18.06-1.77V6.634c0-.17-.003-.34-.008-.51zM12 17.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zm5.75-9.875a1.375 1.375 0 110-2.75 1.375 1.375 0 010 2.75zM12 8a4 4 0 100 8 4 4 0 000-8z"/>
      </svg>
    ),
  },
  {
    name: "YouTube Music",
    color: "#FF0000",
    bg: "oklch(0.45_0.22_25/0.15)",
    border: "oklch(0.45_0.22_25/0.35)",
    textColor: "oklch(0.68_0.20_25)",
    getUrl: (q: string) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
      </svg>
    ),
  },
  {
    name: "SoundCloud",
    color: "#FF5500",
    bg: "oklch(0.48_0.18_40/0.15)",
    border: "oklch(0.48_0.18_40/0.35)",
    textColor: "oklch(0.72_0.16_40)",
    getUrl: (q: string) => `https://soundcloud.com/search?q=${encodeURIComponent(q)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M1.175 12.225c-.015.065-.025.13-.025.2s.01.135.025.2l.65 4.125-.65 4.125c-.015.065-.025.13-.025.2s.01.135.025.2c.075.35.375.6.75.6s.675-.25.75-.6l.75-4.525-.75-4.525c-.075-.35-.375-.6-.75-.6s-.675.25-.75.6zm3.025-.35c-.025.075-.025.15-.025.225s0 .15.025.225l.525 4.25-.525 4.25c-.025.075-.025.15-.025.225s0 .15.025.225c.075.375.4.65.8.65s.725-.275.8-.65l.6-4.7-.6-4.7c-.075-.375-.4-.65-.8-.65s-.725.275-.8.65zm3.1-.525c-.025.075-.025.15-.025.225s0 .15.025.225l.45 4.775-.45 4.775c-.025.075-.025.15-.025.225s0 .15.025.225c.075.4.425.7.85.7s.775-.3.85-.7l.525-5-.525-5c-.075-.4-.425-.7-.85-.7s-.775.3-.85.7zm3.15-.5c-.025.075-.025.15-.025.225s0 .15.025.225l.375 5.275-.375 5.275c-.025.075-.025.15-.025.225s0 .15.025.225c.075.425.45.75.9.75s.825-.325.9-.75l.425-5.5-.425-5.5c-.075-.425-.45-.75-.9-.75s-.825.325-.9.75zM18 7.5c-.55 0-1.075.1-1.575.275C16.15 5.1 13.85 3 11.1 3c-.7 0-1.375.15-1.975.4-.225.1-.275.225-.275.35v13.5c0 .15.1.275.25.3H18c1.65 0 3-1.35 3-3s-1.35-3-3-3z"/>
      </svg>
    ),
  },
  {
    name: "Tidal",
    color: "#00FFFF",
    bg: "oklch(0.75_0.10_195/0.10)",
    border: "oklch(0.75_0.10_195/0.25)",
    textColor: "oklch(0.72_0.08_195)",
    getUrl: (q: string) => `https://tidal.com/search?q=${encodeURIComponent(q)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004 4.004-4.004 4.004 4.004 4.004-4.004zM8.008 16.004l4.004-4.004 4.004 4.004L20.02 12l-4.004-4.004-4.004 4.004L8.008 7.996 4.004 12z"/>
      </svg>
    ),
  },
];

function SheetMusicSearch() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"scores" | "streaming">("scores");

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
        <p className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">Find Music & Sheet Music</p>
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
            placeholder="Search any piano composition or composer… e.g. Chopin Ballade No. 1"
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
      </form>

      {/* Results panel */}
      {open && submitted && (
        <div className="mt-5">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[oklch(0.14_0.016_265)] border border-[oklch(0.22_0.014_265)] w-fit">
            <button
              onClick={() => setActiveTab("scores")}
              className={`px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === "scores"
                  ? "bg-[oklch(0.78_0.12_85)] text-[oklch(0.12_0.018_265)] font-bold"
                  : "text-[oklch(0.50_0.012_265)] hover:text-[oklch(0.70_0.012_265)]"
              }`}
            >
              📄 Sheet Music
            </button>
            <button
              onClick={() => setActiveTab("streaming")}
              className={`px-4 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === "streaming"
                  ? "bg-[oklch(0.78_0.12_85)] text-[oklch(0.12_0.018_265)] font-bold"
                  : "text-[oklch(0.50_0.012_265)] hover:text-[oklch(0.70_0.012_265)]"
              }`}
            >
              🎵 Stream
            </button>
          </div>

          {/* Sheet music tab */}
          {activeTab === "scores" && (
            isFetching ? (
              <div className="nocturne-card p-8 text-center">
                <Loader2 size={24} className="text-[oklch(0.78_0.12_85)] animate-spin mx-auto mb-3" />
                <p className="text-sm text-[oklch(0.55_0.015_265)]">Searching IMSLP for "{submitted}"…</p>
              </div>
            ) : results.length === 0 ? (
              <div className="nocturne-card p-8 text-center border-dashed">
                <FileText size={28} className="text-[oklch(0.35_0.010_265)] mx-auto mb-3" />
                <p className="text-sm text-[oklch(0.55_0.015_265)]">No results found for "{submitted}" on IMSLP.</p>
                <p className="text-xs text-[oklch(0.38_0.010_265)] mt-1">Try a different spelling or search by composer name only.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <p className="text-[0.65rem] font-mono text-[oklch(0.45_0.012_265)] uppercase tracking-wider mb-1">
                  {results.length} result{results.length !== 1 ? "s" : ""} from IMSLP — free PDF download
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
            )
          )}

          {/* Streaming tab */}
          {activeTab === "streaming" && (
            <div>
              <p className="text-[0.65rem] font-mono text-[oklch(0.45_0.012_265)] uppercase tracking-wider mb-3">
                Listen to "{submitted}" on your platform
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STREAMING_PLATFORMS.map((platform) => (
                  <a
                    key={platform.name}
                    href={platform.getUrl(submitted)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nocturne-card p-4 flex items-center gap-3 hover:scale-[1.02] transition-all duration-150 group/platform"
                    style={{
                      background: `${platform.bg}`,
                      borderColor: `${platform.border}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ color: platform.textColor, background: `${platform.bg}`, border: `1px solid ${platform.border}` }}
                    >
                      {platform.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-xs" style={{ color: platform.textColor }}>
                        {platform.name}
                      </p>
                      <p className="text-[0.6rem] text-[oklch(0.40_0.010_265)] mt-0.5">Search &amp; stream</p>
                    </div>
                    <ExternalLink size={12} className="text-[oklch(0.35_0.010_265)] group-hover/platform:opacity-100 opacity-50 transition-opacity shrink-0" />
                  </a>
                ))}
              </div>
              <p className="text-[0.6rem] text-[oklch(0.32_0.008_265)] mt-3 ml-1">
                Links open each platform's search for "{submitted}". A subscription may be required to stream on some platforms.
              </p>
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
