import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Music, BookOpen, Dumbbell, Calendar, Youtube, Loader2, Eye, EyeOff, User, Lock } from "lucide-react";

const FEATURES = [
  { icon: BookOpen, label: "AI Score Analysis", desc: "Upload any piano score and receive a complete technical evaluation." },
  { icon: Dumbbell, label: "Hanon Exercises", desc: "Targeted Hanon exercises mapped directly to your piece's demands." },
  { icon: Calendar, label: "30-Day Framework", desc: "A personalized daily practice schedule with milestone tracking." },
  { icon: Youtube, label: "Performance Videos", desc: "Watch the most-viewed professional recording of your piece." },
];

type AuthMode = "landing" | "login" | "register";

export default function Landing() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<AuthMode>("landing");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => setError(err.message),
  });

  // If already logged in, redirect to the main app
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ username: username.trim(), password });
    } else if (mode === "register") {
      registerMutation.mutate({ username: username.trim(), password });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

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
        <button
          onClick={() => { setMode("landing"); setError(""); setUsername(""); setPassword(""); }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.78_0.12_85/0.15)] border border-[oklch(0.78_0.12_85/0.3)] flex items-center justify-center">
            <Music size={16} className="text-[oklch(0.78_0.12_85)]" />
          </div>
          <span className="font-['Playfair_Display'] font-bold text-lg text-[oklch(0.92_0.01_85)]">Piano Mastery</span>
        </button>

        {mode === "landing" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="px-4 py-2 text-sm text-[oklch(0.70_0.015_265)] hover:text-[oklch(0.88_0.01_85)] transition-colors font-mono"
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="px-4 py-2 rounded-lg text-sm bg-[oklch(0.78_0.12_85/0.12)] border border-[oklch(0.78_0.12_85/0.4)]
                text-[oklch(0.88_0.08_85)] hover:bg-[oklch(0.78_0.12_85/0.20)] transition-all duration-200 font-mono"
            >
              Create account
            </button>
          </div>
        )}
      </header>

      {/* Auth form panel */}
      {(mode === "login" || mode === "register") && (
        <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <h2 className="font-['Playfair_Display'] font-bold text-3xl text-[oklch(0.92_0.01_85)] mb-2">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-[oklch(0.50_0.012_265)]">
                {mode === "login"
                  ? "Sign in to access your private library"
                  : "Pick a username and password — no email needed"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-mono text-[oklch(0.55_0.012_265)] mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0.012_265)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="your_username"
                    autoComplete="username"
                    autoFocus
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-[oklch(0.12_0.016_265)] border border-[oklch(0.22_0.016_265)]
                      text-[oklch(0.88_0.01_85)] placeholder-[oklch(0.30_0.012_265)] text-sm
                      focus:outline-none focus:border-[oklch(0.78_0.12_85/0.6)] focus:bg-[oklch(0.13_0.016_265)]
                      transition-all duration-150"
                  />
                </div>
                {mode === "register" && (
                  <p className="mt-1 text-xs text-[oklch(0.38_0.012_265)]">
                    3–32 characters, letters, numbers, _ and - only
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-mono text-[oklch(0.55_0.012_265)] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0.012_265)]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    required
                    className="w-full pl-9 pr-10 py-3 rounded-xl bg-[oklch(0.12_0.016_265)] border border-[oklch(0.22_0.016_265)]
                      text-[oklch(0.88_0.01_85)] placeholder-[oklch(0.30_0.012_265)] text-sm
                      focus:outline-none focus:border-[oklch(0.78_0.12_85/0.6)] focus:bg-[oklch(0.13_0.016_265)]
                      transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0.012_265)] hover:text-[oklch(0.60_0.012_265)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 rounded-xl bg-[oklch(0.78_0.12_85/0.15)] border border-[oklch(0.78_0.12_85/0.5)]
                  text-[oklch(0.88_0.08_85)] font-['Playfair_Display'] font-semibold text-base
                  hover:bg-[oklch(0.78_0.12_85/0.25)] hover:border-[oklch(0.78_0.12_85/0.8)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
                ) : (
                  mode === "login" ? "Sign in" : "Create account"
                )}
              </button>
            </form>

            {/* Toggle mode */}
            <p className="mt-6 text-center text-sm text-[oklch(0.45_0.012_265)]">
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button onClick={() => { setMode("register"); setError(""); setUsername(""); setPassword(""); }}
                    className="text-[oklch(0.78_0.12_85)] hover:underline font-medium">
                    Create one
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => { setMode("login"); setError(""); setUsername(""); setPassword(""); }}
                    className="text-[oklch(0.78_0.12_85)] hover:underline font-medium">
                    Sign in
                  </button>
                </>
              )}
            </p>

            {/* Divider + Manus OAuth */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-[oklch(0.18_0.016_265)]" />
              <span className="text-xs text-[oklch(0.30_0.012_265)] font-mono">or</span>
              <div className="flex-1 h-px bg-[oklch(0.18_0.016_265)]" />
            </div>
            <button
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="mt-4 w-full py-3 rounded-xl bg-transparent border border-[oklch(0.22_0.016_265)]
                text-[oklch(0.55_0.012_265)] text-sm font-mono
                hover:border-[oklch(0.35_0.016_265)] hover:text-[oklch(0.70_0.012_265)]
                transition-all duration-200 active:scale-[0.98]"
            >
              Continue with Manus account
            </button>
          </div>
        </main>
      )}

      {/* Hero (landing mode only) */}
      {mode === "landing" && (
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
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

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl
                bg-[oklch(0.78_0.12_85/0.15)] border border-[oklch(0.78_0.12_85/0.5)]
                text-[oklch(0.88_0.08_85)] font-['Playfair_Display'] font-semibold text-lg
                hover:bg-[oklch(0.78_0.12_85/0.25)] hover:border-[oklch(0.78_0.12_85/0.8)]
                transition-all duration-200 active:scale-[0.97]"
            >
              <Music size={20} className="text-[oklch(0.78_0.12_85)] group-hover:scale-110 transition-transform" />
              Get started free
            </button>
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="px-8 py-4 rounded-xl border border-[oklch(0.22_0.016_265)]
                text-[oklch(0.60_0.012_265)] font-mono text-base
                hover:border-[oklch(0.35_0.016_265)] hover:text-[oklch(0.75_0.012_265)]
                transition-all duration-200 active:scale-[0.97]"
            >
              Sign in
            </button>
          </div>

          <p className="mt-4 text-xs text-[oklch(0.35_0.012_265)] font-mono">
            No email required — just pick a username and password.
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
      )}

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-[oklch(0.14_0.016_265)]">
        <p className="text-xs text-[oklch(0.30_0.012_265)] font-mono">
          Piano Mastery — powered by AI analysis &amp; the Hanon 60 Exercises
        </p>
      </footer>
    </div>
  );
}
