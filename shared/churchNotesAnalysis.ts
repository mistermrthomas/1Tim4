/**
 * Shared Church Notes AI analysis schema + validators.
 * Used by the Vercel API route and the client review UI.
 */

export const CHURCH_NOTES_PROMPT_VERSION = 'church-notes-v1';

export const MAX_RAW_NOTES_CHARS = 20_000;
export const MAX_FIELD_CHARS = 500;
export const MAX_BODY_CHARS = 48_000;
export const MAX_PERSONAL_CONTEXT_ITEMS = 8;
export const MAX_PERSONAL_CONTEXT_ITEM_CHARS = 280;

export type ScriptureConfidence = 'explicit' | 'inferred' | 'uncertain';
export type BaitCertainty = 'possible' | 'likely';

export interface ScripturePassageAnalysis {
  reference: string;
  contextFromNotes: string;
  confidence: ScriptureConfidence;
}

export interface TeachingPointAnalysis {
  title: string;
  explanation: string;
  supportingNotes: string[];
}

export interface IllustrationAnalysis {
  name: string;
  meaning: string;
}

export interface PossibleBaitAnalysis {
  bait: string;
  whyItMayBeRelevant: string;
  evidenceFromNotes: string;
  certainty: BaitCertainty;
}

export interface MemoryVerseAnalysis {
  reference: string;
  reason: string;
}

export interface AnnouncementAnalysis {
  title: string;
  date: string | null;
  details: string;
}

export interface SevenDayPlanDay {
  dayNumber: number;
  theme: string;
  beforeReadingPrompt: string;
  reflectionQuestion: string;
  prayerPrompt: string;
}

export interface StructuredChurchAnalysis {
  sermonSummary: string;
  centralMessage: string;
  scripturePassages: ScripturePassageAnalysis[];
  teachingPoints: TeachingPointAnalysis[];
  illustrations: IllustrationAnalysis[];
  personalQuestions: string[];
  possibleBait: PossibleBaitAnalysis[];
  weeklyTheme: string;
  memoryVerse: MemoryVerseAnalysis;
  practicalResponse: string[];
  prayerFocus: string[];
  announcements: AnnouncementAnalysis[];
  clarificationsNeeded: string[];
  sevenDayPlan: SevenDayPlanDay[];
}

export interface CurrentReadingPlanContext {
  book: string;
  cadence: string;
  currentChapter: number;
}

export interface AnalyzeChurchNotesRequest {
  sermonDate: string;
  sermonTitle?: string | null;
  speaker?: string | null;
  church?: string | null;
  series?: string | null;
  primaryScripture?: string | null;
  rawNotes: string;
  sourceLinks?: string | null;
  announcementsNotes?: string | null;
  currentReadingPlan?: CurrentReadingPlanContext | null;
  relevantPersonalContext?: string[];
  /** Client idempotency key to block duplicate in-flight submits */
  requestId?: string;
}

export interface AnalyzeChurchNotesSuccess {
  analysis: StructuredChurchAnalysis;
  model: string;
  promptVersion: string;
  source: 'ai';
}

export interface AnalyzeChurchNotesErrorBody {
  error: string;
  code?:
    | 'unauthorized'
    | 'rate_limited'
    | 'validation'
    | 'invalid_ai_output'
    | 'provider_error'
    | 'timeout'
    | 'not_configured'
    | 'duplicate'
    | 'payload_too_large';
}

const CONFIDENCE: ScriptureConfidence[] = ['explicit', 'inferred', 'uncertain'];
const CERTAINTY: BaitCertainty[] = ['possible', 'likely'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

function asString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  return truncate(value, max);
}

function asStringArray(value: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.slice(0, maxItems).map((item) => truncate(String(item ?? ''), maxLen));
}

/** JSON Schema for OpenAI Structured Outputs (strict). */
export const CHURCH_NOTES_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'sermonSummary',
    'centralMessage',
    'scripturePassages',
    'teachingPoints',
    'illustrations',
    'personalQuestions',
    'possibleBait',
    'weeklyTheme',
    'memoryVerse',
    'practicalResponse',
    'prayerFocus',
    'announcements',
    'clarificationsNeeded',
    'sevenDayPlan',
  ],
  properties: {
    sermonSummary: { type: 'string' },
    centralMessage: { type: 'string' },
    scripturePassages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['reference', 'contextFromNotes', 'confidence'],
        properties: {
          reference: { type: 'string' },
          contextFromNotes: { type: 'string' },
          confidence: { type: 'string', enum: CONFIDENCE },
        },
      },
    },
    teachingPoints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'explanation', 'supportingNotes'],
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' },
          supportingNotes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    illustrations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'meaning'],
        properties: {
          name: { type: 'string' },
          meaning: { type: 'string' },
        },
      },
    },
    personalQuestions: { type: 'array', items: { type: 'string' } },
    possibleBait: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['bait', 'whyItMayBeRelevant', 'evidenceFromNotes', 'certainty'],
        properties: {
          bait: { type: 'string' },
          whyItMayBeRelevant: { type: 'string' },
          evidenceFromNotes: { type: 'string' },
          certainty: { type: 'string', enum: CERTAINTY },
        },
      },
    },
    weeklyTheme: { type: 'string' },
    memoryVerse: {
      type: 'object',
      additionalProperties: false,
      required: ['reference', 'reason'],
      properties: {
        reference: { type: 'string' },
        reason: { type: 'string' },
      },
    },
    practicalResponse: { type: 'array', items: { type: 'string' } },
    prayerFocus: { type: 'array', items: { type: 'string' } },
    announcements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'date', 'details'],
        properties: {
          title: { type: 'string' },
          date: { type: ['string', 'null'] },
          details: { type: 'string' },
        },
      },
    },
    clarificationsNeeded: { type: 'array', items: { type: 'string' } },
    sevenDayPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'dayNumber',
          'theme',
          'beforeReadingPrompt',
          'reflectionQuestion',
          'prayerPrompt',
        ],
        properties: {
          dayNumber: { type: 'integer' },
          theme: { type: 'string' },
          beforeReadingPrompt: { type: 'string' },
          reflectionQuestion: { type: 'string' },
          prayerPrompt: { type: 'string' },
        },
      },
    },
  },
} as const;

export const CHURCH_NOTES_SYSTEM_PROMPT = `You are helping a Christian organize personal notes taken during a church sermon. Your job is to clarify and structure the user's notes without inventing missing teaching, attributing statements to the pastor that the user did not record, or presenting speculation as fact.

Preserve the sermon's primary message and the user's own questions. Separate explicit content from reasonable inference. Mark uncertain Scripture references, dates, names, and interpretations for review.

Use a thoughtful, direct, pastoral tone, but do not claim divine authority, speak on behalf of God, or tell the user that God has specifically revealed something to them.

When identifying possible temptation, spiritual vulnerabilities, or "bait," frame them as possibilities for honest examination rather than accusations. Base them on the notes and any personal context explicitly supplied in the request.

Favor one meaningful weekly focus over many unrelated action items. Avoid generic Christian clichés. The goal is formation and obedience, not merely producing an impressive summary.

Do not write a replacement sermon or a long devotional. Create concise, structured content that helps the user return to Scripture, prayer, church community, and practical obedience.

If the user has an existing Bible-reading plan, preserve it: layer sermon reflection around it rather than replacing the reading schedule.

Mark incomplete fragments (for example unfinished phrases like "September at the") in clarificationsNeeded — do not invent what they mean.

Return JSON matching the required schema. sevenDayPlan must contain exactly 7 days (dayNumber 1–7). Day 5 or 6 should include a weekly review prompt.`;

export function validateAnalyzeRequest(
  body: unknown,
): { ok: true; value: AnalyzeChurchNotesRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body required' };
  }
  const raw = body as Record<string, unknown>;
  if (!isIsoDate(raw.sermonDate)) {
    return { ok: false, error: 'sermonDate must be YYYY-MM-DD' };
  }
  if (typeof raw.rawNotes !== 'string' || !raw.rawNotes.trim()) {
    return { ok: false, error: 'rawNotes is required' };
  }
  if (raw.rawNotes.length > MAX_RAW_NOTES_CHARS) {
    return { ok: false, error: `rawNotes exceeds ${MAX_RAW_NOTES_CHARS} characters` };
  }

  let currentReadingPlan: CurrentReadingPlanContext | null = null;
  if (raw.currentReadingPlan && typeof raw.currentReadingPlan === 'object') {
    const plan = raw.currentReadingPlan as Record<string, unknown>;
    if (typeof plan.book === 'string' && typeof plan.cadence === 'string') {
      currentReadingPlan = {
        book: truncate(plan.book, 80),
        cadence: truncate(plan.cadence, 120),
        currentChapter: Number(plan.currentChapter) || 1,
      };
    }
  }

  const relevantPersonalContext = Array.isArray(raw.relevantPersonalContext)
    ? raw.relevantPersonalContext
        .slice(0, MAX_PERSONAL_CONTEXT_ITEMS)
        .map((item) => truncate(String(item ?? ''), MAX_PERSONAL_CONTEXT_ITEM_CHARS))
        .filter(Boolean)
    : undefined;

  return {
    ok: true,
    value: {
      sermonDate: raw.sermonDate,
      sermonTitle: raw.sermonTitle == null ? null : truncate(String(raw.sermonTitle), MAX_FIELD_CHARS),
      speaker: raw.speaker == null ? null : truncate(String(raw.speaker), MAX_FIELD_CHARS),
      church: raw.church == null ? null : truncate(String(raw.church), MAX_FIELD_CHARS),
      series: raw.series == null ? null : truncate(String(raw.series), MAX_FIELD_CHARS),
      primaryScripture:
        raw.primaryScripture == null
          ? null
          : truncate(String(raw.primaryScripture), MAX_FIELD_CHARS),
      rawNotes: raw.rawNotes.trim(),
      sourceLinks:
        raw.sourceLinks == null ? null : truncate(String(raw.sourceLinks), MAX_FIELD_CHARS * 2),
      announcementsNotes:
        raw.announcementsNotes == null
          ? null
          : truncate(String(raw.announcementsNotes), MAX_RAW_NOTES_CHARS / 4),
      currentReadingPlan,
      relevantPersonalContext,
      requestId:
        typeof raw.requestId === 'string' ? truncate(raw.requestId, 80) : undefined,
    },
  };
}

export function validateStructuredAnalysis(
  value: unknown,
): { ok: true; value: StructuredChurchAnalysis } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Analysis must be an object' };
  }
  const raw = value as Record<string, unknown>;

  const sermonSummary = asString(raw.sermonSummary, 2000);
  const centralMessage = asString(raw.centralMessage, 1200);
  const weeklyTheme = asString(raw.weeklyTheme, 400);
  if (!sermonSummary || !centralMessage || !weeklyTheme) {
    return { ok: false, error: 'Missing sermonSummary, centralMessage, or weeklyTheme' };
  }

  if (!Array.isArray(raw.scripturePassages)) {
    return { ok: false, error: 'scripturePassages must be an array' };
  }
  const scripturePassages: ScripturePassageAnalysis[] = [];
  for (const item of raw.scripturePassages.slice(0, 12)) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid scripturePassages item' };
    }
    const row = item as Record<string, unknown>;
    const reference = asString(row.reference, 120);
    const contextFromNotes = asString(row.contextFromNotes, 600);
    const confidence = row.confidence;
    if (!reference || contextFromNotes == null || !CONFIDENCE.includes(confidence as ScriptureConfidence)) {
      return { ok: false, error: 'Invalid scripture passage (reference/confidence)' };
    }
    scripturePassages.push({
      reference,
      contextFromNotes,
      confidence: confidence as ScriptureConfidence,
    });
  }

  if (!Array.isArray(raw.teachingPoints)) {
    return { ok: false, error: 'teachingPoints must be an array' };
  }
  const teachingPoints: TeachingPointAnalysis[] = [];
  for (const item of raw.teachingPoints.slice(0, 12)) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid teachingPoints item' };
    }
    const row = item as Record<string, unknown>;
    const title = asString(row.title, 200);
    const explanation = asString(row.explanation, 1200);
    const supportingNotes = asStringArray(row.supportingNotes, 8, 400);
    if (!title || explanation == null || !supportingNotes) {
      return { ok: false, error: 'Invalid teaching point' };
    }
    teachingPoints.push({ title, explanation, supportingNotes });
  }

  if (!Array.isArray(raw.illustrations)) {
    return { ok: false, error: 'illustrations must be an array' };
  }
  const illustrations: IllustrationAnalysis[] = [];
  for (const item of raw.illustrations.slice(0, 10)) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid illustrations item' };
    }
    const row = item as Record<string, unknown>;
    const name = asString(row.name, 200);
    const meaning = asString(row.meaning, 800);
    if (!name || meaning == null) return { ok: false, error: 'Invalid illustration' };
    illustrations.push({ name, meaning });
  }

  const personalQuestions = asStringArray(raw.personalQuestions, 12, 400);
  if (!personalQuestions) return { ok: false, error: 'personalQuestions must be an array' };

  if (!Array.isArray(raw.possibleBait)) {
    return { ok: false, error: 'possibleBait must be an array' };
  }
  const possibleBait: PossibleBaitAnalysis[] = [];
  for (const item of raw.possibleBait.slice(0, 8)) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid possibleBait item' };
    }
    const row = item as Record<string, unknown>;
    const bait = asString(row.bait, 300);
    const whyItMayBeRelevant = asString(row.whyItMayBeRelevant, 600);
    const evidenceFromNotes = asString(row.evidenceFromNotes, 600);
    const certainty = row.certainty;
    if (
      !bait ||
      whyItMayBeRelevant == null ||
      evidenceFromNotes == null ||
      !CERTAINTY.includes(certainty as BaitCertainty)
    ) {
      return { ok: false, error: 'Invalid possibleBait item' };
    }
    possibleBait.push({ bait, whyItMayBeRelevant, evidenceFromNotes, certainty: certainty as BaitCertainty });
  }

  if (!raw.memoryVerse || typeof raw.memoryVerse !== 'object') {
    return { ok: false, error: 'memoryVerse required' };
  }
  const mv = raw.memoryVerse as Record<string, unknown>;
  const memoryVerse: MemoryVerseAnalysis = {
    reference: asString(mv.reference, 120) ?? '',
    reason: asString(mv.reason, 600) ?? '',
  };
  if (!memoryVerse.reference) return { ok: false, error: 'memoryVerse.reference required' };

  const practicalResponse = asStringArray(raw.practicalResponse, 8, 400);
  const prayerFocus = asStringArray(raw.prayerFocus, 8, 400);
  if (!practicalResponse || !prayerFocus) {
    return { ok: false, error: 'practicalResponse and prayerFocus must be arrays' };
  }

  if (!Array.isArray(raw.announcements)) {
    return { ok: false, error: 'announcements must be an array' };
  }
  const announcements: AnnouncementAnalysis[] = [];
  for (const item of raw.announcements.slice(0, 12)) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid announcements item' };
    }
    const row = item as Record<string, unknown>;
    const title = asString(row.title, 200);
    const details = asString(row.details, 600);
    if (!title || details == null) return { ok: false, error: 'Invalid announcement' };
    const date =
      row.date === null || row.date === undefined
        ? null
        : truncate(String(row.date), 80);
    announcements.push({ title, date, details });
  }

  const clarificationsNeeded = asStringArray(raw.clarificationsNeeded, 12, 400);
  if (!clarificationsNeeded) {
    return { ok: false, error: 'clarificationsNeeded must be an array' };
  }

  if (!Array.isArray(raw.sevenDayPlan) || raw.sevenDayPlan.length !== 7) {
    return { ok: false, error: 'sevenDayPlan must contain exactly 7 days' };
  }
  const sevenDayPlan: SevenDayPlanDay[] = [];
  for (const item of raw.sevenDayPlan) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid sevenDayPlan item' };
    }
    const row = item as Record<string, unknown>;
    const dayNumber = Number(row.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
      return { ok: false, error: 'sevenDayPlan dayNumber must be 1–7' };
    }
    const theme = asString(row.theme, 300);
    const beforeReadingPrompt = asString(row.beforeReadingPrompt, 400);
    const reflectionQuestion = asString(row.reflectionQuestion, 400);
    const prayerPrompt = asString(row.prayerPrompt, 400);
    if (!theme || !beforeReadingPrompt || !reflectionQuestion || !prayerPrompt) {
      return { ok: false, error: 'Incomplete sevenDayPlan day' };
    }
    sevenDayPlan.push({
      dayNumber,
      theme,
      beforeReadingPrompt,
      reflectionQuestion,
      prayerPrompt,
    });
  }
  const dayNums = sevenDayPlan.map((d) => d.dayNumber).sort((a, b) => a - b);
  if (dayNums.join(',') !== '1,2,3,4,5,6,7') {
    return { ok: false, error: 'sevenDayPlan must include dayNumber 1 through 7 once each' };
  }

  return {
    ok: true,
    value: {
      sermonSummary,
      centralMessage,
      scripturePassages,
      teachingPoints,
      illustrations,
      personalQuestions,
      possibleBait,
      weeklyTheme,
      memoryVerse,
      practicalResponse,
      prayerFocus,
      announcements,
      clarificationsNeeded,
      sevenDayPlan: sevenDayPlan.sort((a, b) => a.dayNumber - b.dayNumber),
    },
  };
}

export function buildUserPrompt(request: AnalyzeChurchNotesRequest): string {
  const lines: string[] = [
    `Sermon date: ${request.sermonDate}`,
    `Title: ${request.sermonTitle || '(not provided)'}`,
    `Speaker: ${request.speaker || '(not provided)'}`,
    `Church/campus: ${request.church || '(not provided)'}`,
    `Series: ${request.series || '(not provided)'}`,
    `Primary Scripture field: ${request.primaryScripture || '(not provided)'}`,
  ];

  if (request.sourceLinks) {
    lines.push(`Links: ${request.sourceLinks}`);
  }
  if (request.announcementsNotes) {
    lines.push(`Announcements / upcoming dates (user field):\n${request.announcementsNotes}`);
  }
  if (request.currentReadingPlan) {
    lines.push(
      `Existing reading plan (preserve — do not replace): ${request.currentReadingPlan.book}, ${request.currentReadingPlan.cadence}, currently chapter ${request.currentReadingPlan.currentChapter}`,
    );
  }
  if (request.relevantPersonalContext?.length) {
    lines.push(
      `Relevant personal context (only what was supplied):\n- ${request.relevantPersonalContext.join('\n- ')}`,
    );
  }
  lines.push(`Raw sermon notes:\n${request.rawNotes}`);
  return lines.join('\n');
}

/** Empty editable analysis shell for UI before AI returns. */
export function emptyStructuredAnalysis(): StructuredChurchAnalysis {
  return {
    sermonSummary: '',
    centralMessage: '',
    scripturePassages: [],
    teachingPoints: [],
    illustrations: [],
    personalQuestions: [],
    possibleBait: [],
    weeklyTheme: '',
    memoryVerse: { reference: '', reason: '' },
    practicalResponse: [],
    prayerFocus: [],
    announcements: [],
    clarificationsNeeded: [],
    sevenDayPlan: Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      theme: '',
      beforeReadingPrompt: '',
      reflectionQuestion: '',
      prayerPrompt: '',
    })),
  };
}
