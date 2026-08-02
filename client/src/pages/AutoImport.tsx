import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { CheckCircle, XCircle, SkipForward, Clock, FolderOpen, RefreshCw, Calendar, Play } from "lucide-react";

type ImportStatus = "imported" | "skipped" | "error";

function StatusBadge({ status }: { status: ImportStatus }) {
  if (status === "imported") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400 border border-green-800">
        <CheckCircle className="w-3 h-3" /> Imported
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-400 border border-yellow-800">
        <SkipForward className="w-3 h-3" /> Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/40 text-red-400 border border-red-800">
      <XCircle className="w-3 h-3" /> Error
    </span>
  );
}

export default function AutoImport() {
  const { user, loading: authLoading } = useAuth();
  const { data: history, isLoading, refetch } = trpc.autoImport.list.useQuery(undefined, {
    enabled: !!user,
  });
  const [runResult, setRunResult] = useState<null | { imported: number; skipped: number; errors: number; scanned: number; newPianoFiles: number; results: { filename: string; status: string }[] }>(null);
  const runNow = trpc.autoImport.runNow.useMutation({
    onSuccess: (data) => {
      setRunResult(data);
      refetch();
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8a7a5a] mb-4">Sign in to view your auto-import history</p>
          <a href={getLoginUrl()} className="px-4 py-2 bg-[#c9a84c] text-black rounded font-medium hover:bg-[#b8973b] transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const imported = history?.filter(f => f.status === "imported").length ?? 0;
  const skipped = history?.filter(f => f.status === "skipped").length ?? 0;
  const errors = history?.filter(f => f.status === "error").length ?? 0;
  const lastRun = history && history.length > 0 ? new Date(history[0].importedAt) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8d5a3]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-[#8a7a5a] hover:text-[#c9a84c] transition-colors text-sm">← Back to Portal</a>
          <span className="text-[#3a3a3a]">/</span>
          <h1 className="text-[#c9a84c] font-semibold">Auto-Import</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#8a7a5a] hover:text-[#c9a84c] border border-[#2a2a2a] hover:border-[#c9a84c]/40 rounded transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Run Now button */}
        <div className="bg-[#111] border border-[#c9a84c]/30 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[#e8d5a3] font-semibold">Run Import Now</h2>
              <p className="text-[#8a7a5a] text-sm mt-1">
                Immediately scan your <strong className="text-[#c9a84c]">Piano - New Music to Learn</strong> folder on your OneDrive Personal and import any new PDFs into your library.
              </p>
            </div>
            <button
              onClick={() => { setRunResult(null); runNow.mutate(); }}
              disabled={runNow.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a84c] text-black font-semibold rounded-lg hover:bg-[#b8973b] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
            >
              {runNow.isPending ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Scanning...</>
              ) : (
                <><Play className="w-4 h-4" /> Run Now</>
              )}
            </button>
          </div>

          {/* Run result */}
          {runNow.isError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 text-sm">
              {runNow.error.message}
            </div>
          )}
          {runResult && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 bg-[#1a1a1a] rounded-full text-[#8a7a5a]">Scanned {runResult.scanned} PDFs</span>
                <span className="px-3 py-1 bg-[#1a1a1a] rounded-full text-[#8a7a5a]">{runResult.newPianoFiles} new piano files found</span>
                <span className="px-3 py-1 bg-green-900/30 rounded-full text-green-400">{runResult.imported} imported</span>
                {runResult.skipped > 0 && <span className="px-3 py-1 bg-yellow-900/30 rounded-full text-yellow-400">{runResult.skipped} skipped</span>}
                {runResult.errors > 0 && <span className="px-3 py-1 bg-red-900/30 rounded-full text-red-400">{runResult.errors} errors</span>}
              </div>
              {runResult.results.length > 0 && (
                <div className="bg-[#0d0d0d] rounded-lg divide-y divide-[#1a1a1a] max-h-48 overflow-y-auto">
                  {runResult.results.map((r, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#8a7a5a] truncate">{r.filename}</span>
                      <span className={r.status === "imported" ? "text-green-400 flex-shrink-0" : r.status.startsWith("skipped") ? "text-yellow-400 flex-shrink-0" : "text-red-400 flex-shrink-0"}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {runResult.imported > 0 && (
                <p className="text-[#c9a84c] text-sm">✓ {runResult.imported} new piece{runResult.imported !== 1 ? "s" : ""} added to your library — AI analysis is running in the background.</p>
              )}
              {runResult.imported === 0 && runResult.newPianoFiles === 0 && (
                <p className="text-[#8a7a5a] text-sm">No new piano PDFs found — your library is up to date!</p>
              )}
            </div>
          )}
        </div>

        {/* Schedule info card */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-[#c9a84c]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#e8d5a3] font-semibold mb-1">Weekly Auto-Import Schedule</h2>
              <p className="text-[#8a7a5a] text-sm leading-relaxed">
                Every Sunday at 9:00 AM UTC, a Manus agent scans your <strong className="text-[#c9a84c]">Piano - New Music to Learn</strong> folder on your OneDrive Personal for new PDFs.
                Any PDFs not previously imported are automatically uploaded to your library and analyzed by AI.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-[#8a7a5a]">
                  <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Runs every Sunday 9:00 AM UTC</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8a7a5a]">
                  <FolderOpen className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Scans: OneDrive Personal / Piano - New Music to Learn/</span>
                </div>
              </div>
              {lastRun && (
                <p className="mt-2 text-xs text-[#6a5a3a]">
                  Last activity: {lastRun.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Imported", value: imported, color: "text-green-400" },
            { label: "Skipped (duplicates)", value: skipped, color: "text-yellow-400" },
            { label: "Errors", value: errors, color: "text-red-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[#8a7a5a] text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Import history table */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-[#e8d5a3] font-semibold">Import History</h2>
            <span className="text-[#8a7a5a] text-sm">{history?.length ?? 0} records</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <FolderOpen className="w-12 h-12 text-[#3a3a3a] mb-4" />
              <p className="text-[#8a7a5a] font-medium">No imports yet</p>
              <p className="text-[#6a5a3a] text-sm mt-1">
                The weekly agent will run every Sunday and automatically import new PDFs from your 'Piano - New Music to Learn' folder on your OneDrive Personal.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {history.map(file => (
                <div key={file.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#151515] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e8d5a3] text-sm font-medium truncate">{file.filename}</p>
                    {file.errorMessage && (
                      <p className="text-red-400 text-xs mt-0.5 truncate">{file.errorMessage}</p>
                    )}
                    {file.compositionId && (
                      <a
                        href={`/composition/${file.compositionId}`}
                        className="text-[#c9a84c] text-xs hover:underline mt-0.5 inline-block"
                      >
                        View in library →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {file.fileSize && (
                      <span className="text-[#6a5a3a] text-xs">
                        {(file.fileSize / 1024).toFixed(0)} KB
                      </span>
                    )}
                    <StatusBadge status={file.status as ImportStatus} />
                    <span className="text-[#6a5a3a] text-xs whitespace-nowrap">
                      {new Date(file.importedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6">
          <h2 className="text-[#e8d5a3] font-semibold mb-4">How It Works</h2>
          <ol className="space-y-3">
            {[
              "Every Sunday at 9 AM UTC, a Manus agent wakes up and scans your 'Piano - New Music to Learn' folder on your OneDrive Personal",
              "It finds all PDF files not previously imported (tracked by filename in the database)",
              "Each new PDF is uploaded to your portal's secure storage and added to your library",
              "The AI immediately analyzes each piece and generates a 30-day practice framework",
              "Tip: drop any new Scribd PDFs into your OneDrive 'Piano - New Music to Learn' folder and they'll be picked up automatically!",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#8a7a5a]">
                <span className="w-5 h-5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
