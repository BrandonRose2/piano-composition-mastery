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
  difficulty: string; // e.g. "Advanced", "Intermediate-Advanced"
  estimatedDuration: string; // e.g. "4–5 minutes"
  overview: string; // 2–3 sentence summary
  historicalContext: string; // 2–3 paragraphs
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
 * Analyze a piano composition from a text description or extracted PDF text.
 * Returns structured analysis and 30-day framework.
 */
export async function analyzeComposition(
  fileName: string,
  extractedText: string
): Promise<{ analysis: CompositionAnalysis; framework: CompositionFramework }> {
  const prompt = `You are an expert piano pedagogue and musicologist with deep knowledge of the piano repertoire, music theory, and the Hanon 60 Exercises.

A student has uploaded a piano score. Here is the file name and any extracted text from it:

FILE NAME: ${fileName}

EXTRACTED TEXT (may be partial or OCR-imperfect):
${extractedText.slice(0, 6000)}

Your task is to:
1. Identify the composition (title, composer, key, tempo marking, difficulty level, estimated performance duration).
2. Provide a 2–3 paragraph historical and compositional context.
3. Identify the 4–6 most significant technical challenges in the piece, with specific locations, descriptions, and practice tips.
4. Select 8–12 Hanon exercises (from the 60 Exercises) that directly address those technical challenges, explaining why each is relevant.
5. Generate a complete 30-day practice framework with 4 weeks (7 days each, except week 4 which has 9 days), daily session goals, weekly milestones, and recommended Hanon exercises per week.
6. Provide a daily session structure (blocks with durations and purposes).
7. Provide 4 essential practice principles specific to this piece.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "analysis": {
    "title": "string",
    "composer": "string",
    "key": "string",
    "tempo": "string",
    "difficulty": "string",
    "estimatedDuration": "string",
    "overview": "string (2-3 sentences)",
    "historicalContext": "string (2-3 paragraphs, use \\n\\n to separate)",
    "technicalChallenges": [
      {
        "title": "string",
        "icon": "single character or short symbol",
        "location": "string (measure numbers or section)",
        "description": "string (2-3 sentences)",
        "tip": "string (1-2 sentences)"
      }
    ],
    "hanonExercises": [
      {
        "number": "string (e.g. '1–5' or '46')",
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
      }
    ],
    "practiceNotes": ["string", "string", "string", "string"]
  }
}

The weeks array must have exactly 4 entries. Week 4 must have 9 days (days 22–30). All other weeks have 7 days.
Be specific to THIS composition — do not give generic advice. Reference actual measure numbers, specific technical patterns, and the key/tempo of this piece.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert piano pedagogue. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content as string | undefined;
  if (!content) throw new Error("No response from AI");

  const parsed = JSON.parse(content);
  return {
    analysis: parsed.analysis,
    framework: parsed.framework,
  };
}
