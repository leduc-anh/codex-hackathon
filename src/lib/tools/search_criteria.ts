import { canCallOpenAi, openAiPostJson, readEnv } from "../openai/config.ts";
import {
  zSearchCriteriaInput,
  zSearchCriteriaResult,
  type Criterion,
  type SearchCriteriaInput,
  type SearchCriteriaResult,
  type Source,
} from "../contracts.ts";

export type SearchProvider = (
  query: string,
  options: { maxResults: number },
) => Promise<Source[]>;

export type SearchCriteriaOptions = {
  provider?: SearchProvider;
  maxResults?: number;
};

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_RESPONSES_PROXY_URL = "/api/openai/v1/responses";

export async function searchCriteria(
  input: SearchCriteriaInput,
  options: SearchCriteriaOptions = {},
): Promise<SearchCriteriaResult> {
  try {
    const safeInput = zSearchCriteriaInput.parse(input);
    const provider = options.provider ?? openAiWebSearchProvider;
    const sources = await provider(buildCriteriaQuery(safeInput), {
      maxResults: options.maxResults ?? DEFAULT_MAX_RESULTS,
    });
    const criteria = extractCriteria(sources);

    return zSearchCriteriaResult.parse({
      found: criteria.length > 0 && sources.length > 0,
      criteria,
      sources,
    });
  } catch {
    return { found: false, criteria: [], sources: [] };
  }
}

export async function openAiWebSearchProvider(
  query: string,
  options: { maxResults: number },
): Promise<Source[]> {
  if (!canCallOpenAi()) {
    return [];
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await openAiPostJson(
    RESPONSES_PATH,
    {
      model: readEnv("OPENAI_WEB_SEARCH_MODEL") ?? "gpt-4.1-mini",
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "required",
      max_output_tokens: 900,
      input: [
        "Find official admission or scholarship eligibility criteria for the applicant target.",
        "Use web search only. Prefer university, scholarship, or government pages.",
        "Return concise factual requirements and cite every factual claim with source URLs.",
        `Target query: ${query}`,
      ].join("\n"),
    },
    { baseUrl: readEnv("OPENAI_RESPONSES_API_BASE") },
  );

  if (!response.ok) {
    return [];
  }

  const payload: unknown = await response.json();
  return parseOpenAiWebSearchSources(payload, options.maxResults);
}

function buildCriteriaQuery(input: SearchCriteriaInput): string {
  return [
    input.school,
    input.program,
    input.scholarship,
    input.level,
    input.country,
    "admission scholarship eligibility requirements criteria",
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
}

function extractCriteria(sources: Source[]): Criterion[] {
  const criteria: Criterion[] = [];

  for (const source of sources) {
    const text = normalizeSnippet(source.snippet);

    if (!looksLikeCriteria(text) && !looksLikeCriteria(source.title)) {
      continue;
    }

    criteria.push({
      name: inferCriterionName(`${source.title} ${text}`),
      requirement: text,
      sourceUrl: source.url,
    });
  }

  return criteria;
}

export function parseOpenAiWebSearchSources(
  payload: unknown,
  maxResults = DEFAULT_MAX_RESULTS,
): Source[] {
  const outputText = collectOutputText(payload);
  const citations = collectUrlCitations(payload);

  if (citations.length === 0) {
    return extractUrlSources(outputText, maxResults);
  }

  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const citation of citations) {
    if (seen.has(citation.url)) {
      continue;
    }

    seen.add(citation.url);
    sources.push({
      url: citation.url,
      title: normalizeSnippet(
        citation.title ?? inferTitleFromUrl(citation.url),
      ),
      snippet: normalizeSnippet(citation.snippet ?? outputText),
    });

    if (sources.length >= maxResults) {
      break;
    }
  }

  return sources;
}

function collectOutputText(payload: unknown): string {
  const textParts: string[] = [];

  walkJson(payload, (value) => {
    if (!isRecord(value)) {
      return;
    }

    if (typeof value.output_text === "string") {
      textParts.push(value.output_text);
    }

    if (
      (value.type === "output_text" || value.type === "message") &&
      typeof value.text === "string"
    ) {
      textParts.push(value.text);
    }
  });

  return normalizeSnippet(textParts.join(" "));
}

function collectUrlCitations(payload: unknown): Array<{
  url: string;
  title?: string;
  snippet?: string;
}> {
  const citations: Array<{ url: string; title?: string; snippet?: string }> =
    [];

  walkJson(payload, (value) => {
    if (
      !isRecord(value) ||
      typeof value.url !== "string" ||
      !isHttpUrl(value.url)
    ) {
      return;
    }

    citations.push({
      url: value.url,
      title: typeof value.title === "string" ? value.title : undefined,
      snippet:
        typeof value.snippet === "string"
          ? value.snippet
          : typeof value.text === "string"
            ? value.text
            : undefined,
    });
  });

  return citations;
}

function extractUrlSources(text: string, maxResults: number): Source[] {
  const matches = text.match(/https?:\/\/[^\s)\]]+/g) ?? [];
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const rawUrl of matches) {
    const url = rawUrl.replace(/[.,;:]+$/, "");

    if (!isHttpUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    sources.push({
      url,
      title: inferTitleFromUrl(url),
      snippet: text,
    });

    if (sources.length >= maxResults) {
      break;
    }
  }

  return sources;
}

function walkJson(value: unknown, visit: (value: unknown) => void): void {
  visit(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, visit);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const child of Object.values(value)) {
    walkJson(child, visit);
  }
}

function inferTitleFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const lastPath = pathname.split("/").filter(Boolean).at(-1);
    return lastPath
      ? `${hostname} / ${lastPath.replace(/[-_]/g, " ")}`
      : hostname;
  } catch {
    return "OpenAI web search source";
  }
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeSnippet(snippet: string): string {
  return snippet.replace(/\s+/g, " ").trim().slice(0, 360);
}

function looksLikeCriteria(text: string): boolean {
  return /\b(requirements?|criteria|eligibility|admission|scholarship|deadline|gpa|ielts|toefl|sat|act|english|portfolio|essay|minimum)\b/i.test(
    text,
  );
}

function inferCriterionName(text: string): string {
  if (/\bielts|toefl|english\b/i.test(text)) {
    return "English proficiency";
  }

  if (/\bgpa|grade\b/i.test(text)) {
    return "Academic performance";
  }

  if (/\bscholarship|funding|financial aid\b/i.test(text)) {
    return "Scholarship eligibility";
  }

  if (/\bdeadline\b/i.test(text)) {
    return "Deadline";
  }

  return "Admission criteria";
}

function readEnv(name: string): string | undefined {
  const importMetaEnv = (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env;
  const globalProcess = (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return importMetaEnv?.[name] ?? globalProcess?.env?.[name];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isRelativeUrl(url: string): boolean {
  return url.startsWith("/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
