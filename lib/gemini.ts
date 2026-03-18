export interface GeminiError {
  status: number;
  message: string;
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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
  userMessage: string
): Promise<string> {
  if (apiKeys.length === 0) {
    throw new Error("Chưa có API key nào. Vui lòng thêm ít nhất 1 key.");
  }

  const errors: string[] = [];

  for (const key of apiKeys) {
    try {
      return await callGemini(key, systemPrompt, userMessage);
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
