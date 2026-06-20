import { invokeLLM } from "./_core/llm";

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

const JSON_SCHEMA_PROMPT = `
Respond ONLY with a valid JSON object matching this exact schema (no markdown, no code fences, just raw JSON):
{
  "analysis": {
    "title": "string",
    "composer": "string",
    "key": "string",
    "tempo": "string",
    "difficulty": "string",
    "estimatedDuration": "string",
    "overview": "string (2-3 sentences)",
    "historicalContext": "string (2-3 paragraphs separated by \\n\\n)",
    "technicalChallenges": [
      {
        "title": "string",
        "icon": "single character or short symbol",
        "location": "string (measure numbers or section name)",
        "description": "string (2-3 sentences)",
        "tip": "string (1-2 sentences)"
      }
    ],
    "hanonExercises": [
      {
        "number": "string (e.g. '1-5' or '46')",
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
        "week": 1,
        "title": "string",
        "goal": "string",
        "milestone": "string",
        "hanon": "string",
        "days": [
          { "day": 1, "focus": "string", "goal": "string" },
          { "day": 2, "focus": "string", "goal": "string" },
          { "day": 3, "focus": "string", "goal": "string" },
          { "day": 4, "focus": "string", "goal": "string" },
          { "day": 5, "focus": "string", "goal": "string" },
          { "day": 6, "focus": "string", "goal": "string" },
          { "day": 7, "focus": "string", "goal": "string" }
        ]
      },
      {
        "week": 2,
        "title": "string",
        "goal": "string",
        "milestone": "string",
        "hanon": "string",
        "days": [
          { "day": 8, "focus": "string", "goal": "string" },
          { "day": 9, "focus": "string", "goal": "string" },
          { "day": 10, "focus": "string", "goal": "string" },
          { "day": 11, "focus": "string", "goal": "string" },
          { "day": 12, "focus": "string", "goal": "string" },
          { "day": 13, "focus": "string", "goal": "string" },
          { "day": 14, "focus": "string", "goal": "string" }
        ]
      },
      {
        "week": 3,
        "title": "string",
        "goal": "string",
        "milestone": "string",
        "hanon": "string",
        "days": [
          { "day": 15, "focus": "string", "goal": "string" },
          { "day": 16, "focus": "string", "goal": "string" },
          { "day": 17, "focus": "string", "goal": "string" },
          { "day": 18, "focus": "string", "goal": "string" },
          { "day": 19, "focus": "string", "goal": "string" },
          { "day": 20, "focus": "string", "goal": "string" },
          { "day": 21, "focus": "string", "goal": "string" }
        ]
      },
      {
        "week": 4,
        "title": "string",
        "goal": "string",
        "milestone": "string",
        "hanon": "string",
        "days": [
          { "day": 22, "focus": "string", "goal": "string" },
          { "day": 23, "focus": "string", "goal": "string" },
          { "day": 24, "focus": "string", "goal": "string" },
          { "day": 25, "focus": "string", "goal": "string" },
          { "day": 26, "focus": "string", "goal": "string" },
          { "day": 27, "focus": "string", "goal": "string" },
          { "day": 28, "focus": "string", "goal": "string" },
          { "day": 29, "focus": "string", "goal": "string" },
          { "day": 30, "focus": "string", "goal": "string" }
        ]
      }
    ],
    "practiceNotes": ["string", "string", "string", "string"]
  }
}`;

/**
 * Analyze a piano composition using its filename and optionally a public file URL.
 * Falls back to filename-only analysis if no URL is provided.
 */
export async function analyzeComposition(
  fileName: string,
  extractedText: string,
  fileUrl?: string,
  mimeType?: string
): Promise<{ analysis: CompositionAnalysis; framework: CompositionFramework }> {

  const systemPrompt = `You are an expert piano pedagogue and musicologist with deep knowledge of the piano repertoire, music theory, and the Hanon 60 Exercises. You specialize in creating detailed, personalized practice frameworks for pianists of all levels. Always be specific to the actual composition — reference real measure numbers, actual technical patterns, and the specific key and tempo of the piece.`;

  // Build user message content — include the file if we have a public URL
  const userTextContent = `A student has uploaded a piano score for study. 

FILE NAME: ${fileName}
MIME TYPE: ${mimeType ?? "unknown"}
${extractedText ? `\nEXTRACTED TEXT / NOTES:\n${extractedText.slice(0, 3000)}` : ""}

Your task:
1. Identify the composition (title, composer, key, tempo, difficulty, estimated duration).
2. Provide 2–3 paragraphs of historical and compositional context.
3. Identify the 4–6 most significant technical challenges with specific locations, descriptions, and practice tips.
4. Select 8–12 Hanon exercises that directly address those technical challenges.
5. Generate a complete 30-day practice framework (4 weeks: weeks 1–3 have 7 days each, week 4 has 9 days for days 22–30).
6. Provide a daily session structure (blocks with durations and purposes).
7. Provide 4 essential practice principles specific to this piece.

Be specific to THIS composition — reference actual measure numbers, specific technical patterns, and the key/tempo of this piece.

${JSON_SCHEMA_PROMPT}`;

  // Try with file URL first (for PDFs and images the model can read)
  const canSendFile = !!fileUrl && (
    mimeType === "application/pdf" ||
    (mimeType?.startsWith("image/") ?? false)
  );

  let content: string | undefined;

  if (canSendFile) {
    try {
      console.log(`[Analysis] Attempting vision/file analysis for: ${fileName}`);
      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url" as const,
                image_url: {
                  url: fileUrl,
                  detail: "high" as const,
                },
              },
              { type: "text" as const, text: userTextContent },
            ],
          },
        ],
        max_tokens: 8000,
      });
      content = response.choices[0]?.message?.content as string | undefined;
      console.log(`[Analysis] Vision analysis succeeded for: ${fileName}`);
    } catch (err) {
      console.warn(`[Analysis] Vision analysis failed, falling back to text-only: ${err instanceof Error ? err.message : err}`);
      content = undefined;
    }
  }

  // Fallback: text-only analysis (always works)
  if (!content) {
    console.log(`[Analysis] Running text-only analysis for: ${fileName}`);
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userTextContent },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    });
    content = response.choices[0]?.message?.content as string | undefined;
  }

  if (!content) {
    throw new Error("AI returned an empty response. Please try again.");
  }

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: { analysis: CompositionAnalysis; framework: CompositionFramework };
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error("[Analysis] JSON parse failed. Raw content:", cleaned.slice(0, 500));
    throw new Error(`AI response was not valid JSON: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
  }

  if (!parsed.analysis || !parsed.framework) {
    throw new Error("AI response was missing required 'analysis' or 'framework' fields.");
  }

  console.log(`[Analysis] Complete for: ${parsed.analysis.title} by ${parsed.analysis.composer}`);
  return { analysis: parsed.analysis, framework: parsed.framework };
}
