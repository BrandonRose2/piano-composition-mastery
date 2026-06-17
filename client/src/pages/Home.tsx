/**
 * La Campanella — Franz Liszt
 * Design: Nocturne (Dark Velvet Recital Hall)
 * Fonts: Playfair Display (headings) + Lato (body) + JetBrains Mono (labels/code)
 * Accent: Antique Gold oklch(0.78 0.12 85)
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Music, BookOpen, Dumbbell, Calendar, Info } from "lucide-react";

// ── Asset URLs ──────────────────────────────────────────────────────────────
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/hero_bg-DDCWpXMzKGFmMUM3oU8SpS.webp";
const LISZT_PORTRAIT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/liszt_portrait_bg-awZFnxUtESUWuuZgaR9x6D.webp";
const LOGO_TREBLE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/logo_treble-Ys7HU4Ydwkc3JS4KPHV5db.webp";

// ── Nav sections ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "history",    label: "Historical Context",    icon: BookOpen },
  { id: "technical",  label: "Technical Evaluation",  icon: Music },
  { id: "hanon",      label: "Hanon Exercises",        icon: Dumbbell },
  { id: "framework",  label: "30-Day Framework",       icon: Calendar },
  { id: "principles", label: "Practice Principles",   icon: Info },
];

// ── Technical challenges data ─────────────────────────────────────────────────
const CHALLENGES = [
  {
    title: "Large Leaps",
    icon: "↔",
    location: "Throughout; worst at mm. 30–32",
    description:
      "The right hand executes continuous leaps spanning up to two octaves and a second (a sixteenth) within a single sixteenth note. The left hand faces even larger challenges — in bar 101, it stretches nearly three octaves. The physics are unforgiving: the allegretto tempo leaves almost no time to reposition the hand.",
    tip: "Look at the destination key before your hand moves. Train spatial memory, not raw speed.",
  },
  {
    title: "Repeated Notes",
    icon: "♪",
    location: "Opening and variation themes",
    description:
      "Rapid, articulate repeated notes simulate the ringing of a bell. The pianist must alternate fingers (3-2-1 or 4-3-2-1) on the same key, producing a clean, ringing tone with each repetition. Any tension in the forearm destroys the bell-like quality.",
    tip: "Keep the wrist completely free. The fingers must be light — think of tapping a soap bubble.",
  },
  {
    title: "4th & 5th Finger Trills",
    icon: "tr",
    location: "mm. 80–83",
    description:
      "The right hand must sustain a trill using the weakest fingers — the 4th and 5th — while simultaneously voicing a lower melody note. These fingers share a common tendon and resist independent movement. A 3-5 fingering is an alternative some pianists prefer.",
    tip: "Practice the trill alone (no melody note) for 20 minutes before adding the lower voice.",
  },
  {
    title: "Chromatic Scales",
    icon: "≈",
    location: "mm. 73+",
    description:
      "Lightning-fast chromatic runs must be executed with feather-light articulation and perfect evenness of tone. These passages require the thumb to pass smoothly under the hand without 'bumping' the rhythm — a common stumbling block.",
    tip: "Practice staccato at half tempo first. As you increase speed, make the staccato progressively lighter.",
  },
  {
    title: "Octaves & Chords",
    icon: "𝄞",
    location: "Climax section",
    description:
      "The climactic section demands rapid, powerful octave playing and dense chordal passages. The wrist must absorb each octave's impact without locking up, using a wrist-bounce technique. This is where endurance becomes the limiting factor.",
    tip: "Never practice the octave climax when your forearm is already tired. Fresh hands only.",
  },
];

// ── Hanon exercises ───────────────────────────────────────────────────────────
const HANON_EXERCISES = [
  { number: "1–5",  focus: "Basic finger independence, 4th & 5th finger strengthening", application: "Builds foundational independence of the weaker fingers used in trills and leaps" },
  { number: "6",    focus: "Extension: stretch from 5th finger to inner notes (a sixth)", application: "Prepares lateral flexibility for large leaps" },
  { number: "31",   focus: "Extension to a full octave span with inner note movement", application: "Directly prepares the hand for octave-range leaps" },
  { number: "39",   focus: "All major and minor scales (harmonic and melodic)", application: "Builds scale fluency in G-sharp minor and related keys" },
  { number: "40",   focus: "Chromatic scale in all forms", application: "Directly prepares the chromatic runs at measure 73" },
  { number: "41",   focus: "All arpeggios", application: "Builds wrist flexibility and arm movement for large leaps" },
  { number: "44",   focus: "Repeated notes in groups of three (3-2-1 fingering)", application: "Directly prepares the bell-like repeated note motifs" },
  { number: "45",   focus: "Repeated notes in groups of four (4-3-2-1 fingering)", application: "Builds endurance for sustained repeated note passages" },
  { number: "46",   focus: "The Trill — trills across all five fingers", application: "Directly prepares the sustained 4-5 finger trills at measure 80" },
  { number: "47",   focus: "Notes repeated in groups of four (advanced)", application: "Builds speed and control for the fastest repeated note passages" },
  { number: "53",   focus: "Scales in octaves (diatonic and chromatic)", application: "Builds wrist endurance and accuracy for the octave climax" },
];

// ── 30-Day schedule ───────────────────────────────────────────────────────────
const WEEKS = [
  {
    week: 1,
    title: "Anatomy of the Piece",
    goal: "Understand the structure intimately. Identify every difficult passage. Begin building spatial memory for the leaps.",
    milestone: "By Day 7: play every section hands-separately at 50% tempo without stopping.",
    hanon: "No. 1–5 (finger independence), No. 46 (trills — hands separate only, 4-5 and 3-4 finger pairs)",
    days: [
      { day: 1, focus: "Opening theme (mm. 1–20)", goal: "Map every leap. Practice the right-hand jumps by touching keys silently first." },
      { day: 2, focus: "First variation (mm. 21–40)", goal: "Identify the 15th and 16th interval leaps. Practice them in isolation." },
      { day: 3, focus: "Second variation (mm. 41–60)", goal: "Focus on the repeated note passages. Practice with 3-2-1 fingering, very slowly." },
      { day: 4, focus: "Chromatic section (mm. 61–80)", goal: "Practice the chromatic runs staccato and very slowly. Count every note." },
      { day: 5, focus: "Trill section (mm. 80–95)", goal: "Practice the 4-5 trill alone (no melody note) for 20 minutes. Then add the lower voice." },
      { day: 6, focus: "Climax / Octave section (mm. 96–110)", goal: "Practice the left-hand leaps in isolation. Practice the octaves with wrist bounce." },
      { day: 7, focus: "Full piece, hands separate", goal: "Play through the entire piece, each hand alone, at 50% tempo." },
    ],
  },
  {
    week: 2,
    title: "Hands Together, Slow and Deliberate",
    goal: "Begin combining hands at very slow tempos. Prioritize accuracy over speed. Continue Hanon for technique building.",
    milestone: "By Day 14: play the entire piece hands-together at 60% tempo with acceptable accuracy.",
    hanon: "No. 40 (chromatic scales), No. 44 (repeated notes), No. 31 (octave extensions)",
    days: [
      { day: 8,  focus: "Opening theme HT", goal: "Metronome at 50% tempo. Focus on the right-hand leap landing cleanly." },
      { day: 9,  focus: "First variation HT", goal: "Metronome at 50% tempo. Ensure the left-hand accompaniment is steady." },
      { day: 10, focus: "Second variation HT", goal: "Focus on the coordination between repeated notes (RH) and arpeggios (LH)." },
      { day: 11, focus: "Chromatic section HT", goal: "Practice the chromatic runs at 50% tempo. Aim for perfect evenness." },
      { day: 12, focus: "Trill section HT", goal: "The hardest day. Combine the 4-5 trill with the left hand. Go very slowly." },
      { day: 13, focus: "Climax / Octave section HT", goal: "Practice the octave climax at 50% tempo. Ensure the wrist is loose." },
      { day: 14, focus: "Full piece HT", goal: "Play through the entire piece HT at 60% tempo. Note every stumble." },
    ],
  },
  {
    week: 3,
    title: "Tempo Building and Targeted Drilling",
    goal: "Systematically increase tempo using the metronome. Drill the three most difficult passages daily. Begin to feel the musical shape.",
    milestone: "By Day 21: play the entire piece at 75% tempo with only occasional stumbles.",
    hanon: "No. 46 (trills — now HT and at increasing speed), No. 53 (octave scales), No. 47 (advanced repeated notes)",
    days: [
      { day: 15, focus: "Leap passages", goal: "Drill the 15th and 16th interval leaps. Increase metronome by 4 BPM from Day 8 baseline." },
      { day: 16, focus: "Repeated note passages", goal: "Increase tempo on repeated notes. Aim for a clean, bell-like tone at higher speed." },
      { day: 17, focus: "Chromatic runs", goal: "Increase tempo. Ensure the thumb pass is smooth and invisible to the listener." },
      { day: 18, focus: "Trill section", goal: "Increase tempo. The 4-5 trill must remain relaxed; if it tenses, slow down." },
      { day: 19, focus: "Octave climax", goal: "Increase tempo. Focus on the musical arc — build to a genuine forte." },
      { day: 20, focus: "Full piece run-through", goal: "Play at 70% tempo. Record yourself and listen back critically." },
      { day: 21, focus: "Rest and reflection", goal: "Light Hanon only. No piece practice. Let your muscles recover. Review your recording." },
    ],
  },
  {
    week: 4,
    title: "Performance Preparation",
    goal: "Achieve a full, musical run-through at or near performance tempo. Develop the ability to recover from mistakes without stopping.",
    milestone: "By Day 30: perform the piece from memory at 85–90% of final tempo with musical expression.",
    hanon: "Rotate through No. 44, 46, and 53 as a 20-minute warm-up. Reduce Hanon time to prioritize piece practice.",
    days: [
      { day: 22, focus: "Tempo push", goal: "Increase all sections to 80% tempo. Identify remaining weak spots." },
      { day: 23, focus: "Weak spot drilling", goal: "Spend 45 minutes exclusively on the 2–3 passages that still feel insecure." },
      { day: 24, focus: "Musical shaping", goal: "Play at 75% tempo but focus entirely on dynamics and phrasing. Make the bell sing." },
      { day: 25, focus: "Endurance run", goal: "Play the piece through three times in a row at 75% tempo. Rest between each." },
      { day: 26, focus: "Tempo push", goal: "Increase to 85% tempo. Accept minor imperfections; do not stop." },
      { day: 27, focus: "Performance simulation", goal: "Play the piece as if in concert. No stopping. No going back. Record it." },
      { day: 28, focus: "Review and refine", goal: "Listen to the recording. Spend the session fixing the specific moments that failed." },
      { day: 29, focus: "Final tempo push", goal: "Attempt 90% tempo on the sections you are most confident in." },
      { day: 30, focus: "Full performance", goal: "Play the piece in its entirety, with full musical commitment, at the highest tempo you can sustain cleanly. This is your benchmark." },
    ],
  },
];

// ── Milestones ────────────────────────────────────────────────────────────────
const MILESTONES = [
  { date: "Day 7",  label: "All sections HS at 50% tempo",      benchmark: "No stopping; all notes present" },
  { date: "Day 14", label: "Full piece HT at 60% tempo",         benchmark: "Acceptable accuracy; no major memory gaps" },
  { date: "Day 21", label: "Hardest passages clean at 70% tempo", benchmark: "Leaps, trills, and chromatics all under control" },
  { date: "Day 30", label: "Full musical performance at 85–90%", benchmark: "No stopping; musical expression present" },
];

// ── Session structure ─────────────────────────────────────────────────────────
const SESSION_BLOCKS = [
  { block: "Warm-up (Hanon)",          duration: "25–30 min", purpose: "Prepare the hands; build targeted technique" },
  { block: "Scales in G-sharp minor",  duration: "10 min",    purpose: "Internalize the key; warm up specific finger patterns" },
  { block: "Sectional Work",           duration: "60–75 min", purpose: "Targeted, slow, hands-separate and hands-together practice" },
  { block: "Run-through / Endurance",  duration: "20–30 min", purpose: "Full or partial run-throughs at increasing tempo" },
  { block: "Cool-down",                duration: "5 min",     purpose: "Slow, gentle playing; shake out the hands" },
];

// ── Scroll-spy hook ───────────────────────────────────────────────────────────
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);
  return active;
}

// ── Bell ornament ────────────────────────────────────────────────────────────
function BellOrnament({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-[oklch(0.78_0.12_85)] text-xl select-none" aria-hidden>♪</span>
      <div className="flex-1 h-px bg-gradient-to-r from-[oklch(0.78_0.12_85/0.6)] to-transparent" />
      <span className="font-['JetBrains_Mono'] text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-[oklch(0.78_0.12_85/0.6)] to-transparent" />
      <span className="text-[oklch(0.78_0.12_85)] text-xl select-none" aria-hidden>♪</span>
    </div>
  );
}

// ── Animated section wrapper ──────────────────────────────────────────────────
function AnimatedSection({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </section>
  );
}

// ── Gold Rule ─────────────────────────────────────────────────────────────────
function GoldRule() {
  return <div className="gold-rule my-12" />;
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label mb-3">{children}</p>;
}

// ── Day Card (accordion) ──────────────────────────────────────────────────────
function DayCard({ day, focus, goal }: { day: number; focus: string; goal: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`nocturne-card overflow-hidden transition-all duration-200 ${open ? "border-[oklch(0.50_0.06_85)]" : ""}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[oklch(0.20_0.014_265)] transition-colors"
      >
        <span className="font-mono text-xs text-[oklch(0.78_0.12_85)] w-10 shrink-0">D{day}</span>
        <span className="text-sm font-semibold text-[oklch(0.88_0.01_85)] flex-1">{focus}</span>
        {open ? <ChevronUp size={14} className="text-[oklch(0.58_0.015_265)] shrink-0" /> : <ChevronDown size={14} className="text-[oklch(0.58_0.015_265)] shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-[oklch(0.24_0.016_265)]">
          <p className="text-sm text-[oklch(0.75_0.01_85)] leading-relaxed">{goal}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const activeSection = useScrollSpy(NAV_ITEMS.map((n) => n.id));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_265)] text-[oklch(0.92_0.01_85)]">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.018_265/0.3)] via-[oklch(0.12_0.018_265/0.5)] to-[oklch(0.12_0.018_265)]" />
        {/* Radial spotlight glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,oklch(0.78_0.12_85/0.06),transparent)]" />

        {/* Top nav bar */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 z-20">
          <div className="flex items-center gap-3">
            <img src={LOGO_TREBLE} alt="Treble clef logo" className="h-9 w-auto" />
            <span className="font-['Playfair_Display'] font-semibold text-[oklch(0.78_0.12_85)] text-sm tracking-wide hidden sm:block">
              La Campanella
            </span>
          </div>
          {/* Mobile nav toggle */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden text-[oklch(0.78_0.12_85)] p-2"
          >
            <div className="space-y-1.5">
              <span className="block w-6 h-px bg-current" />
              <span className="block w-4 h-px bg-current" />
              <span className="block w-6 h-px bg-current" />
            </div>
          </button>
        </nav>

        {/* Hero text */}
        <div className="relative z-10 container pb-24 pt-32">
          <div className="max-w-3xl">
            <SectionLabel>Franz Liszt · Grandes Études de Paganini, S. 141, No. 3</SectionLabel>
            <h1
              className="font-['Playfair_Display'] font-black text-5xl sm:text-7xl lg:text-8xl leading-none mb-6 animate-fade-up"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="text-[oklch(0.92_0.01_85)]">La</span>
              <br />
              <span className="text-[oklch(0.78_0.12_85)] italic">Campanella</span>
            </h1>
            <p
              className="text-[oklch(0.65_0.015_265)] text-lg sm:text-xl max-w-xl leading-relaxed animate-fade-up"
              style={{ animationDelay: "0.25s" }}
            >
              A complete analysis of one of history's most demanding piano works — and a thirty-day framework to conquer it.
            </p>
            <div
              className="flex flex-wrap gap-4 mt-10 animate-fade-up"
              style={{ animationDelay: "0.4s" }}
            >
              <button
                onClick={() => scrollTo("history")}
                className="px-6 py-3 border border-[oklch(0.78_0.12_85)] text-[oklch(0.78_0.12_85)] font-bold text-sm tracking-wide rounded hover:bg-[oklch(0.78_0.12_85/0.12)] transition-colors active:scale-[0.97]"
              >
                Begin the Study
              </button>
              <button
                onClick={() => scrollTo("framework")}
                className="px-6 py-3 border border-[oklch(0.78_0.12_85/0.5)] text-[oklch(0.78_0.12_85)] font-semibold text-sm tracking-wide rounded hover:border-[oklch(0.78_0.12_85)] hover:bg-[oklch(0.78_0.12_85/0.08)] transition-all active:scale-[0.97]"
              >
                Jump to 30-Day Plan
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bell-shimmer">
          <span className="font-['JetBrains_Mono'] text-[0.55rem] text-[oklch(0.78_0.12_85/0.5)] uppercase tracking-widest">Scroll</span>
          <ChevronDown size={20} className="text-[oklch(0.78_0.12_85/0.6)]" />
        </div>
      </header>

      {/* ── LAYOUT: Sidebar + Content ────────────────────────────────────── */}
      <div className="flex">

        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-[oklch(0.24_0.016_265)] bg-[oklch(0.14_0.018_265)] py-10 px-6">
          <div className="flex items-center gap-2 mb-10">
            <img src={LOGO_TREBLE} alt="" className="h-7 w-auto" />
            <span className="font-['Playfair_Display'] text-sm text-[oklch(0.78_0.12_85)]">Navigation</span>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-left transition-all duration-150 ${
                  activeSection === id
                    ? "bg-[oklch(0.78_0.12_85/0.12)] text-[oklch(0.78_0.12_85)] font-semibold"
                    : "text-[oklch(0.58_0.015_265)] hover:text-[oklch(0.78_0.12_85)] hover:bg-[oklch(0.20_0.014_265)]"
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-10">
            <div className="gold-rule mb-6" />
            <p className="text-xs text-[oklch(0.40_0.012_265)] leading-relaxed">
              G-sharp minor · S. 141 · 1851<br />
              <span className="italic">Allegretto</span>
            </p>
          </div>
        </aside>

        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-[oklch(0.12_0.018_265/0.95)] flex flex-col p-8">
            <button onClick={() => setMobileNavOpen(false)} className="self-end text-[oklch(0.78_0.12_85)] mb-8 text-2xl">✕</button>
            <nav className="space-y-2">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded text-left text-[oklch(0.88_0.01_85)] hover:text-[oklch(0.78_0.12_85)] hover:bg-[oklch(0.20_0.014_265)] transition-colors"
                >
                  <Icon size={16} />
                  <span className="font-['Playfair_Display'] text-lg">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 py-20 space-y-0">

            {/* ── SECTION 1: HISTORICAL CONTEXT ──────────────────────────── */}
            <AnimatedSection id="history">
              <BellOrnament label="Part I" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-8">
                Historical &amp; Compositional Context
              </h2>

              {/* Portrait + intro text */}
              <div className="grid lg:grid-cols-5 gap-8 mb-10">
                <div className="lg:col-span-3 space-y-5 text-[oklch(0.75_0.01_85)] leading-relaxed">
                  <p>
                    <strong className="text-[oklch(0.88_0.01_85)]">"La Campanella"</strong> — Italian for "The Little Bell" — is the subtitle of the third of Franz Liszt's six <em>Grandes études de Paganini</em>, S. 141, published in 1851 in the key of G-sharp minor. It stands as one of the most celebrated and technically demanding works in the entire piano repertoire, yet its origins lie not at the keyboard but in the hands of the legendary violinist Niccolò Paganini.
                  </p>
                  <p>
                    The source material is the final rondo movement of Paganini's Violin Concerto No. 2 in B minor, Op. 7, completed in 1826 and premiered at La Scala, Milan, in 1827 — with Paganini himself as soloist. The movement earned its nickname from a literal small handbell used in the orchestra to reinforce the melody's bell-like character.
                  </p>
                  <p>
                    Franz Liszt first heard Paganini perform in Paris in April 1832, when Liszt was only twenty years old. In a letter to his pupil Pierre-Étienne Wolff, he wrote:
                  </p>
                  <blockquote className="border-l-2 border-[oklch(0.78_0.12_85)] pl-5 py-1 italic text-[oklch(0.65_0.015_265)]">
                    "Quel homme, quel violon, quel artiste! Dieu, que de souffrances, de misère, de tortures dans ces quatre cordes!"
                    <span className="block mt-1 not-italic text-xs text-[oklch(0.50_0.012_265)]">
                      "What a man, what a violin, what an artist! God, what suffering, what misery, what tortures in those four strings!"
                    </span>
                  </blockquote>
                </div>
                <div className="lg:col-span-2">
                  <div className="rounded-lg overflow-hidden border border-[oklch(0.28_0.018_265)]">
                    <img
                      src={LISZT_PORTRAIT}
                      alt="Franz Liszt at the piano, candlelit portrait"
                      className="w-full h-64 lg:h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Three versions table */}
              <h3 className="font-['Playfair_Display'] font-semibold text-2xl text-[oklch(0.88_0.01_85)] mb-4">The Three Versions</h3>
              <p className="text-[oklch(0.65_0.015_265)] mb-6 leading-relaxed">
                Liszt's adaptation went through three distinct versions, each representing a refinement of both technique and musical taste. The 1851 version — universally performed today — reflects Liszt at the height of his compositional maturity, with the key of G-sharp minor chosen deliberately so that the large leaps land predominantly on black keys, which are slightly raised and easier to target at speed.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t border-[oklch(0.78_0.12_85/0.4)]">
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Version</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Year</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Key</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Character</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { v: "Grande fantaisie di bravura (Op. 2)", y: "1834", k: "A minor", c: "Extremely loud, dense chords, unpianistic; rarely performed" },
                      { v: "Études d'exécution transcendante, S. 140", y: "1838", k: "A-flat minor", c: "Lighter, with carnivalesque passages; more playable" },
                      { v: "Grandes études de Paganini, S. 141 No. 3", y: "1851", k: "G-sharp minor", c: "Homophonic, airy, high-register, elegant — the standard version" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-[oklch(0.22_0.014_265)] hover:bg-[oklch(0.17_0.016_265)] transition-colors">
                        <td className="py-3 px-4 text-[oklch(0.80_0.01_85)] font-medium">{row.v}</td>
                        <td className="py-3 px-4 font-['JetBrains_Mono'] text-[oklch(0.78_0.12_85)]">{row.y}</td>
                        <td className="py-3 px-4 text-[oklch(0.75_0.01_85)]">{row.k}</td>
                        <td className="py-3 px-4 text-[oklch(0.58_0.015_265)]">{row.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedSection>

            <GoldRule />

            {/* ── SECTION 2: TECHNICAL EVALUATION ────────────────────────── */}
            <AnimatedSection id="technical">
              <BellOrnament label="Part II" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">
                Complete Technical Evaluation
              </h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-10 max-w-2xl">
                "La Campanella" tests the pianist across five distinct technical domains. Each is a discipline unto itself. The piece is not merely difficult — it is <em>specifically</em> difficult, targeting the weakest points of the human hand with surgical precision.
              </p>

              <div className="grid sm:grid-cols-2 gap-5">
                {CHALLENGES.map((c, i) => (
                  <div
                    key={i}
                    className="nocturne-card p-6 group border-l-2"
                    style={{ animationDelay: `${i * 0.08}s`, borderLeftColor: `oklch(${0.78 - i * 0.05} ${0.12 - i * 0.01} 85)` }}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-2xl text-[oklch(0.78_0.12_85)] font-['Playfair_Display'] font-bold w-8 shrink-0">{c.icon}</span>
                      <div>
                        <h3 className="font-['Playfair_Display'] font-semibold text-xl text-[oklch(0.88_0.01_85)] mb-1">{c.title}</h3>
                        <p className="font-['JetBrains_Mono'] text-xs text-[oklch(0.50_0.012_265)]">{c.location}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[oklch(0.65_0.015_265)] leading-relaxed mb-4">{c.description}</p>
                    <div className="border-t border-[oklch(0.24_0.016_265)] pt-4">
                      <p className="text-xs font-semibold text-[oklch(0.78_0.12_85)] mb-1 uppercase tracking-wider">Practice Tip</p>
                      <p className="text-xs text-[oklch(0.60_0.012_265)] italic leading-relaxed">{c.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <GoldRule />

            {/* ── SECTION 3: HANON EXERCISES ──────────────────────────────── */}
            <AnimatedSection id="hanon">
              <BellOrnament label="Part III" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">
                Hanon Exercises — A Targeted Selection
              </h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-3 max-w-2xl">
                Charles-Louis Hanon's <em>The Virtuoso Pianist in 60 Exercises</em> (1873) remains one of the most widely used technical manuals in piano pedagogy. The following eleven exercises have been selected specifically because they address the technical demands of "La Campanella."
              </p>
              <p className="text-[oklch(0.50_0.012_265)] text-sm italic mb-10 max-w-2xl">
                Critical note: Hanon exercises must never be practiced mindlessly. Each exercise should be approached with a specific goal in mind, always with a metronome, starting at a tempo where every note is perfectly clean and even.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t border-[oklch(0.78_0.12_85/0.4)]">
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest w-20">No.</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Technical Focus</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Application to La Campanella</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HANON_EXERCISES.map((ex, i) => (
                      <tr key={i} className="border-b border-[oklch(0.22_0.014_265)] hover:bg-[oklch(0.17_0.016_265)] transition-colors">
                        <td className="py-3 px-4 font-['JetBrains_Mono'] text-[oklch(0.78_0.12_85)] font-medium">{ex.number}</td>
                        <td className="py-3 px-4 text-[oklch(0.75_0.01_85)]">{ex.focus}</td>
                        <td className="py-3 px-4 text-[oklch(0.58_0.015_265)]">{ex.application}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedSection>

            <GoldRule />

            {/* ── SECTION 4: 30-DAY FRAMEWORK ─────────────────────────────── */}
            <AnimatedSection id="framework">
              <BellOrnament label="Part IV" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">
                The 30-Day Practice Framework
              </h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-10 max-w-2xl">
                This framework assumes you can read through the piece slowly (at roughly 40–50% of final tempo) and are familiar with the key of G-sharp minor. Each session is designed to last <strong className="text-[oklch(0.88_0.01_85)]">2 to 2.5 hours</strong> of dedicated practice daily.
              </p>

              {/* Daily session structure */}
              <h3 className="font-['Playfair_Display'] font-semibold text-2xl text-[oklch(0.88_0.01_85)] mb-5">Daily Session Structure</h3>
              <div className="overflow-x-auto mb-14">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t border-[oklch(0.78_0.12_85/0.4)]">
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Session Block</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Duration</th>
                      <th className="text-left py-3 px-4 font-['JetBrains_Mono'] text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SESSION_BLOCKS.map((b, i) => (
                      <tr key={i} className="border-b border-[oklch(0.22_0.014_265)] hover:bg-[oklch(0.17_0.016_265)] transition-colors">
                        <td className="py-3 px-4 text-[oklch(0.80_0.01_85)] font-semibold">{b.block}</td>
                        <td className="py-3 px-4 font-['JetBrains_Mono'] text-[oklch(0.78_0.12_85)]">{b.duration}</td>
                        <td className="py-3 px-4 text-[oklch(0.58_0.015_265)]">{b.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Milestone tracker — horizontal timeline */}
              <h3 className="font-['Playfair_Display'] font-semibold text-2xl text-[oklch(0.88_0.01_85)] mb-6">Milestone Summary</h3>
              <div className="relative mb-14">
                {/* Connecting line */}
                <div className="hidden sm:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.12_85/0.35)] to-transparent" />
                <div className="grid sm:grid-cols-4 gap-6">
                  {MILESTONES.map((m, i) => (
                    <div key={i} className="relative flex flex-col items-center text-center">
                      {/* Node */}
                      <div className="w-12 h-12 rounded-full border-2 border-[oklch(0.78_0.12_85)] bg-[oklch(0.17_0.016_265)] flex items-center justify-center mb-4 z-10 animate-glow-pulse" style={{ animationDelay: `${i * 1}s` }}>
                        <span className="font-['JetBrains_Mono'] text-[oklch(0.78_0.12_85)] text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="font-['JetBrains_Mono'] text-[oklch(0.78_0.12_85)] text-xs font-bold mb-1">{m.date}</p>
                      <p className="text-[oklch(0.82_0.01_85)] text-sm font-semibold mb-1 leading-snug">{m.label}</p>
                      <p className="text-[oklch(0.48_0.012_265)] text-xs leading-relaxed">{m.benchmark}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly schedules — score-map style */}
              {WEEKS.map((week, wi) => (
                <div key={week.week} className="mb-14">
                  {/* Week header band */}
                  <div className={`flex items-stretch gap-0 mb-6 rounded-lg overflow-hidden border border-[oklch(0.28_0.018_265)]`}>
                    <div className="w-2 shrink-0" style={{ background: `oklch(${0.78 - wi * 0.08} ${0.12 - wi * 0.02} 85)` }} />
                    <div className="flex-1 px-6 py-5">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-['JetBrains_Mono'] text-[0.65rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.2em]">Week {week.week} · Days {week.days[0].day}–{week.days[week.days.length - 1].day}</span>
                      </div>
                      <h3 className="font-['Playfair_Display'] font-bold text-xl text-[oklch(0.90_0.01_85)] mb-2">{week.title}</h3>
                      <p className="text-[oklch(0.60_0.015_265)] text-sm leading-relaxed mb-3">{week.goal}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <p className="text-xs text-[oklch(0.48_0.012_265)]">
                          <span className="text-[oklch(0.60_0.08_85)] font-semibold">Milestone: </span>{week.milestone}
                        </p>
                        <p className="text-xs text-[oklch(0.48_0.012_265)]">
                          <span className="text-[oklch(0.60_0.08_85)] font-semibold">Hanon: </span>{week.hanon}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Day grid */}
                  <div className="grid gap-2">
                    {week.days.map((d) => (
                      <DayCard key={d.day} day={d.day} focus={d.focus} goal={d.goal} />
                    ))}
                  </div>
                </div>
              ))}
            </AnimatedSection>

            <GoldRule />

            {/* ── SECTION 5: PRACTICE PRINCIPLES ─────────────────────────── */}
            <AnimatedSection id="principles">
              <BellOrnament label="Part V" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-10">
                Essential Practice Principles
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  {
                    title: "On Tension and Injury Prevention",
                    body: "The single greatest threat to learning 'La Campanella' is physical tension. Before every session, shake your hands loosely at the wrist for thirty seconds. During practice, if you feel any burning or tightening in the forearm, stop immediately, rest for five minutes, and resume at a slower tempo. Never practice through pain.",
                  },
                  {
                    title: "On the Metronome",
                    body: "Begin every new passage at a tempo where you can play it perfectly — even if that tempo feels embarrassingly slow. Increase the tempo only in small increments (2–4 BPM), and only when the passage is completely clean at the current tempo. The brain learns what it practices; practicing mistakes at speed only reinforces those mistakes.",
                  },
                  {
                    title: "On Memorization",
                    body: "Memorizing the piece is strongly recommended, as it allows you to watch your hands during the large leaps — a critical aid to accuracy. Memorize in small chunks, section by section, hands separately first. Test your memory by playing away from the score.",
                  },
                  {
                    title: "On Listening",
                    body: "Listen to multiple recordings of the piece by great pianists — Daniil Trifonov, Evgeny Kissin, and Lang Lang all offer distinct interpretations. Pay attention to how each pianist shapes the bell melody, manages the climax, and handles the transition back to the opening theme. Listening is a form of practice.",
                  },
                ].map((p, i) => (
                  <div key={i} className="nocturne-card p-7">
                    <h3 className="font-['Playfair_Display'] font-semibold text-xl text-[oklch(0.88_0.01_85)] mb-4">{p.title}</h3>
                    <p className="text-sm text-[oklch(0.65_0.015_265)] leading-relaxed">{p.body}</p>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            {/* ── FOOTER ────────────────────────────────────────────────────── */}
            <footer className="pt-20 pb-10">
              <div className="gold-rule mb-10" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <img src={LOGO_TREBLE} alt="" className="h-8 w-auto" />
                  <div>
                    <p className="font-['Playfair_Display'] font-semibold text-[oklch(0.78_0.12_85)]">La Campanella</p>
                    <p className="text-xs text-[oklch(0.40_0.012_265)]">Franz Liszt · S. 141 No. 3 · G-sharp minor</p>
                  </div>
                </div>
                <p className="text-xs text-[oklch(0.35_0.010_265)] max-w-xs text-right">
                  Analysis and practice framework prepared by Manus AI. Sources: Wikipedia, Britannica, Interlude HK, Valley Tuning, The Home Concert Pianist.
                </p>
              </div>
            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}
