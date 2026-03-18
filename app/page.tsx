"use client";

import { useState, useEffect, useCallback } from "react";
import { generateWithKeyRotation, MODELS } from "@/lib/gemini";

const STYLES = [
  { value: "action", label: "Hành động / Chiến đấu / Truy đuổi" },
  { value: "xianxia", label: "Tiên hiệp / Kỳ ảo / Sử thi" },
  { value: "product", label: "Sản phẩm / Thương mại / Quảng cáo" },
  { value: "drama", label: "Phim ngắn / Thoại / Cảm xúc" },
  { value: "transform", label: "Biến hình / Biến trang / Chuyển cảnh" },
  { value: "dance", label: "Nhảy / MV / Nhịp điệu" },
  { value: "lifestyle", label: "Đời sống / Chữa lành / Vlog" },
  { value: "scifi", label: "Sci-Fi / Mech / Tận thế" },
];

const STYLE_MAP: Record<string, string> = {
  action: "动作/战斗/追逐",
  xianxia: "仙侠/奇幻/史诗",
  product: "产品/电商/广告",
  drama: "短剧/对白/情感",
  transform: "变身/变装/转场",
  dance: "舞蹈/MV/卡点",
  lifestyle: "生活/治愈/Vlog",
  scifi: "科幻/机甲/末日",
};

const LS_KEYS_KEY = "seedance_api_keys";

export default function Home() {
  // API Keys
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [showKeys, setShowKeys] = useState(true);

  // Form
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState("10");
  const [style, setStyle] = useState("action");
  const [ratio, setRatio] = useState("16:9");
  const [language, setLanguage] = useState("vi");
  const [model, setModel] = useState("gemini-2.0-flash-lite");

  // Result
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Skill content
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [skillLoading, setSkillLoading] = useState(true);

  // Load API keys from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEYS_KEY);
      if (stored) {
        const keys = JSON.parse(stored);
        if (Array.isArray(keys) && keys.length > 0) {
          setApiKeys(keys);
          setShowKeys(false);
        }
      }
    } catch {}
  }, []);

  // Save API keys to localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEYS_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Load skill files
  useEffect(() => {
    async function loadSkill() {
      try {
        const [skill, templates, compliance, vocab] = await Promise.all([
          fetch("/skill/SKILL.md").then((r) => r.text()),
          fetch("/skill/prompt-templates.md").then((r) => r.text()),
          fetch("/skill/compliance.md").then((r) => r.text()),
          fetch("/skill/vocab.md").then((r) => r.text()),
        ]);

        const prompt = [
          skill,
          "\n\n---\n\n## Reference: Prompt Templates\n\n",
          templates,
          "\n\n---\n\n## Reference: Compliance Rules\n\n",
          compliance,
          "\n\n---\n\n## Reference: Vocabulary\n\n",
          vocab,
          "\n\n---\n\n",
          "## Special Instructions (Web Interface Mode)\n\n",
          "The user has already selected duration, style, and aspect ratio via the web interface. ",
          "Skip step 1 (collecting information) — go directly to step 2 (identify type and select template). ",
          "Generate the prompt immediately without asking any questions. ",
          "All required information is provided in the user message.",
        ].join("");

        setSystemPrompt(prompt);
      } catch (err) {
        setError("Không thể tải skill files. Hãy thử refresh trang.");
      } finally {
        setSkillLoading(false);
      }
    }

    loadSkill();
  }, []);

  const addKey = useCallback(() => {
    const key = newKey.trim();
    if (!key) return;
    if (apiKeys.includes(key)) {
      setNewKey("");
      return;
    }
    setApiKeys((prev) => [...prev, key]);
    setNewKey("");
  }, [newKey, apiKeys]);

  const removeKey = useCallback((index: number) => {
    setApiKeys((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!idea.trim() || apiKeys.length === 0 || !systemPrompt) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    const langInstruction =
      language === "vi"
        ? "请用越南语回复。"
        : language === "en"
          ? "请用英语回复。"
          : "请用中文回复。";

    const userMessage = [
      `用户需求：${idea}`,
      `视频时长：${duration}s`,
      `视频风格：${STYLE_MAP[style]}`,
      `视频比例：${ratio}`,
      "",
      langInstruction,
      "请直接生成提示词，不需要再确认信息。",
    ].join("\n");

    try {
      const output = await generateWithKeyRotation(
        apiKeys,
        systemPrompt,
        userMessage,
        model
      );
      setResult(output);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Lỗi không xác định";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [idea, duration, style, ratio, language, model, apiKeys, systemPrompt]);

  const copyResult = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") addKey();
    },
    [addKey]
  );

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">
            Seedance 2.0 Prompt Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Nhập ý tưởng, nhận prompt video chuyên nghiệp cho Seedance 2.0
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* API Key Section */}
        <section className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-base font-semibold">
              API Keys
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({apiKeys.length} key{apiKeys.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${showKeys ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showKeys && (
            <div className="mt-4 space-y-2">
              {apiKeys.map((key, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-800/70 rounded-lg px-3 py-2"
                >
                  <span className="text-slate-400 text-sm font-mono flex-1 truncate">
                    {key.slice(0, 10)}...{key.slice(-4)}
                  </span>
                  <button
                    onClick={() => removeKey(i)}
                    className="text-slate-500 hover:text-red-400 transition-colors text-sm px-1"
                  >
                    x
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Dán Gemini API Key vào đây..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:border-violet-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={addKey}
                  disabled={!newKey.trim()}
                  className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Thêm
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Key được lưu trong trình duyệt (localStorage). Hỗ trợ nhiều
                key, key nào hết quota sẽ tự chuyển sang key tiếp theo.
              </p>
            </div>
          )}
        </section>

        {/* Form Section */}
        <section className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 space-y-5">
          {/* Idea */}
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">
              Mô tả ý tưởng video
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="VD: Cảnh chiến đấu giữa 2 kiếm sĩ trong rừng trúc dưới mưa..."
              rows={4}
              className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm resize-none border border-slate-700 focus:border-violet-500 focus:outline-none transition-colors leading-relaxed"
            />
          </div>

          {/* Options row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Duration */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Thời lượng
              </label>
              <div className="flex gap-1.5">
                {["5", "10", "15"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      duration === d
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Ratio */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Tỷ lệ
              </label>
              <div className="flex gap-1.5">
                {["16:9", "9:16"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      ratio === r
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Ngôn ngữ output
              </label>
              <div className="flex gap-1.5">
                {[
                  { value: "vi", label: "VI" },
                  { value: "en", label: "EN" },
                  { value: "zh", label: "ZH" },
                ].map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLanguage(l.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      language === l.value
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style + Model row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Phong cách
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-slate-800 rounded-lg px-4 py-2.5 text-sm border border-slate-700 focus:border-violet-500 focus:outline-none transition-colors"
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-800 rounded-lg px-4 py-2.5 text-sm border border-slate-700 focus:border-violet-500 focus:outline-none transition-colors"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              !idea.trim() ||
              apiKeys.length === 0 ||
              skillLoading ||
              !systemPrompt
            }
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl py-3.5 font-semibold text-base transition-colors flex items-center justify-center gap-2"
          >
            {skillLoading ? (
              "Đang tải skill..."
            ) : loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Đang tạo prompt...
              </>
            ) : apiKeys.length === 0 ? (
              "Thêm API key trước"
            ) : (
              "Tạo Prompt"
            )}
          </button>
        </section>

        {/* Result Section */}
        {error && (
          <section className="bg-red-950/30 rounded-xl p-5 border border-red-900/50">
            <h3 className="font-semibold text-red-400 mb-2">Lỗi</h3>
            <pre className="text-sm text-red-300 whitespace-pre-wrap leading-relaxed">
              {error}
            </pre>
          </section>
        )}

        {result && (
          <section className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Kết quả</h3>
              <button
                onClick={copyResult}
                className="text-sm bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-1.5 transition-colors border border-slate-700"
              >
                {copied ? "Đã copy!" : "Copy"}
              </button>
            </div>
            <div className="bg-slate-800/70 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed border border-slate-700/50">
              {result}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-4">
          Powered by Google Gemini 2.0 Flash &middot; Skill based on 400+ real
          Seedance prompts
        </footer>
      </div>
    </main>
  );
}
