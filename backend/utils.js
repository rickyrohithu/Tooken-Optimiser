import dotenv from 'dotenv';
import { get_encoding } from 'tiktoken';
import { encode as toonEncode, decode as toonDecode } from '@toon-format/toon';
import { GoogleGenAI } from '@google/genai';
import { Client as LangSmithClient } from 'langsmith';
import { traceable } from 'langsmith/traceable';

// Load environment variables
dotenv.config();

export const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';
const defaultGeminiKey = process.env.GEMINI_API_KEY || null;

// Initialize cached default Gemini client if key is configured in env
let defaultGenaiClient = null;
if (defaultGeminiKey) {
  try {
    defaultGenaiClient = new GoogleGenAI({ apiKey: defaultGeminiKey });
    console.log(`[Google GenAI] Initialized with model '${GEMINI_MODEL_NAME}'`);
  } catch (err) {
    console.error(`[Google GenAI] Initialization error:`, err);
  }
}

// Token counting using tiktoken (cl100k_base closely mirrors modern LLM tokenizers)
let tiktokenEncoding = null;
try {
  tiktokenEncoding = get_encoding('cl100k_base');
} catch (err) {
  console.error('[tiktoken] Failed to initialize encoding:', err);
}

/**
 * Count tokens in a given string
 * @param {string} text
 * @returns {number}
 */
export function countTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  if (tiktokenEncoding) {
    try {
      return tiktokenEncoding.encode(text).length;
    } catch (err) {
      console.error('[countTokens] tiktoken encode error:', err);
    }
  }
  // Fallback: estimate 4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Check which API keys are configured (header overrides take precedence)
 * @param {string|null} geminiKey
 * @param {string|null} langsmithKey
 * @returns {{ langsmith_connected: boolean, gemini_configured: boolean }}
 */
export function checkApiKeys(geminiKey = null, langsmithKey = null) {
  const geminiFinal = geminiKey || process.env.GEMINI_API_KEY;
  const langsmithFinal = langsmithKey || process.env.LANGSMITH_API_KEY;

  return {
    langsmith_connected: Boolean(langsmithFinal && langsmithFinal.trim().length > 0),
    gemini_configured: Boolean(geminiFinal && geminiFinal.trim().length > 0),
  };
}

/**
 * Convert JSON to TOON format with token tracking
 * @param {string} jsonInput
 * @param {number} indent
 * @param {string} delimiter
 */
export function convertJsonToToonUtil(jsonInput, indent = 2, delimiter = ',') {
  if (typeof jsonInput !== 'string' || !jsonInput.trim()) {
    throw new Error('json_input is required and cannot be empty');
  }

  const parsed = JSON.parse(jsonInput);
  const toonOutput = toonEncode(parsed, {
    indent: Number(indent) || 2,
    delimiter: delimiter || ',',
  });

  const jsonDataTokens = countTokens(jsonInput);
  const toonDataTokens = countTokens(toonOutput);
  const savings = jsonDataTokens - toonDataTokens;
  const savingsPercent = jsonDataTokens > 0 ? (savings / jsonDataTokens) * 100 : 0;

  return {
    output: toonOutput,
    json_data_tokens: jsonDataTokens,
    toon_data_tokens: toonDataTokens,
    savings,
    savings_percent: Math.round(savingsPercent * 100) / 100,
  };
}

/**
 * Convert TOON to JSON format with token tracking
 * @param {string} toonInput
 */
export function convertToonToJsonUtil(toonInput) {
  if (typeof toonInput !== 'string') {
    throw new Error('toon_input is required');
  }

  try {
    const decoded = toonDecode(toonInput);
    const jsonOutputStr = JSON.stringify(decoded, null, 2);

    const toonDataTokens = countTokens(toonInput);
    const jsonDataTokens = countTokens(jsonOutputStr);

    return {
      output: jsonOutputStr,
      toon_data_tokens: toonDataTokens,
      json_data_tokens: jsonDataTokens,
    };
  } catch (err) {
    throw new Error(`[TOON decode failed] Structure not supported: ${err.message}`);
  }
}

/**
 * Helper to build the prompt for Gemini
 * @param {string} dataText
 * @param {string} question
 */
function buildAnalysisPrompt(dataText, question) {
  return `You are a data analysis assistant. Answer the question based on the provided data.

Data:
\`\`\`
${dataText}
\`\`\`

Question: ${question}

Provide a clear, natural language answer. Be direct and concise.`;
}

/**
 * Execute AI query against Gemini with token analytics & optional LangSmith tracing
 * @param {string} dataText
 * @param {string} question
 * @param {'JSON'|'TOON'} dataFormat
 * @param {string|null} apiKey
 * @param {string|null} langsmithKey
 */
export async function queryDataWithGeminiUtil(dataText, question, dataFormat, apiKey = null, langsmithKey = null) {
  const startTime = Date.now();

  const keyToUse = apiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    return { error: 'Gemini API key not configured. Please provide one in the sidebar.' };
  }

  const client = apiKey ? new GoogleGenAI({ apiKey }) : (defaultGenaiClient || new GoogleGenAI({ apiKey: keyToUse }));
  const projectName = dataFormat === 'JSON' ? 'json-query' : 'toon-query';

  // Calculate tokens for input and cross-format comparison
  let jsonText = null;
  let toonText = null;
  let jsonDataTokens = 0;
  let toonDataTokens = 0;
  let conversionStatus = 'success';

  try {
    if (dataFormat === 'JSON') {
      jsonText = dataText;
      jsonDataTokens = countTokens(jsonText);
      const parsed = JSON.parse(jsonText);
      toonText = toonEncode(parsed, { indent: 2, delimiter: ',' });
      toonDataTokens = countTokens(toonText);
    } else {
      toonText = dataText;
      toonDataTokens = countTokens(toonText);
      const decoded = toonDecode(toonText);
      jsonText = JSON.stringify(decoded, null, 2);
      jsonDataTokens = countTokens(jsonText);
    }
  } catch (err) {
    conversionStatus = 'failed';
    jsonDataTokens = dataFormat === 'JSON' ? countTokens(dataText) : 0;
    toonDataTokens = dataFormat === 'TOON' ? countTokens(dataText) : 0;
  }

  const prompt = buildAnalysisPrompt(dataText, question);
  const dataTokens = countTokens(dataText);
  const questionTokens = countTokens(question);
  const promptTokens = countTokens(prompt);
  const templateTokens = Math.max(0, promptTokens - (dataTokens + questionTokens));

  // Runner for Gemini call
  const runGemini = async (promptText) => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: promptText,
    });
    const answerText = response.text || '';
    const outputTokens = countTokens(answerText);
    return {
      answer: answerText,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: outputTokens,
        total_tokens: promptTokens + outputTokens,
      },
    };
  };

  let queryFunc = runGemini;
  const langsmithKeyToUse = langsmithKey || process.env.LANGSMITH_API_KEY;

  if (langsmithKeyToUse) {
    try {
      const lsClient = new LangSmithClient({ apiKey: langsmithKeyToUse });
      queryFunc = traceable(runGemini, {
        name: `${dataFormat.toLowerCase()}_query`,
        project_name: projectName,
        run_type: 'llm',
        metadata: { model: GEMINI_MODEL_NAME },
        client: lsClient,
      });
    } catch (err) {
      console.warn('[LangSmith] Failed to setup tracing:', err);
    }
  }

  const result = await queryFunc(prompt);
  const answer = result.answer;
  const completionTokens = result.usage.completion_tokens;
  const totalLlmTokens = result.usage.total_tokens;
  const execMs = Math.round((Date.now() - startTime) * 100) / 100;

  let dataSavingsTokens = 0;
  let dataSavingsPercent = 0.0;
  if (conversionStatus === 'success' && jsonDataTokens > 0) {
    dataSavingsTokens = jsonDataTokens - toonDataTokens;
    dataSavingsPercent = (dataSavingsTokens / jsonDataTokens) * 100;
  }

  // Check if answer contains structured data to evaluate output tokens
  let outputJsonTokens = 0;
  let outputToonTokens = 0;
  let outputConversionStatus = 'plain_text';

  try {
    if (answer.includes('{') || answer.includes('[')) {
      const match = answer.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);
        outputJsonTokens = countTokens(jsonStr);
        const encodedToon = toonEncode(parsed, { indent: 2, delimiter: ',' });
        outputToonTokens = countTokens(encodedToon);
        outputConversionStatus = 'success';
      }
    }
  } catch (err) {
    outputJsonTokens = completionTokens;
    outputToonTokens = completionTokens;
    outputConversionStatus = 'plain_text';
  }

  if (outputConversionStatus === 'plain_text') {
    outputJsonTokens = completionTokens;
    outputToonTokens = completionTokens;
  }

  return {
    answer,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_llm_tokens: totalLlmTokens,
    breakdown: {
      data_tokens: dataTokens,
      question_tokens: questionTokens,
      template_tokens: templateTokens,
    },
    data_format: dataFormat,
    json_data_tokens: jsonDataTokens,
    toon_data_tokens: toonDataTokens,
    data_savings_tokens: dataSavingsTokens,
    data_savings_percent: Math.round(dataSavingsPercent * 100) / 100,
    conversion_status: conversionStatus,
    output_json_tokens: outputJsonTokens,
    output_toon_tokens: outputToonTokens,
    output_conversion_status: outputConversionStatus,
    exec_ms: execMs,
  };
}

/**
 * Async generator for streaming Gemini AI responses via WebSocket
 * @param {string} dataText
 * @param {string} question
 * @param {'JSON'|'TOON'} dataFormat
 * @param {string|null} apiKey
 * @param {string|null} langsmithKey
 */
export async function* streamQueryDataWithGeminiUtil(dataText, question, dataFormat, apiKey = null, langsmithKey = null) {
  const startTime = Date.now();

  const keyToUse = apiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    yield JSON.stringify({ type: 'error', message: 'Gemini API key not configured. Please provide one in the sidebar.' });
    return;
  }

  const client = apiKey ? new GoogleGenAI({ apiKey }) : (defaultGenaiClient || new GoogleGenAI({ apiKey: keyToUse }));

  let jsonDataTokens = 0;
  let toonDataTokens = 0;
  try {
    if (dataFormat === 'JSON') {
      jsonDataTokens = countTokens(dataText);
      const parsed = JSON.parse(dataText);
      const encoded = toonEncode(parsed, { indent: 2, delimiter: ',' });
      toonDataTokens = countTokens(encoded);
    } else {
      toonDataTokens = countTokens(dataText);
      const decoded = toonDecode(dataText);
      const jsonStr = JSON.stringify(decoded, null, 2);
      jsonDataTokens = countTokens(jsonStr);
    }
  } catch (err) {
    console.warn('[streamQuery] Conversion pre-calculation error:', err.message);
  }

  const prompt = buildAnalysisPrompt(dataText, question);
  const promptTokens = countTokens(prompt);
  let fullAnswer = '';

  // Yield initial metadata
  yield JSON.stringify({
    type: 'metadata',
    json_data_tokens: jsonDataTokens,
    toon_data_tokens: toonDataTokens,
    prompt_tokens: promptTokens,
  });

  try {
    const stream = await client.models.generateContentStream({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });

    for await (const chunk of stream) {
      const delta = chunk.text || '';
      if (delta) {
        fullAnswer += delta;
        yield JSON.stringify({
          type: 'content',
          delta,
        });
      }
    }

    const completionTokens = countTokens(fullAnswer);
    const execMs = Math.round((Date.now() - startTime) * 100) / 100;

    yield JSON.stringify({
      type: 'final',
      answer: fullAnswer,
      completion_tokens: completionTokens,
      total_llm_tokens: promptTokens + completionTokens,
      exec_ms: execMs,
    });
  } catch (err) {
    const errorMsg = err.message || String(err);
    console.error('[streamQuery] Streaming error:', errorMsg);

    if (errorMsg.includes('429')) {
      yield JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Please wait a moment before trying again.' });
    } else if (errorMsg.includes('403')) {
      yield JSON.stringify({ type: 'error', message: 'Invalid API key or permission denied.' });
    } else {
      yield JSON.stringify({ type: 'error', message: `An error occurred: ${errorMsg}` });
    }
  }
}
