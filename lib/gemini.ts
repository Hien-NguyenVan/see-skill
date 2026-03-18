export interface GeminiError {
  status: number;
  message: string;
}

export const MODELS = [
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash (Free)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.0 Flash Lite" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
] as const;

export type ModelId = (typeof MODELS)[number]["value"];

function buildUrl(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  model: string = "gemini-2.5-flash-preview-05-20"
): Promise<string> {
  const response = await fetch(buildUrl(model, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: GeminiError = {
      status: response.status,
      message: errorData.error?.message || `HTTP ${response.status}`,
    };
    throw err;
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    const blockReason = data.candidates?.[0]?.finishReason;
    if (blockReason === "SAFETY") {
      throw {
        status: 400,
        message:
          "Nội dung bị chặn bởi bộ lọc an toàn của Gemini. Hãy thử mô tả khác.",
      };
    }
    throw { status: 500, message: "Gemini trả về kết quả rỗng." };
  }

  return data.candidates[0].content.parts[0].text;
}

export async function generateWithKeyRotation(
  apiKeys: string[],
  systemPrompt: string,
  userMessage: string,
  model: string = "gemini-2.5-flash-preview-05-20"
): Promise<string> {
  if (apiKeys.length === 0) {
    throw new Error("Chưa có API key nào. Vui lòng thêm ít nhất 1 key.");
  }

  const errors: string[] = [];

  for (const key of apiKeys) {
    try {
      return await callGemini(key, systemPrompt, userMessage, model);
    } catch (err: unknown) {
      const geminiErr = err as GeminiError;
      const status = geminiErr.status || 0;

      // Rate limited or quota exhausted -> try next key
      if (status === 429 || status === 403) {
        errors.push(`Key ...${key.slice(-6)}: ${geminiErr.message}`);
        continue;
      }

      // Other errors -> throw immediately
      throw new Error(geminiErr.message || "Lỗi không xác định");
    }
  }

  throw new Error(
    `Tất cả API key đều thất bại:\n${errors.join("\n")}\n\nHãy kiểm tra quota hoặc thêm key mới.`
  );
}
