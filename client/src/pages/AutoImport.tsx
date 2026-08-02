import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  CheckCircle, XCircle, SkipForward, Clock, FolderOpen,
  RefreshCw, Calendar, Upload, FileText, X, BookOpen, Library, ExternalLink
} from "lucide-react";

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

type FileEntry = {
  file: File;
  status: "pending" | "uploading" | "imported" | "skipped" | "error";
  reason?: string;
  compositionId?: number | null;
};

export default function AutoImport() {
  const { user, loading: authLoading } = useAuth();
  const { data: history, isLoading, refetch } = trpc.autoImport.list.useQuery(undefined, {
    enabled: !!user,
  });

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = trpc.autoImport.uploadFile.useMutation();

  // Scribd sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; error?: string } | null>(null);
  const { data: savedDocs, refetch: refetchSaved } = trpc.scribd.getSavedDocs.useQuery(undefined, { enabled: !!user });
  const syncSaved = trpc.scribd.syncSaved.useMutation();

  /**
   * Scrape the user's Scribd saved list from the browser (works because the user is logged in),
   * then send the list to the server to cache in the DB.
   */
  const syncScribdLibrary = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      // Fetch the Scribd saved list page through the browser
      const res = await fetch("https://www.scribd.com/reading-list/saved", {
        credentials: "include",
        headers: { "Accept": "text/html,application/xhtml+xml,*/*" },
      });
      const html = await res.text();

      // Extract document links from the HTML
      const docs: { docId: string; title: string; url: string; slug: string }[] = [];
      const seen = new Set<string>();

      // Pattern 1: href="/document/123/slug-title"
      const docPattern = /href="\/document\/(\d+)\/([^"?#]+)"/g;
      let m;
      while ((m = docPattern.exec(html)) !== null) {
        const docId = m[1];
        const slug = m[2];
        if (seen.has(docId)) continue;
        seen.add(docId);
        const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        docs.push({
          docId,
          title,
          url: `https://www.scribd.com/document/${docId}/${slug}`,
          slug,
        });
      }

      if (docs.length === 0) {
        // Scribd returned a JS-only page — open it in a new tab so user can log in
        setSyncResult({ synced: 0, error: "Scribd returned a login/challenge page. Make sure you are logged into Scribd in this browser, then try again." });
        setIsSyncing(false);
        return;
      }

      const result = await syncSaved.mutateAsync(docs);
      setSyncResult({ synced: result.synced });
      refetchSaved();
    } catch (err) {
      setSyncResult({ synced: 0, error: err instanceof Error ? err.message : String(err) });
    }
    setIsSyncing(false);
  };

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.name.toLowerCase().endsWith(".pdf"));
    setFiles(prev => {
      const existingNames = new Set(prev.map(e => e.file.name));
      const toAdd = pdfs
        .filter(f => !existingNames.has(f.name))
        .map(f => ({ file: f, status: "pending" as const }));
      return [...prev, ...toAdd];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  }, [addFiles]);

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== name));
  };

  const runImport = async () => {
    const pending = files.filter(f => f.status === "pending");
    if (pending.length === 0) return;
    setIsRunning(true);

    for (const entry of pending) {
      // Mark as uploading
      setFiles(prev => prev.map(f =>
        f.file.name === entry.file.name ? { ...f, status: "uploading" } : f
      ));

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(entry.file);
        });

        const result = await uploadFile.mutateAsync({
          fileName: entry.file.name,
          base64Data,
          fileSize: entry.file.size,
        });

        setFiles(prev => prev.map(f =>
          f.file.name === entry.file.name
            ? { ...f, status: result.status as "imported" | "skipped", reason: result.reason, compositionId: result.compositionId }
            : f
        ));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFiles(prev => prev.map(f =>
          f.file.name === entry.file.name ? { ...f, status: "error", reason: msg } : f
        ));
      }
    }

    setIsRunning(false);
    refetch();
  };

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

  const pendingCount = files.filter(f => f.status === "pending").length;
  const doneCount = files.filter(f => f.status === "imported" || f.status === "skipped" || f.status === "error").length;

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

        {/* Drag-and-drop upload zone */}
        <div className="bg-[#111] border border-[#c9a84c]/30 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-[#e8d5a3] font-semibold">Batch Import PDFs</h2>
            <p className="text-[#8a7a5a] text-sm mt-1">
              Drag your <strong className="text-[#c9a84c]">Piano - New Music to Learn</strong> PDFs from your OneDrive folder directly into the box below, or click to browse. Then hit <strong className="text-[#c9a84c]">Import All</strong>.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragging
                ? "border-[#c9a84c] bg-[#c9a84c]/5"
                : "border-[#3a3a3a] hover:border-[#c9a84c]/50 hover:bg-[#c9a84c]/3"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-[#c9a84c]" : "text-[#3a3a3a]"}`} />
            <p className={`font-medium ${isDragging ? "text-[#c9a84c]" : "text-[#8a7a5a]"}`}>
              {isDragging ? "Drop PDFs here" : "Drag & drop PDFs here, or click to browse"}
            </p>
            <p className="text-[#6a5a3a] text-xs mt-1">Select multiple files at once • PDF only • Max 20MB each</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8a7a5a]">
                <span>{files.length} file{files.length !== 1 ? "s" : ""} selected</span>
                {!isRunning && doneCount === 0 && (
                  <button onClick={() => setFiles([])} className="text-[#6a5a3a] hover:text-red-400 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
              <div className="bg-[#0d0d0d] rounded-lg divide-y divide-[#1a1a1a] max-h-64 overflow-y-auto">
                {files.map(entry => (
                  <div key={entry.file.name} className="px-4 py-2.5 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[#c9a84c]/60 flex-shrink-0" />
                    <span className="flex-1 text-xs text-[#e8d5a3] truncate">{entry.file.name}</span>
                    <span className="text-xs text-[#6a5a3a] flex-shrink-0">
                      {(entry.file.size / 1024).toFixed(0)} KB
                    </span>
                    {entry.status === "pending" && !isRunning && (
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(entry.file.name); }}
                        className="text-[#6a5a3a] hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {entry.status === "uploading" && (
                      <div className="w-3.5 h-3.5 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {entry.status === "imported" && <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                    {entry.status === "skipped" && (
                      <span className="text-xs text-yellow-400 flex-shrink-0">{entry.reason ?? "Skipped"}</span>
                    )}
                    {entry.status === "error" && (
                      <span className="text-xs text-red-400 flex-shrink-0 max-w-32 truncate" title={entry.reason}>Error</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Import button */}
              {pendingCount > 0 && (
                <button
                  onClick={runImport}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#c9a84c] text-black font-semibold rounded-lg hover:bg-[#b8973b] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {isRunning ? (
                    <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Importing...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Import {pendingCount} PDF{pendingCount !== 1 ? "s" : ""}</>
                  )}
                </button>
              )}

              {/* Summary after import */}
              {!isRunning && doneCount > 0 && pendingCount === 0 && (
                <div className="flex flex-wrap gap-3 text-sm pt-1">
                  {files.filter(f => f.status === "imported").length > 0 && (
                    <span className="px-3 py-1 bg-green-900/30 rounded-full text-green-400">
                      ✓ {files.filter(f => f.status === "imported").length} imported
                    </span>
                  )}
                  {files.filter(f => f.status === "skipped").length > 0 && (
                    <span className="px-3 py-1 bg-yellow-900/30 rounded-full text-yellow-400">
                      {files.filter(f => f.status === "skipped").length} skipped (already in library)
                    </span>
                  )}
                  {files.filter(f => f.status === "error").length > 0 && (
                    <span className="px-3 py-1 bg-red-900/30 rounded-full text-red-400">
                      {files.filter(f => f.status === "error").length} errors
                    </span>
                  )}
                  <span className="text-[#8a7a5a] text-xs self-center">AI analysis running in background</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Scribd Library card */}
        <div className="bg-[#111] border border-[#c9a84c]/20 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center flex-shrink-0">
              <Library className="w-5 h-5 text-[#c9a84c]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#e8d5a3] font-semibold mb-1">Sync Scribd Library</h2>
              <p className="text-[#8a7a5a] text-sm leading-relaxed">
                Cache your Scribd saved documents so the sheet music finder can check <strong className="text-[#c9a84c]">your own library first</strong> when you paste a Spotify or YouTube link.
                {savedDocs && savedDocs.length > 0 && (
                  <span className="ml-1 text-[#c9a84c]">{savedDocs.length} docs cached.</span>
                )}
              </p>
            </div>
            <button
              onClick={syncScribdLibrary}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] text-black font-semibold rounded-lg hover:bg-[#b8973b] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] text-sm flex-shrink-0"
            >
              {isSyncing ? (
                <><div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5" /> Sync Now</>
              )}
            </button>
          </div>

          {/* Sync result feedback */}
          {syncResult && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              syncResult.error
                ? "bg-red-900/20 border border-red-800 text-red-400"
                : "bg-green-900/20 border border-green-800 text-green-400"
            }`}>
              {syncResult.error
                ? syncResult.error
                : `✓ ${syncResult.synced} Scribd documents cached. The sheet music finder will now check your library first.`
              }
            </div>
          )}

          {/* Cached docs preview */}
          {savedDocs && savedDocs.length > 0 && (
            <div className="bg-[#0d0d0d] rounded-lg divide-y divide-[#1a1a1a] max-h-48 overflow-y-auto">
              {savedDocs.slice(0, 20).map(doc => (
                <div key={doc.docId} className="px-4 py-2.5 flex items-center gap-3">
                  <BookOpen className="w-3.5 h-3.5 text-[#c9a84c]/50 flex-shrink-0" />
                  <span className="flex-1 text-xs text-[#e8d5a3] truncate">{doc.title}</span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[#c9a84c]/50 hover:text-[#c9a84c] transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
              {savedDocs.length > 20 && (
                <div className="px-4 py-2 text-xs text-[#6a5a3a] text-center">
                  +{savedDocs.length - 20} more
                </div>
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
                Drag your PDFs into the upload zone above to get started.
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
              "Open your OneDrive 'Piano - New Music to Learn' folder in Finder",
              "Select all your piano PDFs (Cmd+A) and drag them into the upload zone above",
              "Click 'Import All' — each PDF is uploaded to your portal's secure storage",
              "The AI immediately analyzes each piece and generates a 30-day practice framework",
              "Duplicates are automatically skipped — safe to drag the whole folder every time",
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
