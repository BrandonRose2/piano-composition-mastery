import { useCallback, useEffect, useRef, useState } from "react";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSig, setTimeSig] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

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

  const start = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    setIsPlaying(true);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) stop();
    else start();
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
        const clamped = Math.min(220, Math.max(20, newBpm));
        setBpm(clamped);
        setTimeout(restartIfPlaying, 0);
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

  const handleBpmChange = (val: number) => {
    setBpm(val);
    setTimeout(restartIfPlaying, 0);
  };

  const handleTimeSigChange = (beats: number) => {
    setTimeSig(beats);
    timeSigRef.current = beats;
    currentBeatRef.current = 0;
    setTimeout(restartIfPlaying, 0);
  };

  const tempoMark = getTempoMark(bpm);

  return (
    <div className="metronome-widget">
      {/* BPM Display */}
      <div className="metro-bpm-display">
        <span className="metro-bpm-number">{bpm}</span>
        <span className="metro-bpm-label">BPM</span>
        <span className="metro-tempo-mark">{tempoMark}</span>
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
        <span className="metro-slider-label">20</span>
        <input
          type="range"
          min={20}
          max={220}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="metro-slider"
        />
        <span className="metro-slider-label">220</span>
      </div>

      {/* BPM Quick Buttons */}
      <div className="metro-quick-btns">
        {[-10, -5, -1, +1, +5, +10].map((delta) => (
          <button
            key={delta}
            className="metro-quick-btn"
            onClick={() => handleBpmChange(Math.min(220, Math.max(20, bpm + delta)))}
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
        <button className="metro-tap-btn" onClick={handleTap}>
          Tap Tempo
        </button>
        <button
          className={`metro-play-btn ${isPlaying ? "metro-playing" : ""}`}
          onClick={toggle}
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
            onClick={() => handleBpmChange(Math.round((t.min + t.max) / 2))}
            title={`${t.min}–${t.max} BPM`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
