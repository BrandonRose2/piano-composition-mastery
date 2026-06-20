/**
 * CompositionDetail — shows full AI analysis + interactive 30-day tracker
 * Works for both uploaded compositions (by numeric id) and the built-in La Campanella (id="la-campanella")
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ChevronDown, ChevronUp, ChevronLeft, Music, BookOpen, Dumbbell, Calendar,
  Info, CheckCircle2, Circle, RotateCcw, Loader2, AlertCircle, Youtube, CalendarDays, X, FileMusic,
  Columns2, PanelLeftClose, Play, Eye, Clock, User
} from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import ScoreViewer from "@/components/ScoreViewer";

const LOGO_TREBLE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/logo_treble-Ys7HU4Ydwkc3JS4KPHV5db.webp";
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/iyZgf5CgymBq6EtTfh66yp/hero_bg-DDCWpXMzKGFmMUM3oU8SpS.webp";

// ── Built-in La Campanella data ───────────────────────────────────────────────
const LA_CAMPANELLA_ANALYSIS = {
  title: "La Campanella",
  composer: "Franz Liszt",
  key: "G-sharp minor",
  tempo: "Allegretto",
  difficulty: "Advanced",
  estimatedDuration: "4–5 minutes",
  overview: "La Campanella is the third of Liszt's Grandes Études de Paganini (S. 141), published in 1851. It is one of the most celebrated and technically demanding works in the piano repertoire, transcribed from the final rondo of Paganini's Violin Concerto No. 2.",
  historicalContext: `"La Campanella" — Italian for "The Little Bell" — traces its origins to Niccolò Paganini's Violin Concerto No. 2 in B minor, Op. 7 (1826). Franz Liszt first heard Paganini perform in Paris in April 1832, when Liszt was only twenty years old. The experience was transformative: Liszt resolved to become the "Paganini of the piano."\n\nListzt's adaptation went through three distinct versions over nearly two decades. The 1834 version was dense and unpianistic; the 1838 revision lightened the texture; and the definitive 1851 version — published in G-sharp minor — represents Liszt at the height of his compositional maturity. The key was chosen deliberately so that the large leaps land predominantly on black keys, which are slightly raised and easier to target at speed.\n\nThe piece derives its nickname from a literal small handbell used in the orchestra of Paganini's original concerto to reinforce the melody's bell-like character. Liszt's genius was to recreate this shimmering, ethereal bell sound entirely on the piano — using the highest register, delicate repeated notes, and feather-light articulation.`,
  technicalChallenges: [
    { title: "Large Leaps", icon: "↔", location: "Throughout; worst at mm. 30–32", description: "The right hand executes continuous leaps spanning up to two octaves and a second within a single sixteenth note. The left hand faces even larger challenges — in bar 101, it stretches nearly three octaves. The physics are unforgiving: the allegretto tempo leaves almost no time to reposition the hand.", tip: "Look at the destination key before your hand moves. Train spatial memory, not raw speed." },
    { title: "Repeated Notes", icon: "♪", location: "Opening and variation themes", description: "Rapid, articulate repeated notes simulate the ringing of a bell. The pianist must alternate fingers (3-2-1 or 4-3-2-1) on the same key, producing a clean, ringing tone with each repetition. Any tension in the forearm destroys the bell-like quality.", tip: "Keep the wrist completely free. The fingers must be light — think of tapping a soap bubble." },
    { title: "4th & 5th Finger Trills", icon: "tr", location: "mm. 80–83", description: "The right hand must sustain a trill using the weakest fingers — the 4th and 5th — while simultaneously voicing a lower melody note. These fingers share a common tendon and resist independent movement.", tip: "Practice the trill alone (no melody note) for 20 minutes before adding the lower voice." },
    { title: "Chromatic Scales", icon: "≈", location: "mm. 73+", description: "Lightning-fast chromatic runs must be executed with feather-light articulation and perfect evenness of tone. These passages require the thumb to pass smoothly under the hand without 'bumping' the rhythm.", tip: "Practice staccato at half tempo first. As you increase speed, make the staccato progressively lighter." },
    { title: "Octaves & Chords", icon: "𝄞", location: "Climax section", description: "The climactic section demands rapid, powerful octave playing and dense chordal passages. The wrist must absorb each octave's impact without locking up, using a wrist-bounce technique.", tip: "Never practice the octave climax when your forearm is already tired. Fresh hands only." },
  ],
  hanonExercises: [
    { number: "1–5", focus: "Basic finger independence, 4th & 5th finger strengthening", application: "Builds foundational independence of the weaker fingers used in trills and leaps" },
    { number: "6", focus: "Extension: stretch from 5th finger to inner notes (a sixth)", application: "Prepares lateral flexibility for large leaps" },
    { number: "31", focus: "Extension to a full octave span with inner note movement", application: "Directly prepares the hand for octave-range leaps" },
    { number: "39", focus: "All major and minor scales (harmonic and melodic)", application: "Builds scale fluency in G-sharp minor and related keys" },
    { number: "40", focus: "Chromatic scale in all forms", application: "Directly prepares the chromatic runs at measure 73" },
    { number: "41", focus: "All arpeggios", application: "Builds wrist flexibility and arm movement for large leaps" },
    { number: "44", focus: "Repeated notes in groups of three (3-2-1 fingering)", application: "Directly prepares the bell-like repeated note motifs" },
    { number: "45", focus: "Repeated notes in groups of four (4-3-2-1 fingering)", application: "Builds endurance for sustained repeated note passages" },
    { number: "46", focus: "The Trill — trills across all five fingers", application: "Directly prepares the sustained 4-5 finger trills at measure 80" },
    { number: "47", focus: "Notes repeated in groups of four (advanced)", application: "Builds speed and control for the fastest repeated note passages" },
    { number: "53", focus: "Scales in octaves (diatonic and chromatic)", application: "Builds wrist endurance and accuracy for the octave climax" },
  ],
};

const LA_CAMPANELLA_FRAMEWORK = {
  sessionBlocks: [
    { block: "Warm-up (Hanon)", duration: "25–30 min", purpose: "Prepare the hands; build targeted technique" },
    { block: "Scales in G-sharp minor", duration: "10 min", purpose: "Internalize the key; warm up specific finger patterns" },
    { block: "Sectional Work", duration: "60–75 min", purpose: "Targeted, slow, hands-separate and hands-together practice" },
    { block: "Run-through / Endurance", duration: "20–30 min", purpose: "Full or partial run-throughs at increasing tempo" },
    { block: "Cool-down", duration: "5 min", purpose: "Slow, gentle playing; shake out the hands" },
  ],
  milestones: [
    { date: "Day 7", label: "All sections HS at 50% tempo", benchmark: "No stopping; all notes present" },
    { date: "Day 14", label: "Full piece HT at 60% tempo", benchmark: "Acceptable accuracy; no major memory gaps" },
    { date: "Day 21", label: "Hardest passages clean at 70% tempo", benchmark: "Leaps, trills, and chromatics all under control" },
    { date: "Day 30", label: "Full musical performance at 85–90%", benchmark: "No stopping; musical expression present" },
  ],
  weeks: [
    {
      week: 1, title: "Anatomy of the Piece",
      goal: "Understand the structure intimately. Identify every difficult passage. Begin building spatial memory for the leaps.",
      milestone: "By Day 7: play every section hands-separately at 50% tempo without stopping.",
      hanon: "No. 1–5 (finger independence), No. 46 (trills — hands separate only)",
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
      week: 2, title: "Hands Together, Slow and Deliberate",
      goal: "Begin combining hands at very slow tempos. Prioritize accuracy over speed.",
      milestone: "By Day 14: play the entire piece hands-together at 60% tempo with acceptable accuracy.",
      hanon: "No. 40 (chromatic scales), No. 44 (repeated notes), No. 31 (octave extensions)",
      days: [
        { day: 8, focus: "Opening theme HT", goal: "Metronome at 50% tempo. Focus on the right-hand leap landing cleanly." },
        { day: 9, focus: "First variation HT", goal: "Metronome at 50% tempo. Ensure the left-hand accompaniment is steady." },
        { day: 10, focus: "Second variation HT", goal: "Focus on the coordination between repeated notes (RH) and arpeggios (LH)." },
        { day: 11, focus: "Chromatic section HT", goal: "Practice the chromatic runs at 50% tempo. Aim for perfect evenness." },
        { day: 12, focus: "Trill section HT", goal: "The hardest day. Combine the 4-5 trill with the left hand. Go very slowly." },
        { day: 13, focus: "Climax / Octave section HT", goal: "Practice the octave climax at 50% tempo. Ensure the wrist is loose." },
        { day: 14, focus: "Full piece HT", goal: "Play through the entire piece HT at 60% tempo. Note every stumble." },
      ],
    },
    {
      week: 3, title: "Tempo Building and Targeted Drilling",
      goal: "Systematically increase tempo using the metronome. Drill the three most difficult passages daily.",
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
      week: 4, title: "Performance Preparation",
      goal: "Achieve a full, musical run-through at or near performance tempo. Develop the ability to recover from mistakes without stopping.",
      milestone: "By Day 30: perform the piece from memory at 85–90% of final tempo with musical expression.",
      hanon: "Rotate through No. 44, 46, and 53 as a 20-minute warm-up.",
      days: [
        { day: 22, focus: "Tempo push", goal: "Increase all sections to 80% tempo. Identify remaining weak spots." },
        { day: 23, focus: "Weak spot drilling", goal: "Spend 45 minutes exclusively on the 2–3 passages that still feel insecure." },
        { day: 24, focus: "Musical shaping", goal: "Play at 75% tempo but focus entirely on dynamics and phrasing. Make the bell sing." },
        { day: 25, focus: "Endurance run", goal: "Play the piece through three times in a row at 75% tempo. Rest between each." },
        { day: 26, focus: "Tempo push", goal: "Increase to 85% tempo. Accept minor imperfections; do not stop." },
        { day: 27, focus: "Performance simulation", goal: "Play the piece as if in concert. No stopping. No going back. Record it." },
        { day: 28, focus: "Review and refine", goal: "Listen to the recording. Spend the session fixing the specific moments that failed." },
        { day: 29, focus: "Final tempo push", goal: "Attempt 90% tempo on the sections you are most confident in." },
        { day: 30, focus: "Full performance", goal: "Play the piece in its entirety, with full musical commitment, at the highest tempo you can sustain cleanly." },
      ],
    },
  ],
  practiceNotes: [
    "The single greatest threat to learning this piece is physical tension. Before every session, shake your hands loosely at the wrist for thirty seconds. If you feel any burning or tightening in the forearm, stop immediately.",
    "Begin every new passage at a tempo where you can play it perfectly — even if that tempo feels embarrassingly slow. Increase the tempo only in small increments (2–4 BPM), and only when the passage is completely clean.",
    "Memorizing the piece is strongly recommended, as it allows you to watch your hands during the large leaps — a critical aid to accuracy. Memorize in small chunks, section by section, hands separately first.",
    "Listen to multiple recordings by great pianists — Daniil Trifonov, Evgeny Kissin, and Lang Lang all offer distinct interpretations. Pay attention to how each pianist shapes the bell melody and manages the climax.",
  ],
};

// ── localStorage key for La Campanella ───────────────────────────────────────
const LC_STORAGE_KEY = "la-campanella-progress-v1";
const LC_START_DATE_KEY = "la-campanella-start-date-v1";

// ── Helpers ───────────────────────────────────────────────────────────────────
function BellOrnament({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-[oklch(0.78_0.12_85)] text-xl select-none">♪</span>
      <div className="flex-1 h-px bg-gradient-to-r from-[oklch(0.78_0.12_85/0.6)] to-transparent" />
      <span className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-[oklch(0.78_0.12_85/0.6)] to-transparent" />
      <span className="text-[oklch(0.78_0.12_85)] text-xl select-none">♪</span>
    </div>
  );
}

function GoldRule() {
  return <div className="h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.12_85/0.4)] to-transparent my-12" />;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="relative flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="oklch(0.24 0.016 265)" strokeWidth="8" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="oklch(0.78 0.12 85)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.23,1,0.32,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-[oklch(0.78_0.12_85)]">{done}</span>
        <span className="font-mono text-[0.6rem] text-[oklch(0.50_0.012_265)] uppercase tracking-widest">of {total}</span>
      </div>
    </div>
  );
}

// ── Performance Video Section ────────────────────────────────────────────────
function PerformanceVideoSection({ title, composer }: { title: string; composer: string }) {
  const [playing, setPlaying] = useState(false);

  const { data: video, isLoading, error } = trpc.youtube.searchPerformance.useQuery(
    { title, composer },
    { staleTime: 1000 * 60 * 60, retry: 1 }
  );

  if (isLoading) {
    return (
      <div className="nocturne-card p-8 flex items-center gap-4">
        <Loader2 size={20} className="animate-spin text-[oklch(0.78_0.12_85)]" />
        <span className="text-sm text-[oklch(0.55_0.015_265)] font-mono">Searching for the best performance...</span>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="nocturne-card p-8 flex items-center gap-3 text-[oklch(0.50_0.012_265)]">
        <AlertCircle size={16} />
        <span className="text-sm font-mono">No performance video found. <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(composer + " " + title + " piano")}`} target="_blank" rel="noopener noreferrer" className="text-[oklch(0.78_0.12_85)] hover:underline">Search YouTube manually →</a></span>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  return (
    <div className="space-y-4">
      {/* Video player */}
      <div className="relative w-full rounded-xl overflow-hidden border border-[oklch(0.24_0.016_265)] bg-[oklch(0.10_0.016_265)]" style={{ aspectRatio: "16/9" }}>
        {!playing ? (
          // Thumbnail with play button overlay
          <>
            {video.thumbnailUrl && (
              <img src={video.thumbnailUrl} alt={video.title}
                className="w-full h-full object-cover opacity-70" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[oklch(0.08_0.016_265/0.6)]">
              <button
                onClick={() => setPlaying(true)}
                className="group flex items-center justify-center w-20 h-20 rounded-full bg-[oklch(0.78_0.12_85/0.15)] border-2 border-[oklch(0.78_0.12_85/0.6)] hover:bg-[oklch(0.78_0.12_85/0.25)] hover:border-[oklch(0.78_0.12_85)] transition-all duration-200 mb-4"
                aria-label="Play video"
              >
                <Play size={32} className="text-[oklch(0.78_0.12_85)] ml-1 group-hover:scale-110 transition-transform" fill="currentColor" />
              </button>
              <p className="font-['Playfair_Display'] text-lg text-[oklch(0.88_0.01_85)] text-center px-8 max-w-2xl leading-snug">{video.title}</p>
              <p className="text-sm text-[oklch(0.55_0.015_265)] mt-1 font-mono">{video.channelTitle}</p>
            </div>
          </>
        ) : (
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        )}
      </div>

      {/* Video metadata card */}
      <div className="nocturne-card p-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-['Playfair_Display'] font-semibold text-[oklch(0.88_0.01_85)] leading-snug mb-1 truncate">{video.title}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[oklch(0.50_0.012_265)]">
            {video.channelTitle && <span className="flex items-center gap-1"><User size={10} />{video.channelTitle}</span>}
            {video.viewCountText && <span className="flex items-center gap-1"><Eye size={10} />{video.viewCountText} views</span>}
            {video.lengthText && <span className="flex items-center gap-1"><Clock size={10} />{video.lengthText}</span>}
            {video.publishedTimeText && <span className="text-[oklch(0.40_0.012_265)]">{video.publishedTimeText}</span>}
          </div>
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium
            bg-red-600/15 border border-red-600/30 text-red-400
            hover:bg-red-600/25 hover:border-red-500/50 hover:text-red-300
            transition-all duration-150 shrink-0"
        >
          <Youtube size={13} /> Watch on YouTube
        </a>
      </div>
    </div>
  );
}

function DayCard({ day, focus, goal, completed, onToggle, dateLabel }: {
  day: number; focus: string; goal: string; completed: boolean;
  onToggle: (day: number) => void; dateLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`nocturne-card overflow-hidden transition-all duration-200 ${completed ? "border-[oklch(0.50_0.08_85/0.5)] bg-[oklch(0.15_0.014_265)]" : open ? "border-[oklch(0.50_0.06_85)]" : ""}`}>
      <div className="flex items-center">
        <button onClick={() => onToggle(day)} aria-label={`Toggle Day ${day}`}
          className="flex items-center justify-center w-14 h-full py-4 shrink-0 hover:bg-[oklch(0.20_0.014_265)] transition-colors group">
          {completed
            ? <CheckCircle2 size={18} className="text-[oklch(0.78_0.12_85)] group-hover:scale-110 transition-transform" />
            : <Circle size={18} className="text-[oklch(0.35_0.014_265)] group-hover:text-[oklch(0.55_0.06_85)] transition-colors" />}
        </button>
        <button onClick={() => setOpen(!open)}
          className="flex-1 flex items-center gap-3 px-3 py-4 text-left hover:bg-[oklch(0.20_0.014_265)] transition-colors">
          <div className="flex flex-col items-start w-16 shrink-0">
            <span className={`font-mono text-xs ${completed ? "text-[oklch(0.78_0.12_85)]" : "text-[oklch(0.50_0.012_265)]"}`}>D{day}</span>
            {dateLabel && (
              <span className="font-mono text-[0.55rem] text-[oklch(0.45_0.08_85)] leading-none mt-0.5">{dateLabel}</span>
            )}
          </div>
          <span className={`text-sm font-semibold flex-1 ${completed ? "text-[oklch(0.60_0.015_265)] line-through" : "text-[oklch(0.88_0.01_85)]"}`}>{focus}</span>
          {completed && <span className="text-[0.6rem] font-mono text-[oklch(0.78_0.12_85)] uppercase tracking-wider shrink-0 mr-1">Done</span>}
          {open ? <ChevronUp size={14} className="text-[oklch(0.58_0.015_265)] shrink-0" /> : <ChevronDown size={14} className="text-[oklch(0.58_0.015_265)] shrink-0" />}
        </button>
      </div>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-[oklch(0.24_0.016_265)] ml-14">
          {dateLabel && (
            <p className="text-[0.65rem] font-mono text-[oklch(0.55_0.08_85)] mb-2 flex items-center gap-1.5">
              <CalendarDays size={10} /> {dateLabel}
            </p>
          )}
          <p className="text-sm text-[oklch(0.75_0.01_85)] leading-relaxed">{goal}</p>
          {!completed && (
            <button onClick={() => { onToggle(day); setOpen(false); }}
              className="mt-3 inline-flex items-center gap-2 text-xs font-mono text-[oklch(0.78_0.12_85)] border border-[oklch(0.78_0.12_85/0.3)] px-3 py-1.5 rounded hover:bg-[oklch(0.78_0.12_85/0.08)] transition-colors">
              <CheckCircle2 size={12} /> Mark as complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CompositionDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isBuiltIn = params.id === "la-campanella";

  // For built-in: use localStorage; for uploaded: use DB
  const [localCompleted, setLocalCompleted] = useState<Set<number>>(() => {
    if (!isBuiltIn) return new Set();
    try {
      const raw = localStorage.getItem(LC_STORAGE_KEY);
      if (raw) return new Set<number>(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  useEffect(() => {
    if (!isBuiltIn) return;
    try { localStorage.setItem(LC_STORAGE_KEY, JSON.stringify(Array.from(localCompleted))); } catch {}
  }, [localCompleted, isBuiltIn]);

  // Start date — stored per composition in localStorage
  const startDateKey = isBuiltIn
    ? LC_START_DATE_KEY
    : `piano-mastery-start-date-${params.id}`;

  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    try {
      const raw = localStorage.getItem(startDateKey);
      if (raw) return new Date(raw);
    } catch {}
    return undefined;
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [splitScreen, setSplitScreen] = useState(false);

  useEffect(() => {
    try {
      if (startDate) {
        localStorage.setItem(startDateKey, startDate.toISOString());
      } else {
        localStorage.removeItem(startDateKey);
      }
    } catch {}
  }, [startDate, startDateKey]);

  // Helper: given a day number (1–30), return the calendar date string
  const getDayDate = (dayNumber: number): string | null => {
    if (!startDate) return null;
    return format(addDays(startDate, dayNumber - 1), "MMM d");
  };

  // Fetch uploaded composition
  const compositionId = isBuiltIn ? null : parseInt(params.id ?? "0", 10);
  const { data: composition, isLoading: compLoading } = trpc.compositions.get.useQuery(
    { id: compositionId! },
    { enabled: !isBuiltIn && !!compositionId }
  );

  // Poll if still analyzing
  const { data: statusData } = trpc.compositions.status.useQuery(
    { id: compositionId! },
    {
      enabled: !isBuiltIn && !!compositionId && (composition?.status === "analyzing" || composition?.status === "pending"),
      refetchInterval: 3000,
    }
  );

  // DB progress for uploaded compositions
  const { data: dbProgress = [] } = trpc.progress.get.useQuery(
    { compositionId: compositionId! },
    { enabled: !isBuiltIn && !!compositionId }
  );
  const toggleMutation = trpc.progress.toggle.useMutation();
  const utils = trpc.useUtils();

  // Determine analysis and framework
  const analysis = isBuiltIn ? LA_CAMPANELLA_ANALYSIS : (composition?.analysis as any);
  const framework = isBuiltIn ? LA_CAMPANELLA_FRAMEWORK : (composition?.framework as any);
  const currentStatus = isBuiltIn ? "complete" : (statusData?.status ?? composition?.status ?? "pending");

  // Completed days set
  const dbCompletedSet = new Set(dbProgress.filter(p => p.completed === 1).map(p => p.dayNumber));
  const completed = isBuiltIn ? localCompleted : dbCompletedSet;

  const toggleDay = useCallback((day: number) => {
    if (isBuiltIn) {
      setLocalCompleted(prev => {
        const next = new Set(prev);
        if (next.has(day)) next.delete(day); else next.add(day);
        return next;
      });
    } else if (compositionId) {
      const nowCompleted = !dbCompletedSet.has(day);
      toggleMutation.mutate({ compositionId, dayNumber: day, completed: nowCompleted });
      utils.progress.get.invalidate({ compositionId });
    }
  }, [isBuiltIn, compositionId, dbCompletedSet, toggleMutation, utils]);

  const resetProgress = useCallback(() => {
    if (!window.confirm("Reset all progress? This cannot be undone.")) return;
    if (isBuiltIn) {
      setLocalCompleted(new Set());
    }
  }, [isBuiltIn]);

  // All days
  const allDays = framework?.weeks?.flatMap((w: any) => w.days.map((d: any) => d.day)) ?? [];
  const totalDays = allDays.length;
  const totalDone = allDays.filter((d: number) => completed.has(d)).length;
  const overallPct = totalDays > 0 ? Math.round((totalDone / totalDays) * 100) : 0;

  const [activeSection, setActiveSection] = useState("history");
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  };

  const hasScore = !isBuiltIn && !!composition?.fileUrl;

  const NAV_ITEMS = [
    ...(hasScore ? [{ id: "score", label: "View Score", icon: FileMusic }] : []),
    { id: "history", label: "Historical Context", icon: BookOpen },
    { id: "technical", label: "Technical Evaluation", icon: Music },
    { id: "hanon", label: "Hanon Exercises", icon: Dumbbell },
    { id: "performance", label: "Featured Performance", icon: Youtube },
    { id: "framework", label: "30-Day Framework", icon: Calendar },
    { id: "principles", label: "Practice Principles", icon: Info },
  ];

  // Loading state
  if (!isBuiltIn && compLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_265)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-[oklch(0.78_0.12_85)] animate-spin mx-auto mb-4" />
          <p className="font-['Playfair_Display'] text-xl text-[oklch(0.88_0.01_85)]">Loading composition…</p>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (!isBuiltIn && (currentStatus === "analyzing" || currentStatus === "pending")) {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_265)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full border-2 border-[oklch(0.78_0.12_85/0.4)] flex items-center justify-center mx-auto mb-6">
            <Loader2 size={36} className="text-[oklch(0.78_0.12_85)] animate-spin" />
          </div>
          <p className="font-['Playfair_Display'] text-2xl text-[oklch(0.88_0.01_85)] mb-3">Analyzing Your Score</p>
          <p className="text-[oklch(0.60_0.015_265)] leading-relaxed mb-6">
            Our AI is reading your score, identifying technical challenges, mapping Hanon exercises, and generating your personalized 30-day practice framework. This takes about 30–60 seconds.
          </p>
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[oklch(0.78_0.12_85)]"
                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <button onClick={() => navigate("/")} className="mt-8 text-sm text-[oklch(0.50_0.012_265)] hover:text-[oklch(0.78_0.12_85)] transition-colors">
            ← Back to library
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (!isBuiltIn && currentStatus === "error") {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_265)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <p className="font-['Playfair_Display'] text-2xl text-[oklch(0.88_0.01_85)] mb-3">Analysis Failed</p>
          <p className="text-[oklch(0.60_0.015_265)] mb-6">{statusData?.errorMessage ?? "An error occurred during analysis."}</p>
          <button onClick={() => navigate("/")} className="text-[oklch(0.78_0.12_85)] border border-[oklch(0.78_0.12_85/0.4)] px-4 py-2 rounded hover:bg-[oklch(0.78_0.12_85/0.08)] transition-colors">
            ← Back to library
          </button>
        </div>
      </div>
    );
  }

  if (!analysis || !framework) {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_265)] flex items-center justify-center">
        <p className="text-[oklch(0.55_0.015_265)]">Composition not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_265)] text-[oklch(0.92_0.01_85)]">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden min-h-[50vh] flex flex-col justify-end">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.018_265/0.4)] to-[oklch(0.12_0.018_265)]" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-12 pt-8 w-full">
          {/* Back nav */}
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-[oklch(0.55_0.015_265)] hover:text-[oklch(0.78_0.12_85)] transition-colors mb-8">
            <ChevronLeft size={16} /> Back to Library
          </button>
          <p className="font-mono text-[0.65rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em] mb-3">
            {analysis.composer} · {analysis.key} · {analysis.tempo}
          </p>
          <h1 className="font-['Playfair_Display'] font-black text-5xl sm:text-6xl text-[oklch(0.92_0.01_85)] mb-4">
            {analysis.title}
          </h1>
          <p className="text-[oklch(0.65_0.015_265)] text-lg max-w-2xl leading-relaxed">{analysis.overview}</p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {[analysis.difficulty, analysis.key, analysis.estimatedDuration].filter(Boolean).map((tag: string) => (
              <span key={tag} className="text-xs font-mono text-[oklch(0.60_0.012_265)] border border-[oklch(0.28_0.018_265)] rounded-full px-3 py-1">{tag}</span>
            ))}
            {hasScore && (
              <button
                onClick={() => setSplitScreen(s => !s)}
                title={splitScreen ? "Exit split-screen" : "Split-screen: Score + Tracker"}
                className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono border transition-all duration-200 ${
                  splitScreen
                    ? "bg-[oklch(0.78_0.12_85/0.15)] border-[oklch(0.78_0.12_85/0.6)] text-[oklch(0.78_0.12_85)]"
                    : "border-[oklch(0.30_0.018_265)] text-[oklch(0.55_0.015_265)] hover:border-[oklch(0.78_0.12_85/0.5)] hover:text-[oklch(0.78_0.12_85)]"
                }`}
              >
                {splitScreen ? <PanelLeftClose size={13} /> : <Columns2 size={13} />}
                {splitScreen ? "Exit Split" : "Split Screen"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── SPLIT-SCREEN MODE ─────────────────────────────────────────────── */}
      {splitScreen && hasScore && composition?.fileUrl && (
        <div className="fixed inset-0 top-0 z-50 bg-[oklch(0.10_0.016_265)] flex flex-col" style={{ paddingTop: 0 }}>
          {/* Split-screen top bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[oklch(0.22_0.016_265)] bg-[oklch(0.13_0.018_265)] shrink-0">
            <div className="flex items-center gap-3">
              <img src={LOGO_TREBLE} alt="" className="h-5 w-auto" />
              <span className="font-['Playfair_Display'] text-sm text-[oklch(0.78_0.12_85)]">{analysis.title}</span>
              <span className="text-[oklch(0.35_0.014_265)] text-xs font-mono">·</span>
              <span className="text-[oklch(0.50_0.012_265)] text-xs font-mono">Split Practice Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[oklch(0.78_0.12_85)]">{overallPct}% complete</span>
              <button
                onClick={() => setSplitScreen(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border border-[oklch(0.30_0.018_265)] text-[oklch(0.55_0.015_265)] hover:border-[oklch(0.78_0.12_85/0.5)] hover:text-[oklch(0.78_0.12_85)] transition-all"
              >
                <PanelLeftClose size={12} /> Exit Split
              </button>
            </div>
          </div>

          {/* Resizable panels */}
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            {/* Left: Score */}
            <ResizablePanel defaultSize={55} minSize={30}>
              <div className="h-full overflow-auto bg-[oklch(0.11_0.016_265)]">
                <ScoreViewer
                  fileUrl={composition.fileUrl}
                  mimeType={composition.mimeType ?? "application/pdf"}
                  title={analysis?.title ?? composition.title}
                />
              </div>
            </ResizablePanel>

            {/* Divider */}
            <ResizableHandle
              withHandle
              className="w-1.5 bg-[oklch(0.20_0.016_265)] hover:bg-[oklch(0.78_0.12_85/0.3)] transition-colors data-[resize-handle-active]:bg-[oklch(0.78_0.12_85/0.5)]"
            />

            {/* Right: Tracker */}
            <ResizablePanel defaultSize={45} minSize={28}>
              <div className="h-full overflow-y-auto bg-[oklch(0.12_0.018_265)] px-5 py-6">
                {/* Mini header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-mono text-[0.6rem] text-[oklch(0.50_0.012_265)] uppercase tracking-widest mb-0.5">Practice Tracker</p>
                    <h3 className="font-['Playfair_Display'] font-semibold text-lg text-[oklch(0.88_0.01_85)]">30-Day Plan</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressRing done={totalDone} total={totalDays} />
                  </div>
                </div>

                {/* Overall progress bar */}
                <div className="w-full h-2 rounded-full bg-[oklch(0.22_0.014_265)] overflow-hidden mb-4">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${overallPct}%`, background: "linear-gradient(to right, oklch(0.60 0.08 85), oklch(0.78 0.12 85))" }} />
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-10 gap-1 mb-5">
                  {allDays.map((day: number) => {
                    const done = completed.has(day);
                    const weekIdx = (framework.weeks ?? []).findIndex((w: any) => w.days.some((d: any) => d.day === day));
                    const weekColors = ["oklch(0.78 0.12 85)", "oklch(0.70 0.10 85)", "oklch(0.62 0.09 85)", "oklch(0.55 0.08 85)"];
                    return (
                      <button key={day} onClick={() => toggleDay(day)} title={`Day ${day}`}
                        className={`aspect-square rounded flex items-center justify-center text-[0.5rem] font-mono font-bold transition-all hover:scale-110 active:scale-95 ${
                          done ? "text-[oklch(0.12_0.018_265)]" : "text-[oklch(0.40_0.012_265)] border border-[oklch(0.24_0.016_265)] hover:border-[oklch(0.50_0.06_85)]"
                        }`}
                        style={done ? { background: weekColors[weekIdx] ?? weekColors[0] } : {}}>
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Start date */}
                <div className="flex items-center gap-2 mb-5">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono bg-[oklch(0.18_0.016_265)] border border-[oklch(0.28_0.018_265)] text-[oklch(0.65_0.015_265)] hover:border-[oklch(0.78_0.12_85/0.5)] hover:text-[oklch(0.78_0.12_85)] transition-all">
                        <CalendarDays size={11} />
                        {startDate ? `Day 1: ${format(startDate, "MMM d, yyyy")}` : "Set start date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[oklch(0.14_0.018_265)] border border-[oklch(0.28_0.018_265)] shadow-2xl z-[60]" align="start">
                      <CalendarPicker mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setDatePickerOpen(false); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {startDate && (
                    <button onClick={() => setStartDate(undefined)} className="p-1 rounded text-[oklch(0.40_0.012_265)] hover:text-red-400 transition-colors">
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Week bands + DayCards */}
                {(framework.weeks ?? []).map((week: any, wi: number) => {
                  const colorL = 0.78 - wi * 0.08;
                  return (
                    <div key={week.week} className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: `oklch(${colorL} 0.10 85)` }} />
                        <span className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-widest">Week {week.week}</span>
                        <span className="font-mono text-[0.6rem] text-[oklch(0.45_0.012_265)]">{week.title}</span>
                      </div>
                      <div className="grid gap-1.5">
                        {week.days.map((d: any) => (
                          <DayCard key={d.day} day={d.day} focus={d.focus} goal={d.goal}
                            completed={completed.has(d.day)} onToggle={toggleDay}
                            dateLabel={getDayDate(d.day)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* ── NORMAL LAYOUT ─────────────────────────────────────────────────── */}
      <div className={splitScreen ? "hidden" : "flex"}>
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-[oklch(0.24_0.016_265)] bg-[oklch(0.14_0.018_265)] py-10 px-6">
          <div className="flex items-center gap-2 mb-10">
            <img src={LOGO_TREBLE} alt="" className="h-7 w-auto" />
            <span className="font-['Playfair_Display'] text-sm text-[oklch(0.78_0.12_85)]">Navigation</span>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-left transition-all ${activeSection === id ? "bg-[oklch(0.78_0.12_85/0.12)] text-[oklch(0.78_0.12_85)] font-semibold" : "text-[oklch(0.58_0.015_265)] hover:text-[oklch(0.78_0.12_85)] hover:bg-[oklch(0.20_0.014_265)]"}`}>
                <Icon size={14} className="shrink-0" />{label}
              </button>
            ))}
          </nav>

          {/* Progress ring */}
          <div className="mt-8 pt-6 border-t border-[oklch(0.24_0.016_265)]">
            <p className="font-mono text-[0.6rem] text-[oklch(0.50_0.012_265)] uppercase tracking-widest mb-4">Your Progress</p>
            <div className="flex justify-center mb-2">
              <ProgressRing done={totalDone} total={totalDays} />
            </div>
            <p className="text-center font-['Playfair_Display'] text-sm text-[oklch(0.75_0.01_85)] mt-2">
              {totalDone === 0 ? "Begin your journey" : totalDone === totalDays ? `${analysis.title} — conquered.` : `${totalDays - totalDone} days remaining`}
            </p>
            {totalDone > 0 && isBuiltIn && (
              <button onClick={resetProgress} className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-[oklch(0.40_0.012_265)] hover:text-[oklch(0.60_0.015_265)] transition-colors py-1">
                <RotateCcw size={10} /> Reset progress
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 py-20 space-y-0">

            {/* ── SCORE VIEWER ───────────────────────────────────────────── */}
            {hasScore && composition?.fileUrl && (
              <>
                <section id="score" className="pb-2">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-[oklch(0.78_0.12_85)] text-xl select-none">♪</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-[oklch(0.78_0.12_85/0.6)] to-transparent" />
                    <span className="font-mono text-[0.6rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.25em]">Score</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-[oklch(0.78_0.12_85/0.6)] to-transparent" />
                    <span className="text-[oklch(0.78_0.12_85)] text-xl select-none">♪</span>
                  </div>
                  <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">Your Score</h2>
                  <p className="text-[oklch(0.60_0.015_265)] text-sm mb-8">
                    Read the score directly in the app. Use the toolbar to zoom, navigate pages, rotate, or download.
                    Click the fullscreen button for an immersive practice view.
                  </p>
                  <ScoreViewer
                    fileUrl={composition.fileUrl}
                    mimeType={composition.mimeType ?? "application/pdf"}
                    title={analysis?.title ?? composition.title}
                  />
                </section>
                <GoldRule />
              </>
            )}

            {/* ── HISTORICAL CONTEXT ─────────────────────────────────────── */}
            <section id="history">
              <BellOrnament label="Part I" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-8">Historical & Compositional Context</h2>
              <div className="space-y-5 text-[oklch(0.75_0.01_85)] leading-relaxed">
                {(analysis.historicalContext ?? "").split("\n\n").map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            <GoldRule />

            {/* ── TECHNICAL EVALUATION ───────────────────────────────────── */}
            <section id="technical">
              <BellOrnament label="Part II" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">Complete Technical Evaluation</h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-10 max-w-2xl">
                This piece tests the pianist across {analysis.technicalChallenges?.length ?? 5} distinct technical domains. Each is a discipline unto itself.
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {(analysis.technicalChallenges ?? []).map((c: any, i: number) => (
                  <div key={i} className="nocturne-card p-6 border-l-2" style={{ borderLeftColor: `oklch(${0.78 - i * 0.05} ${0.12 - i * 0.01} 85)` }}>
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-2xl text-[oklch(0.78_0.12_85)] font-['Playfair_Display'] font-bold w-8 shrink-0">{c.icon}</span>
                      <div>
                        <h3 className="font-['Playfair_Display'] font-semibold text-xl text-[oklch(0.88_0.01_85)] mb-1">{c.title}</h3>
                        <p className="font-mono text-xs text-[oklch(0.50_0.012_265)]">{c.location}</p>
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
            </section>

            <GoldRule />

            {/* ── HANON EXERCISES ────────────────────────────────────────── */}
            <section id="hanon">
              <BellOrnament label="Part III" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">Hanon Exercises — A Targeted Selection</h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-10 max-w-2xl">
                The following exercises from Hanon's <em>The Virtuoso Pianist in 60 Exercises</em> have been selected specifically because they address the technical demands of this piece.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t border-[oklch(0.78_0.12_85/0.4)]">
                      {["No.", "Technical Focus", "Application", ""].map((h, idx) => (
                        <th key={idx} className="text-left py-3 px-4 font-mono text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(analysis.hanonExercises ?? []).map((ex: any, i: number) => {
                      // Build a YouTube search URL for this specific Hanon exercise
                      const ytQuery = encodeURIComponent(`Hanon ${ex.number} piano exercise tutorial`);
                      const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;
                      return (
                        <tr key={i} className="border-b border-[oklch(0.22_0.014_265)] hover:bg-[oklch(0.17_0.016_265)] transition-colors">
                          <td className="py-3 px-4 font-mono text-[oklch(0.78_0.12_85)] font-medium">{ex.number}</td>
                          <td className="py-3 px-4 text-[oklch(0.75_0.01_85)]">{ex.focus}</td>
                          <td className="py-3 px-4 text-[oklch(0.58_0.015_265)]">{ex.application}</td>
                          <td className="py-3 px-4">
                            <a
                              href={ytUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`Watch Hanon ${ex.number} tutorial on YouTube`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.65rem] font-mono font-medium
                                bg-red-600/15 border border-red-600/30 text-red-400
                                hover:bg-red-600/25 hover:border-red-500/50 hover:text-red-300
                                transition-all duration-150 whitespace-nowrap"
                            >
                              <Youtube size={11} />
                              Watch
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <GoldRule />

            {/* ── FEATURED PERFORMANCE VIDEO ─────────────────────────────── */}
            <section id="performance">
              <BellOrnament label="Part IV" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">Featured Performance</h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-10 max-w-2xl">
                Watch the most-viewed professional recording of this piece on YouTube. Studying a master performance
                is an essential part of learning — absorb the phrasing, dynamics, and musical character before
                your fingers learn the notes.
              </p>
              <PerformanceVideoSection title={analysis.title} composer={analysis.composer} />
            </section>

            <GoldRule />

            {/* ── 30-DAY FRAMEWORK ───────────────────────────────────────── */}
            <section id="framework">
              <BellOrnament label="Part IV" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-4">The 30-Day Practice Framework</h2>
              <p className="text-[oklch(0.65_0.015_265)] leading-relaxed mb-10 max-w-2xl">
                Each session is designed to last <strong className="text-[oklch(0.88_0.01_85)]">2 to 2.5 hours</strong> of dedicated practice daily.
              </p>

              {/* Progress Dashboard */}
              <div className="nocturne-card p-6 mb-12 border-[oklch(0.78_0.12_85/0.2)]">
                <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
                  <div>
                    <p className="font-mono text-[0.6rem] text-[oklch(0.50_0.012_265)] uppercase tracking-widest mb-1">Practice Tracker</p>
                    <h3 className="font-['Playfair_Display'] font-semibold text-xl text-[oklch(0.88_0.01_85)]">Your 30-Day Progress</h3>
                    {/* Start-date picker */}
                    <div className="mt-3 flex items-center gap-2">
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono
                            bg-[oklch(0.18_0.016_265)] border border-[oklch(0.28_0.018_265)]
                            text-[oklch(0.65_0.015_265)] hover:border-[oklch(0.78_0.12_85/0.5)]
                            hover:text-[oklch(0.78_0.12_85)] transition-all duration-150">
                            <CalendarDays size={12} />
                            {startDate ? `Day 1: ${format(startDate, "MMM d, yyyy")}` : "Set start date"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[oklch(0.14_0.018_265)] border border-[oklch(0.28_0.018_265)] shadow-2xl" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => { setStartDate(date); setDatePickerOpen(false); }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {startDate && (
                        <button
                          onClick={() => setStartDate(undefined)}
                          title="Clear start date"
                          className="p-1 rounded text-[oklch(0.40_0.012_265)] hover:text-red-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {startDate && (
                      <p className="mt-1.5 text-[0.6rem] font-mono text-[oklch(0.45_0.08_85)]">
                        Ends {format(addDays(startDate, 29), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-3xl font-bold text-[oklch(0.78_0.12_85)]">{overallPct}%</p>
                    <p className="font-mono text-xs text-[oklch(0.50_0.012_265)]">{totalDone} of {totalDays} days</p>
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-[oklch(0.22_0.014_265)] overflow-hidden mb-5">
                  <div className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${overallPct}%`, background: "linear-gradient(to right, oklch(0.60 0.08 85), oklch(0.78 0.12 85))" }} />
                </div>
                {/* Day grid */}
                <div className="grid grid-cols-10 gap-1.5 mb-5">
                  {allDays.map((day: number) => {
                    const done = completed.has(day);
                    const weekIdx = (framework.weeks ?? []).findIndex((w: any) => w.days.some((d: any) => d.day === day));
                    const weekColors = ["oklch(0.78 0.12 85)", "oklch(0.70 0.10 85)", "oklch(0.62 0.09 85)", "oklch(0.55 0.08 85)"];
                    return (
                      <button key={day} onClick={() => toggleDay(day)} title={`Day ${day}`}
                        className={`aspect-square rounded flex items-center justify-center text-[0.55rem] font-mono font-bold transition-all duration-150 hover:scale-110 active:scale-95 ${done ? "text-[oklch(0.12_0.018_265)]" : "text-[oklch(0.40_0.012_265)] border border-[oklch(0.24_0.016_265)] hover:border-[oklch(0.50_0.06_85)]"}`}
                        style={done ? { background: weekColors[weekIdx] ?? weekColors[0] } : {}}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                {/* Week bars */}
                <div className="grid sm:grid-cols-4 gap-4">
                  {(framework.weeks ?? []).map((week: any, wi: number) => {
                    const weekDone = week.days.filter((d: any) => completed.has(d.day)).length;
                    const pct = week.days.length > 0 ? (weekDone / week.days.length) * 100 : 0;
                    const colorL = 0.78 - wi * 0.06;
                    return (
                      <div key={week.week} className="bg-[oklch(0.14_0.016_265)] rounded-lg p-3">
                        <p className="font-mono text-[0.6rem] text-[oklch(0.50_0.012_265)] uppercase tracking-widest mb-0.5">Week {week.week}</p>
                        <p className="font-['Playfair_Display'] text-sm font-semibold text-[oklch(0.82_0.01_85)] leading-tight mb-1">{week.title}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[oklch(0.22_0.014_265)] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `oklch(${colorL} 0.10 85)` }} />
                          </div>
                          <span className="font-mono text-[0.65rem] text-[oklch(0.50_0.012_265)]">{weekDone}/{week.days.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Session structure */}
              <h3 className="font-['Playfair_Display'] font-semibold text-2xl text-[oklch(0.88_0.01_85)] mb-5">Daily Session Structure</h3>
              <div className="overflow-x-auto mb-14">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t border-[oklch(0.78_0.12_85/0.4)]">
                      {["Session Block", "Duration", "Purpose"].map(h => (
                        <th key={h} className="text-left py-3 px-4 font-mono text-xs text-[oklch(0.78_0.12_85)] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(framework.sessionBlocks ?? []).map((b: any, i: number) => (
                      <tr key={i} className="border-b border-[oklch(0.22_0.014_265)] hover:bg-[oklch(0.17_0.016_265)] transition-colors">
                        <td className="py-3 px-4 text-[oklch(0.80_0.01_85)] font-semibold">{b.block}</td>
                        <td className="py-3 px-4 font-mono text-[oklch(0.78_0.12_85)]">{b.duration}</td>
                        <td className="py-3 px-4 text-[oklch(0.58_0.015_265)]">{b.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Milestones */}
              <h3 className="font-['Playfair_Display'] font-semibold text-2xl text-[oklch(0.88_0.01_85)] mb-6">Milestone Summary</h3>
              <div className="relative mb-14">
                <div className="hidden sm:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.12_85/0.35)] to-transparent" />
                <div className="grid sm:grid-cols-4 gap-6">
                  {(framework.milestones ?? []).map((m: any, i: number) => {
                    const milestoneDay = [7, 14, 21, 30][i];
                    const reached = milestoneDay !== undefined && completed.has(milestoneDay);
                    return (
                      <div key={i} className="relative flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-4 z-10 transition-all duration-500 ${reached ? "border-[oklch(0.78_0.12_85)] bg-[oklch(0.78_0.12_85/0.15)]" : "border-[oklch(0.35_0.014_265)] bg-[oklch(0.17_0.016_265)]"}`}>
                          {reached ? <CheckCircle2 size={20} className="text-[oklch(0.78_0.12_85)]" /> : <span className="font-mono text-[oklch(0.40_0.012_265)] text-xs font-bold">{i + 1}</span>}
                        </div>
                        <p className={`font-mono text-xs font-bold mb-1 ${reached ? "text-[oklch(0.78_0.12_85)]" : "text-[oklch(0.50_0.012_265)]"}`}>{m.date}</p>
                        <p className="text-[oklch(0.82_0.01_85)] text-sm font-semibold mb-1 leading-snug">{m.label}</p>
                        <p className="text-[oklch(0.48_0.012_265)] text-xs leading-relaxed">{m.benchmark}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly schedules */}
              {(framework.weeks ?? []).map((week: any, wi: number) => {
                const weekDone = week.days.filter((d: any) => completed.has(d.day)).length;
                const colorL = 0.78 - wi * 0.08;
                return (
                  <div key={week.week} className="mb-14">
                    <div className="flex items-stretch gap-0 mb-3 rounded-lg overflow-hidden border border-[oklch(0.28_0.018_265)]">
                      <div className="w-2 shrink-0" style={{ background: `oklch(${colorL} ${0.12 - wi * 0.02} 85)` }} />
                      <div className="flex-1 px-6 py-5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[0.65rem] text-[oklch(0.78_0.12_85)] uppercase tracking-[0.2em]">
                            Week {week.week} · Days {week.days[0]?.day}–{week.days[week.days.length - 1]?.day}
                          </span>
                          <span className="font-mono text-[0.65rem] text-[oklch(0.50_0.012_265)]">{weekDone}/{week.days.length} complete</span>
                        </div>
                        <h3 className="font-['Playfair_Display'] font-bold text-xl text-[oklch(0.90_0.01_85)] mb-2">{week.title}</h3>
                        <p className="text-[oklch(0.60_0.015_265)] text-sm leading-relaxed mb-2">{week.goal}</p>
                        <p className="text-xs text-[oklch(0.48_0.012_265)]">
                          <span className="text-[oklch(0.60_0.08_85)] font-semibold">Milestone: </span>{week.milestone}
                        </p>
                        <p className="text-xs text-[oklch(0.48_0.012_265)] mt-1">
                          <span className="text-[oklch(0.60_0.08_85)] font-semibold">Hanon: </span>{week.hanon}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {week.days.map((d: any) => (
                        <DayCard key={d.day} day={d.day} focus={d.focus} goal={d.goal}
                          completed={completed.has(d.day)} onToggle={toggleDay}
                          dateLabel={getDayDate(d.day)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            <GoldRule />

            {/* ── PRACTICE PRINCIPLES ────────────────────────────────────── */}
            <section id="principles">
              <BellOrnament label="Part V" />
              <h2 className="font-['Playfair_Display'] font-bold text-4xl sm:text-5xl text-[oklch(0.92_0.01_85)] mb-10">Essential Practice Principles</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {(framework.practiceNotes ?? []).map((note: string, i: number) => (
                  <div key={i} className="nocturne-card p-7">
                    <p className="font-mono text-[oklch(0.78_0.12_85)] text-lg font-bold mb-3">0{i + 1}</p>
                    <p className="text-sm text-[oklch(0.65_0.015_265)] leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="pt-20 pb-10">
              <div className="h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.12_85/0.4)] to-transparent mb-10" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={LOGO_TREBLE} alt="" className="h-8 w-auto" />
                  <div>
                    <p className="font-['Playfair_Display'] font-semibold text-[oklch(0.78_0.12_85)]">{analysis.title}</p>
                    <p className="text-xs text-[oklch(0.40_0.012_265)]">{analysis.composer} · {analysis.key}</p>
                  </div>
                </div>
                <button onClick={() => navigate("/")} className="text-sm text-[oklch(0.50_0.012_265)] hover:text-[oklch(0.78_0.12_85)] transition-colors">
                  ← Back to Library
                </button>
              </div>
            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}
