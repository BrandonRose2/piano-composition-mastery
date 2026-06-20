import { execFile } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { promisify } from "util";
import { invokeLLM } from "./_core/llm";

const execFileAsync = promisify(execFile);

export interface TechnicalChallenge {
  title: string;
  icon: string;
  location: string;
  description: string;
  tip: string;
}

export interface HanonExercise {
  number: string;
  focus: string;
  application: string;
}

export interface CompositionAnalysis {
  title: string;
  composer: string;
  key: string;
  tempo: string;
  difficulty: string;
  estimatedDuration: string;
  overview: string;
  historicalContext: string;
  technicalChallenges: TechnicalChallenge[];
  hanonExercises: HanonExercise[];
}

export interface DaySchedule {
  day: number;
  focus: string;
  goal: string;
}

export interface WeekSchedule {
  week: number;
  title: string;
  goal: string;
  milestone: string;
  hanon: string;
  days: DaySchedule[];
}

export interface Milestone {
  date: string;
  label: string;
  benchmark: string;
}

export interface SessionBlock {
  block: string;
  duration: string;
  purpose: string;
}

export interface CompositionFramework {
  sessionBlocks: SessionBlock[];
  milestones: Milestone[];
  weeks: WeekSchedule[];
  practiceNotes: string[];
}

/**
 * Extract text from a PDF buffer using the system pdftotext utility.
 * Writes to a temp file, runs pdftotext, then cleans up.
 * Returns empty string on failure (graceful degradation).
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const tmpPath = `/tmp/piano_score_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
  try {
    writeFileSync(tmpPath, buffer);
    const { stdout } = await execFileAsync("pdftotext", [tmpPath, "-"], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15000,
    });
    const text = stdout.trim();
    console.log(`[Analysis] pdftotext extracted ${text.length} chars`);
    return text;
  } catch (err) {
    console.warn("[Analysis] pdftotext extraction failed:", err instanceof Error ? err.message : err);
    return "";
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }
  }
}

const JSON_SCHEMA = `{
  "analysis": {
    "title": "string — the full title of the composition",
    "composer": "string — composer full name",
    "key": "string — e.g. G-sharp minor",
    "tempo": "string — e.g. Allegretto or ♩=120",
    "difficulty": "string — e.g. Advanced, Intermediate-Advanced",
    "estimatedDuration": "string — e.g. 4–5 minutes",
    "overview": "string — 2-3 sentences summarizing the piece",
    "historicalContext": "string — 2-3 paragraphs separated by \\n\\n",
    "technicalChallenges": [
      {
        "title": "string",
        "icon": "single character or symbol",
        "location": "string — measure numbers or section name",
        "description": "string — 2-3 sentences",
        "tip": "string — 1-2 sentences"
      }
    ],
    "hanonExercises": [
      {
        "number": "string — e.g. 46 or 1-5",
        "focus": "string",
        "application": "string"
      }
    ]
  },
  "framework": {
    "sessionBlocks": [
      { "block": "string", "duration": "string", "purpose": "string" }
    ],
    "milestones": [
      { "date": "Day 7", "label": "string", "benchmark": "string" },
      { "date": "Day 14", "label": "string", "benchmark": "string" },
      { "date": "Day 21", "label": "string", "benchmark": "string" },
      { "date": "Day 30", "label": "string", "benchmark": "string" }
    ],
    "weeks": [
      {
        "week": 1, "title": "string", "goal": "string", "milestone": "string", "hanon": "string",
        "days": [
          {"day":1,"focus":"string","goal":"string"},{"day":2,"focus":"string","goal":"string"},
          {"day":3,"focus":"string","goal":"string"},{"day":4,"focus":"string","goal":"string"},
          {"day":5,"focus":"string","goal":"string"},{"day":6,"focus":"string","goal":"string"},
          {"day":7,"focus":"string","goal":"string"}
        ]
      },
      {
        "week": 2, "title": "string", "goal": "string", "milestone": "string", "hanon": "string",
        "days": [
          {"day":8,"focus":"string","goal":"string"},{"day":9,"focus":"string","goal":"string"},
          {"day":10,"focus":"string","goal":"string"},{"day":11,"focus":"string","goal":"string"},
          {"day":12,"focus":"string","goal":"string"},{"day":13,"focus":"string","goal":"string"},
          {"day":14,"focus":"string","goal":"string"}
        ]
      },
      {
        "week": 3, "title": "string", "goal": "string", "milestone": "string", "hanon": "string",
        "days": [
          {"day":15,"focus":"string","goal":"string"},{"day":16,"focus":"string","goal":"string"},
          {"day":17,"focus":"string","goal":"string"},{"day":18,"focus":"string","goal":"string"},
          {"day":19,"focus":"string","goal":"string"},{"day":20,"focus":"string","goal":"string"},
          {"day":21,"focus":"string","goal":"string"}
        ]
      },
      {
        "week": 4, "title": "string", "goal": "string", "milestone": "string", "hanon": "string",
        "days": [
          {"day":22,"focus":"string","goal":"string"},{"day":23,"focus":"string","goal":"string"},
          {"day":24,"focus":"string","goal":"string"},{"day":25,"focus":"string","goal":"string"},
          {"day":26,"focus":"string","goal":"string"},{"day":27,"focus":"string","goal":"string"},
          {"day":28,"focus":"string","goal":"string"},{"day":29,"focus":"string","goal":"string"},
          {"day":30,"focus":"string","goal":"string"}
        ]
      }
    ],
    "practiceNotes": ["string","string","string","string"]
  }
}`;

/**
 * Analyze a piano composition.
 * Accepts the raw file buffer so we can extract text server-side.
 * Falls back to filename-based knowledge analysis if extraction yields little text.
 */
export async function analyzeComposition(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ analysis: CompositionAnalysis; framework: CompositionFramework }> {

  // 1. Extract text from the file server-side
  let extractedText = "";
  if (mimeType === "application/pdf") {
    console.log(`[Analysis] Extracting text from PDF: ${fileName}`);
    extractedText = await extractPdfText(fileBuffer);
    console.log(`[Analysis] Extracted ${extractedText.length} chars from PDF`);
  }

  // 2. Clean up the filename to use as a hint
  const fileNameHint = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();

  // 3. Determine what we know
  const hasUsefulText = extractedText.length > 100;
  const textSnippet = hasUsefulText
    ? extractedText.slice(0, 4000)
    : "";

  const systemPrompt = `You are an expert piano pedagogue and musicologist with encyclopedic knowledge of the piano repertoire, music theory, and the Hanon 60 Exercises. You create detailed, accurate, and personalized 30-day practice frameworks for pianists. You always reference specific measure numbers, actual technical patterns, and the precise key and tempo of the piece you are analyzing.`;

  const userPrompt = `A student has uploaded a piano score for study.

FILE NAME: "${fileNameHint}"
MIME TYPE: ${mimeType}
${hasUsefulText
    ? `\nEXTRACTED TEXT FROM THE SCORE (first 4000 chars):\n${textSnippet}\n\nUse the extracted text above to identify the composition. Look for the title, composer name, key signature, tempo markings, and any other identifying information.`
    : `\nThe file did not yield machine-readable text (likely a scanned image PDF). Use the file name "${fileNameHint}" to identify the composition from your knowledge of the piano repertoire.`
  }

IMPORTANT: Use your deep knowledge of the piano repertoire to provide a COMPLETE, SPECIFIC analysis. Do NOT say you cannot identify the piece or that you need more information. Make your best identification from the filename and any extracted text, then provide the full expert analysis as if you have the score in front of you. Reference actual measure numbers, specific technical passages, and precise musical details for this composition.

Your task:
1. Identify the composition (title, composer, key, tempo, difficulty, estimated performance duration).
2. Write 2–3 paragraphs of historical and compositional context.
3. Identify the 4–6 most significant technical challenges with specific measure locations, descriptions, and practice tips.
4. Select 8–12 Hanon exercises (from the 60 Exercises) that directly address those technical challenges.
5. Generate a complete 30-day practice framework with 4 weeks (weeks 1–3: 7 days each; week 4: 9 days for days 22–30).
6. Provide a daily session structure (blocks with durations and purposes).
7. Provide 4 essential practice principles specific to this piece.

Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation — matching this exact schema:
${JSON_SCHEMA}`;

  console.log(`[Analysis] Calling LLM for: ${fileNameHint}`);

  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error("AI returned an empty response. Please try again.");
  }

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: { analysis: CompositionAnalysis; framework: CompositionFramework };
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error("[Analysis] JSON parse failed. Raw content (first 500):", cleaned.slice(0, 500));
    throw new Error(`AI response was not valid JSON: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
  }

  if (!parsed.analysis || !parsed.framework) {
    throw new Error("AI response was missing required 'analysis' or 'framework' fields.");
  }

  console.log(`[Analysis] Complete: "${parsed.analysis.title}" by ${parsed.analysis.composer}`);
  return { analysis: parsed.analysis, framework: parsed.framework };
}
