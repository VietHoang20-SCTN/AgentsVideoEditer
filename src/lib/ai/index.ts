import { env } from "@/lib/env";

/**
 * Thrown when an AI feature is requested but no API key is configured.
 * statusCode 501 signals "Not Implemented / not configured" to API route handlers.
 */
export class OpenAINotConfiguredError extends Error {
  readonly statusCode = 501;

  constructor() {
    super("AI features require OPENAI_API_KEY or AI_API_KEY to be configured");
    this.name = "OpenAINotConfiguredError";
  }
}

/**
 * Returns the effective API key and optional baseURL for the OpenAI-compatible client.
 * Priority: userSettings (from DB) > AI_API_KEY (env/9router) > OPENAI_API_KEY (env/direct OpenAI)
 */
export function getAIClientConfig(userSettings?: {
  aiApiKey?: string | null;
  aiBaseUrl?: string | null;
}): { apiKey: string; baseURL?: string } {
  const apiKey =
    userSettings?.aiApiKey ||
    env.AI_API_KEY ||
    env.OPENAI_API_KEY;
  const baseURL = userSettings?.aiBaseUrl || env.AI_BASE_URL;

  // Allow local/self-hosted providers (e.g. LM Studio, Ollama) that don't require a real key.
  // If a baseURL is set but no key, use a placeholder so the OpenAI client won't reject it.
  if (!apiKey && baseURL) {
    return { apiKey: "local", baseURL };
  }

  if (!apiKey) throw new OpenAINotConfiguredError();
  return { apiKey, ...(baseURL ? { baseURL } : {}) };
}
