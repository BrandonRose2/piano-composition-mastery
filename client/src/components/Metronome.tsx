import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_BPM, MIN_BPM, normalizeTempo, parseTempoDraft } from "@shared/metronomeTempo";

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "6/8", beats: 6 },
];

const TEMPO_MARKS = [
  { label: "Grave", min: 20, max: 40 },
  { label: "Largo", min: 40, max: 60 },
  { label: "Adagio", min: 60, max: 72 },
  { label: "Andante", min: 72, max: 96 },
  { label: "Moderato", min: 96, max: 120 },
  { label: "Allegro", min: 120, max: 156 },
  { label: "Vivace", min: 156, max: 176 },
  { label: "Presto", min: 176, max: 210 },
];

function getTempoMark(bpm: number) {
  return TEMPO_MARKS.find((t) => bpm >= t.min && bpm <= t.max)?.label ?? "Prestissimo";
}

export default function Metronome() {
  const [bpm, setBpm] = useState(80);
  const [tempoDraft, setTempoDraft] = useState("80");
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSig, setTimeSig] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready — use Test Sound, then Start.");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpmRef = useRef(bpm);
  const timeSigRef = useRef(timeSig);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; }, [timeSig]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const scheduleNote = useCallback((beatNumber: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const isAccent = beatNumber === 0;
    osc.frequency.value = isAccent ? 1000 : 800;
    gain.gain.setValueAtTime(isAccent ? 0.9 : 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.08);
  }, []);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const secondsPerBeat = 60.0 / bpmRef.current;
    const scheduleAheadTime = 0.1;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      scheduleNote(currentBeatRef.current, nextNoteTimeRef.current);

      const beat = currentBeatRef.current;
      const noteTime = nextNoteTimeRef.current;
      const delay = Math.max(0, (noteTime - ctx.currentTime) * 1000);
      setTimeout(() => {
        setCurrentBeat(beat);
      }, delay);

      currentBeatRef.current = (currentBeatRef.current + 1) % timeSigRef.current;
      nextNoteTimeRef.current += secondsPerBeat;
    }

    schedulerRef.current = setTimeout(scheduler, 25);
  }, [scheduleNote]);

  const start = useCallback(async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        setAudioError("Your browser does not support the Web Audio metronome.");
        return;
      }
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setAudioError(null);
      currentBeatRef.current = 0;
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
      isPlayingRef.current = true;
      setIsPlaying(true);
      setStatusMessage(`Running at ${bpmRef.current} BPM in ${timeSigRef.current}/4.`);
      scheduler();
    } catch {
      setAudioError("Sound could not start. Check that this browser tab is not muted, then try again.");
    }
  }, [scheduler]);

  const stop = useCallback(() => {
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBeat(0);
    setStatusMessage("Stopped — adjust tempo or press Start when ready.");
  }, []);

  const toggle = useCallback(async () => {
    if (isPlayingRef.current) stop();
    else await start();
  }, [start, stop]);

  // Stop and restart when BPM or time sig changes while playing
  const restartIfPlaying = useCallback(() => {
    if (isPlayingRef.current) {
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
      currentBeatRef.current = 0;
      if (audioCtxRef.current) {
        nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
      }
      scheduler();
    }
  }, [scheduler]);

  // Tap tempo
  const handleTap = useCallback(() => {
    const now = Date.now();
    setTapTimes((prev) => {
      const recent = [...prev, now].filter((t) => now - t < 3000).slice(-8);
      if (recent.length >= 2) {
        const intervals = recent.slice(1).map((t, i) => t - recent[i]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const newBpm = Math.round(60000 / avg);
        commitTempoChange(newBpm);
      }
      return recent;
    });
  }, [restartIfPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const commitTempoChange = useCallback((value: number) => {
    const normalized = normalizeTempo(value);
    bpmRef.current = normalized;
    setBpm(normalized);
    setTempoDraft(String(normalized));
    setTimeout(restartIfPlaying, 0);
  }, [restartIfPlaying]);

  const handleSliderInput = (value: number) => {
    const normalized = normalizeTempo(value);
    // While dragging, the display stays responsive but an active pulse is not
    // restarted on every pixel. The new tempo is committed on release.
    setBpm(normalized);
    setTempoDraft(String(normalized));
  };

  const commitSliderTempo = (value: number) => {
    commitTempoChange(value);
  };

  const commitTempoDraft = () => {
    const parsed = parseTempoDraft(tempoDraft);
    if (parsed === null) {
      setTempoDraft(String(bpm));
      return;
    }
    commitTempoChange(parsed);
  };

  const handleTimeSigChange = (beats: number) => {
    setTimeSig(beats);
    timeSigRef.current = beats;
    currentBeatRef.current = 0;
    setTimeout(restartIfPlaying, 0);
  };

  const testSound = useCallback(async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error("Unsupported");
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass();
      if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
      scheduleNote(0, audioCtxRef.current.currentTime + 0.01);
      setAudioError(null);
      setStatusMessage("Test click played. If you heard it, press Start to begin the pulse.");
    } catch {
      setAudioError("Sound could not play. Check the browser tab and device are not muted, then try again.");
    }
  }, [scheduleNote]);

  const tempoMark = getTempoMark(bpm);

  return (
    <div className="metronome-widget" aria-live="polite">
      {/* BPM Display */}
      <div className="metro-bpm-display">
        <span className="metro-bpm-number">{bpm}</span>
        <span className="metro-bpm-label">BPM</span>
        <span className="metro-tempo-mark">{tempoMark}</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <label htmlFor="metronome-tempo-input" className="text-[0.62rem] uppercase tracking-[0.14em] text-[oklch(0.55_0.018_265)]">
          Set tempo
        </label>
        <input
          id="metronome-tempo-input"
          type="number"
          inputMode="numeric"
          min={MIN_BPM}
          max={MAX_BPM}
          value={tempoDraft}
          onChange={(event) => setTempoDraft(event.target.value)}
          onBlur={commitTempoDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="w-16 rounded-md border border-[oklch(0.30_0.018_265)] bg-[oklch(0.13_0.012_265)] px-2 py-1 text-center font-mono text-sm text-[oklch(0.88_0.01_85)] outline-none transition-colors focus:border-[oklch(0.78_0.12_85)] focus:ring-1 focus:ring-[oklch(0.78_0.12_85/0.45)]"
          aria-label="Set tempo in beats per minute"
        />
      </div>

      {/* Beat Indicators */}
      <div className="metro-beats">
        {Array.from({ length: timeSig }).map((_, i) => (
          <div
            key={i}
            className={`metro-beat-dot ${isPlaying && currentBeat === i ? "metro-beat-active" : ""} ${i === 0 ? "metro-beat-accent" : ""}`}
          />
        ))}
      </div>

      {/* BPM Slider */}
      <div className="metro-slider-row">
        <span className="metro-slider-label">{MIN_BPM}</span>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          value={bpm}
          onChange={(event) => handleSliderInput(Number(event.target.value))}
          onPointerUp={(event) => commitSliderTempo(Number(event.currentTarget.value))}
          onKeyUp={(event) => {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
              commitSliderTempo(Number(event.currentTarget.value));
            }
          }}
          onBlur={(event) => commitSliderTempo(Number(event.currentTarget.value))}
          className="metro-slider"
          style={{ backgroundSize: `${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}% 3px` }}
          aria-label="Tempo in beats per minute"
        />
        <span className="metro-slider-label">{MAX_BPM}</span>
      </div>

      {/* BPM Quick Buttons */}
      <div className="metro-quick-btns">
        {[-10, -5, -1, +1, +5, +10].map((delta) => (
          <button
            key={delta}
            className="metro-quick-btn"
            onClick={() => commitTempoChange(bpm + delta)}
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>

      {/* Time Signature */}
      <div className="metro-timesig-row">
        {TIME_SIGNATURES.map((ts) => (
          <button
            key={ts.label}
            className={`metro-timesig-btn ${timeSig === ts.beats ? "metro-timesig-active" : ""}`}
            onClick={() => handleTimeSigChange(ts.beats)}
          >
            {ts.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="metro-controls">
        <button className="metro-tap-btn" onClick={handleTap} aria-label="Tap tempo">
          Tap Tempo
        </button>
        <button className="metro-tap-btn" onClick={testSound} aria-label="Play a test metronome click">
          Test Sound
        </button>
        <button
          className={`metro-play-btn ${isPlaying ? "metro-playing" : ""}`}
          onClick={toggle}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
          {isPlaying ? "Stop" : "Start"}
        </button>
      </div>

      {/* Tempo reference */}
      <div className="metro-tempo-ref">
        {TEMPO_MARKS.map((t) => (
          <button
            key={t.label}
            className={`metro-ref-btn ${bpm >= t.min && bpm <= t.max ? "metro-ref-active" : ""}`}
            onClick={() => commitTempoChange(Math.round((t.min + t.max) / 2))}
            title={`${t.min}–${t.max} BPM`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[0.7rem] leading-snug text-[oklch(0.66_0.014_265)]" role="status">{statusMessage}</p>
      {audioError && <p className="mt-3 text-center text-[0.7rem] text-amber-300/80 leading-snug">{audioError}</p>}
    </div>
  );
}
