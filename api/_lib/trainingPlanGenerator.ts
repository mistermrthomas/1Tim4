import type OpenAI from 'openai';
import { resolveTrainingPlanModel } from '../../shared/aiModels.js';
import { DEFAULT_TRAINING_PROMPT } from '../../shared/defaultTrainingPrompt.js';
import {
  parseTrainingPlan,
  trainingPlanJsonSchema,
  type TrainingPlan,
} from '../../shared/trainingPlanSchema.js';
import { createOpenAIClient, resolveOpenAIModelId } from './openaiClient.js';

export interface TrainingPlanGenerateInput {
  weekStartDate: string;
  intake: unknown;
  planningPrompt: string;
  model?: string;
  catalogContext: unknown;
  adjustmentInstruction?: string;
  currentPlan?: TrainingPlan | null;
}

export interface TrainingPlanGenerateResult {
  plan: TrainingPlan;
  modelUsed: string;
}

function buildUserPayload(input: TrainingPlanGenerateInput): string {
  const lines = [
    `Week starting (Sunday): ${input.weekStartDate}`,
    '',
    'Sunday coaching questionnaire (JSON):',
    JSON.stringify(input.intake, null, 2),
    '',
    'Catalog, equipment, templates, and prior-week summary (JSON):',
    JSON.stringify(input.catalogContext, null, 2),
  ];
  if (input.adjustmentInstruction?.trim() && input.currentPlan) {
    lines.push(
      '',
      'REGENERATION REQUEST',
      `Requested adjustment: ${input.adjustmentInstruction.trim()}`,
      'Current training plan JSON (revise; keep catalog grounding):',
      JSON.stringify(input.currentPlan),
    );
  }
  lines.push(
    '',
    'Return exactly one JSON object matching the schema.',
    'Use only exerciseCatalogId values from the supplied catalog unless listing suggestedCatalogAdditions.',
    'A day may include multiple workouts (primary + finisher/mobility/etc.).',
    'Respect minutesPerWorkout and mustRestDays / preferredDays from the questionnaire.',
    'Respect caution metadata — avoid progressing or emphasizing irritating shoulder-isolation work.',
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

export class OpenAITrainingPlanGenerator {
  constructor(private readonly client: OpenAI) {}

  async generate(input: TrainingPlanGenerateInput): Promise<TrainingPlanGenerateResult> {
    const model = resolveOpenAIModelId(
      resolveTrainingPlanModel(input.model, process.env.OPENAI_MODEL),
    );
    const system = (input.planningPrompt?.trim() || DEFAULT_TRAINING_PROMPT).slice(0, 12_000);

    const response = await this.client.responses.create({
      model,
      temperature: 0.4,
      max_output_tokens: 6000,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: buildUserPayload(input) },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'weekly_training_plan',
          strict: true,
          schema: trainingPlanJsonSchema as unknown as Record<string, unknown>,
        },
      },
    });

    const text = extractOutputText(response);
    if (!text) throw new Error('EMPTY_AI_OUTPUT');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('INVALID_AI_JSON');
    }

    const plan = parseTrainingPlan(parsed);
    return { plan, modelUsed: model };
  }
}

export function createTrainingPlanGenerator(): OpenAITrainingPlanGenerator | null {
  const client = createOpenAIClient();
  if (!client) return null;
  return new OpenAITrainingPlanGenerator(client);
}
