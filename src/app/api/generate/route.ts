import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 Gen Widget 引擎，生成 iOS 风格的智能小部件。",
  "",
  "输出格式（纯 JSON，不要 markdown）：",
  '{"widgets":[{"size":"2x2","html":"..."}]}',
  "",
  "尺寸：2x1, 2x2, 4x1, 4x2, 4x4",
  "",
  "CSS 类（已定义）：",
  ".w-icon — emoji 28px",
  ".w-label — 小标签 11px 灰色大写",
  ".w-title — 标题 20px 粗体",
  ".w-value — 大数字 36px 细体",
  ".w-unit — 单位 18px",
  ".w-body — 正文 15px",
  ".w-meta — 底部小字 11px",
  ".w-row / .w-col — flex 布局",
  ".w-action — iOS 蓝色按钮",
  ".w-action-green / .w-action-orange — 彩色按钮",
  ".w-progress + .w-progress-fill — 进度条（需 style='width:70%'）",
  ".w-list-item + .w-list-dot — 列表项",
  ".w-list-time — 时间列（14px 等宽）",
  ".w-tag — 标签",
  ".w-badge — 红色数字徽章",
  ".w-divider — 分隔线",
  "",
  "设计原则：",
  "1. iOS 小组件风格：大字号、大留白、信息密度低",
  "2. 每个 widget 聚焦一个信息点",
  "3. 用 emoji 做图标",
  "4. 2x2 适合单数据，4x2 适合列表，2x1 适合简短提示",
  "5. 生成内容要具体真实（具体温度、时间、地点）",
  "6. 每个场景包含一个操作按钮 widget",
  "",
  "生成 4-6 个 widget，混合尺寸。",
  "html 是纯片段，不要包 <div class='widget'>。",
].join("\n");

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const res = await fetch(
      (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") +
        "/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const raw = await res.text();
    if (!res.ok) {
      throw new Error("API error: " + res.status);
    }

    const json = JSON.parse(raw);
    if (!json.content?.[0]?.text) {
      throw new Error("No content");
    }

    let text = json.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("Generate error:", e);
    return NextResponse.json(
      {
        widgets: [
          {
            size: "4x1",
            html:
              '<div class="w-icon">⚠️</div><div class="w-title">生成失败</div><div class="w-body">' +
              (e.message || String(e)) +
              "</div>",
          },
        ],
      },
      { status: 500 }
    );
  }
}
