import type OpenAI from 'openai';
import { resolveSermonPlanModel } from '../../shared/aiModels.js';
import { DEFAULT_PLANNING_PROMPT } from '../../shared/defaultPlanningPrompt.js';
import {
  parseSermonPlan,
  sermonPlanJsonSchema,
  type SermonPlan,
} from '../../shared/sermonPlanSchema.js';
import { createOpenAIClient, resolveOpenAIModelId } from './openaiClient.js';

export interface SermonPlanGenerateInput {
  sermonTitle: string;
  sermonDate: string;
  sermonNotes: string;
  primaryScripture?: string;
  sermonSpeaker?: string;
  churchName?: string;
  sermonUrl?: string;
  additionalContext?: string;
  planningPrompt: string;
  model?: string;
  /** Optional regeneration adjustment */
  adjustmentInstruction?: string;
  /** Current plan JSON when regenerating */
  currentPlan?: SermonPlan | null;
}

export interface SermonPlanGenerateResult {
  plan: SermonPlan;
  modelUsed: string;
}

export interface SermonPlanGenerator {
  generate(input: SermonPlanGenerateInput): Promise<SermonPlanGenerateResult>;
}

function buildUserPayload(input: SermonPlanGenerateInput): string {
  const lines = [
    `Sermon title: ${input.sermonTitle || '(untitled)'}`,
    `Sermon date: ${input.sermonDate || '(unspecified)'}`,
  ];
  if (input.sermonSpeaker) lines.push(`Speaker: ${input.sermonSpeaker}`);
  if (input.churchName) lines.push(`Church: ${input.churchName}`);
  if (input.primaryScripture) lines.push(`Primary Scripture: ${input.primaryScripture}`);
  if (input.sermonUrl) lines.push(`Sermon URL: ${input.sermonUrl}`);
  lines.push('', 'Sermon notes (primary source):', input.sermonNotes);
  if (input.additionalContext?.trim()) {
    lines.push('', 'Additional personal context:', input.additionalContext.trim());
  }
  if (input.adjustmentInstruction?.trim() && input.currentPlan) {
    lines.push(
      '',
      'REGENERATION REQUEST',
      `Requested adjustment: ${input.adjustmentInstruction.trim()}`,
      'Current plan JSON (revise; do not ignore the sermon notes):',
      JSON.stringify(input.currentPlan),
    );
  }
  lines.push(
    '',
    'Return exactly one JSON object matching the schema: five weekday days in order monday→friday, plus saturday.',
    'saturday.reflectionQuestions must include at least 3 distinct questions.',
  );
  return lines.join('\n');
}

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && part.text) chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

export class OpenAISermonPlanGenerator implements SermonPlanGenerator {
  constructor(private readonly client: OpenAI) {}

  async generate(input: SermonPlanGenerateInput): Promise<SermonPlanGenerateResult> {
    const model = resolveOpenAIModelId(
      resolveSermonPlanModel(input.model, process.env.OPENAI_MODEL),
    );
    const system = (input.planningPrompt?.trim() || DEFAULT_PLANNING_PROMPT).slice(0, 12_000);

    const response = await this.client.responses.create({
      model,
      temperature: 0.4,
      max_output_tokens: 4500,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: buildUserPayload(input) },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'sermon_week_plan',
          strict: true,
          schema: sermonPlanJsonSchema as unknown as Record<string, unknown>,
        },
      },
    });

    const text = extractOutputText(response);
    if (!text) {
      throw new Error('EMPTY_AI_OUTPUT');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('INVALID_AI_JSON');
    }

    const plan = parseSermonPlan(parsed);
    return { plan, modelUsed: model };
  }
}

export function createSermonPlanGenerator(): SermonPlanGenerator | null {
  const client = createOpenAIClient();
  if (!client) return null;
  return new OpenAISermonPlanGenerator(client);
}
