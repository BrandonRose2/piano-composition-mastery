import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Music, BookOpen, Dumbbell, Calendar, Youtube, Loader2 } from "lucide-react";

const FEATURES = [
  { icon: BookOpen, label: "AI Score Analysis", desc: "Upload any piano score and receive a complete technical evaluation." },
  { icon: Dumbbell, label: "Hanon Exercises", desc: "Targeted Hanon exercises mapped directly to your piece's demands." },
  { icon: Calendar, label: "30-Day Framework", desc: "A personalized daily practice schedule with milestone tracking." },
  { icon: Youtube, label: "Performance Videos", desc: "Watch the most-viewed professional recording of your piece." },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // If already logged in, redirect to the main app
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[oklch(0.08_0.016_265)]">
        <Loader2 size={32} className="animate-spin text-[oklch(0.78_0.12_85)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.08_0.016_265)] flex flex-col">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[oklch(0.78_0.12_85/0.04)] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-[oklch(0.55_0.10_265/0.06)] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-[oklch(0.18_0.016_265)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.78_0.12_85/0.15)] border border-[oklch(0.78_0.12_85/0.3)] flex items-center justify-center">
            <Music size={16} className="text-[oklch(0.78_0.12_85)]" />
          </div>
          <span className="font-['Playfair_Display'] font-bold text-lg text-[oklch(0.92_0.01_85)]">Piano Mastery</span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Bell ornament */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[oklch(0.78_0.12_85/0.5)]" />
          <span className="text-[oklch(0.78_0.12_85)] text-xs font-mono tracking-[0.3em] uppercase">Your Personal Practice Studio</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[oklch(0.78_0.12_85/0.5)]" />
        </div>

        <h1 className="font-['Playfair_Display'] font-bold text-5xl sm:text-7xl text-[oklch(0.92_0.01_85)] leading-tight mb-6 max-w-3xl">
          Master Any<br />
          <span className="text-[oklch(0.78_0.12_85)]">Piano Composition</span>
        </h1>

        <p className="text-[oklch(0.60_0.015_265)] text-lg leading-relaxed max-w-xl mb-12">
          Upload any piano score and receive an AI-powered technical analysis, a targeted Hanon exercise plan,
          and a personalized 30-day practice framework — all in one place.
        </p>

        {/* Sign in button */}
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl
            bg-[oklch(0.78_0.12_85/0.12)] border border-[oklch(0.78_0.12_85/0.4)]
            text-[oklch(0.88_0.08_85)] font-['Playfair_Display'] font-semibold text-lg
            hover:bg-[oklch(0.78_0.12_85/0.20)] hover:border-[oklch(0.78_0.12_85/0.7)]
            transition-all duration-200 active:scale-[0.97]"
        >
          <Music size={20} className="text-[oklch(0.78_0.12_85)] group-hover:scale-110 transition-transform" />
          Sign in to begin
        </button>

        <p className="mt-4 text-xs text-[oklch(0.35_0.012_265)] font-mono">
          Each account has its own private library — your compositions stay yours.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20 max-w-5xl w-full">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label}
              className="p-5 rounded-xl border border-[oklch(0.18_0.016_265)] bg-[oklch(0.10_0.016_265/0.6)]
                text-left hover:border-[oklch(0.78_0.12_85/0.25)] transition-colors duration-200">
              <div className="w-9 h-9 rounded-lg bg-[oklch(0.78_0.12_85/0.10)] border border-[oklch(0.78_0.12_85/0.2)]
                flex items-center justify-center mb-3">
                <Icon size={15} className="text-[oklch(0.78_0.12_85)]" />
              </div>
              <p className="font-['Playfair_Display'] font-semibold text-sm text-[oklch(0.88_0.01_85)] mb-1">{label}</p>
              <p className="text-xs text-[oklch(0.45_0.012_265)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-[oklch(0.14_0.016_265)]">
        <p className="text-xs text-[oklch(0.30_0.012_265)] font-mono">
          Piano Mastery — powered by AI analysis &amp; the Hanon 60 Exercises
        </p>
      </footer>
    </div>
  );
}
