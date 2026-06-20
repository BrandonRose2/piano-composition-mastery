import { useEffect, useRef, useState, useCallback } from "react";
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Loader2, AlertCircle, Download, RotateCw
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ScoreViewerProps {
  fileUrl: string;
  mimeType: string;
  title?: string;
}

// ── PDF Viewer ────────────────────────────────────────────────────────────────
function PdfViewer({ fileUrl, title }: { fileUrl: string; title?: string }) {
  const [pages, setPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Load PDF document once
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist");
        // Set worker source — use the CDN for the matching version
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("[ScoreViewer] PDF load error:", err);
          setError("Could not load the PDF score. Please try downloading it directly.");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [fileUrl]);

  // Render current page whenever page or scale changes
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    (async () => {
      try {
        const page = await pdfDocRef.current.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: unknown) {
        // Ignore cancellation errors
        if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "RenderingCancelledException") return;
        if (!cancelled) console.error("[ScoreViewer] Render error:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [currentPage, scale, pages]);

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
  const nextPage = () => setCurrentPage(p => Math.min(p + 1, pages));

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setFullscreen(f => !f);
  }, [fullscreen]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={32} className="animate-spin text-[oklch(0.78_0.12_85)]" />
        <p className="font-mono text-xs text-[oklch(0.50_0.012_265)] uppercase tracking-widest">Loading score…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-[oklch(0.65_0.015_265)] text-center max-w-sm">{error}</p>
        <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-mono text-[oklch(0.78_0.12_85)] border border-[oklch(0.78_0.12_85/0.3)] px-3 py-1.5 rounded hover:bg-[oklch(0.78_0.12_85/0.08)] transition-colors">
          <Download size={12} /> Download PDF
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${fullscreen ? "bg-[oklch(0.10_0.016_265)] h-screen" : ""}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[oklch(0.22_0.016_265)] bg-[oklch(0.13_0.018_265)] sticky top-0 z-10">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button onClick={prevPage} disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] disabled:opacity-30 transition-colors text-[oklch(0.65_0.015_265)]">
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-xs text-[oklch(0.55_0.012_265)] min-w-[5rem] text-center">
            {currentPage} / {pages}
          </span>
          <button onClick={nextPage} disabled={currentPage >= pages}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] disabled:opacity-30 transition-colors text-[oklch(0.65_0.015_265)]">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Title */}
        <span className="font-['Playfair_Display'] text-sm text-[oklch(0.78_0.12_85)] hidden sm:block truncate max-w-xs">
          {title ?? "Score"}
        </span>

        {/* Zoom + fullscreen */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} disabled={scale <= 0.6}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] disabled:opacity-30 transition-colors text-[oklch(0.65_0.015_265)]">
            <ZoomOut size={15} />
          </button>
          <span className="font-mono text-[0.65rem] text-[oklch(0.50_0.012_265)] w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} disabled={scale >= 3.0}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] disabled:opacity-30 transition-colors text-[oklch(0.65_0.015_265)]">
            <ZoomIn size={15} />
          </button>
          <div className="w-px h-4 bg-[oklch(0.25_0.016_265)] mx-1" />
          <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]"
            title="Download PDF">
            <Download size={15} />
          </a>
          <button onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="overflow-auto flex-1 bg-[oklch(0.11_0.016_265)]">
        <div className="flex justify-center py-6 px-4">
          <canvas
            ref={canvasRef}
            className="shadow-2xl shadow-black/60 rounded"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
      </div>

      {/* Page dots for small page counts */}
      {pages <= 20 && (
        <div className="flex justify-center gap-1 py-2 bg-[oklch(0.13_0.018_265)] border-t border-[oklch(0.22_0.016_265)]">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i + 1 === currentPage ? "bg-[oklch(0.78_0.12_85)] w-3" : "bg-[oklch(0.30_0.016_265)] hover:bg-[oklch(0.50_0.016_265)]"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Image Viewer ──────────────────────────────────────────────────────────────
function ImageViewer({ fileUrl, title }: { fileUrl: string; title?: string }) {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setFullscreen(f => !f);
  }, [fullscreen]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div ref={containerRef} className={`flex flex-col ${fullscreen ? "bg-[oklch(0.10_0.016_265)] h-screen" : ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[oklch(0.22_0.016_265)] bg-[oklch(0.13_0.018_265)] sticky top-0 z-10">
        <span className="font-['Playfair_Display'] text-sm text-[oklch(0.78_0.12_85)] truncate max-w-xs">
          {title ?? "Score"}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.4))}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]">
            <ZoomOut size={15} />
          </button>
          <span className="font-mono text-[0.65rem] text-[oklch(0.50_0.012_265)] w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 4.0))}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]"
            title="Rotate">
            <RotateCw size={15} />
          </button>
          <div className="w-px h-4 bg-[oklch(0.25_0.016_265)] mx-1" />
          <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]"
            title="Download">
            <Download size={15} />
          </a>
          <button onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-[oklch(0.22_0.016_265)] transition-colors text-[oklch(0.65_0.015_265)]">
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="overflow-auto flex-1 bg-[oklch(0.11_0.016_265)]">
        <div className="flex justify-center items-start py-6 px-4 min-h-full">
          {loading && !error && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 size={28} className="animate-spin text-[oklch(0.78_0.12_85)]" />
              <p className="font-mono text-xs text-[oklch(0.50_0.012_265)]">Loading score…</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 py-16">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-sm text-[oklch(0.65_0.015_265)]">Could not load the image score.</p>
              <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono text-[oklch(0.78_0.12_85)] border border-[oklch(0.78_0.12_85/0.3)] px-3 py-1.5 rounded hover:bg-[oklch(0.78_0.12_85/0.08)] transition-colors">
                <Download size={12} /> Download
              </a>
            </div>
          )}
          <img
            src={fileUrl}
            alt={title ?? "Piano score"}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            className="shadow-2xl shadow-black/60 rounded transition-transform duration-200"
            style={{
              display: error ? "none" : "block",
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: "top center",
              maxWidth: `${100 / scale}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ScoreViewer({ fileUrl, mimeType, title }: ScoreViewerProps) {
  const isPdf = mimeType === "application/pdf" || fileUrl.toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-lg overflow-hidden border border-[oklch(0.22_0.016_265)] bg-[oklch(0.12_0.018_265)]">
      {isPdf
        ? <PdfViewer fileUrl={fileUrl} title={title} />
        : <ImageViewer fileUrl={fileUrl} title={title} />}
    </div>
  );
}
