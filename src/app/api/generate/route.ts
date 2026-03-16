import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 Gen Widget 引擎，生成 iOS 风格的智能小部件。",
  "",
  "输出格式（纯 JSON，不要 markdown）：",
  '{"widgets":[{"size":"2x2","html":"..."}]}',
  "",
  "尺寸：2x1, 2x2, 4x1, 4x2, 4x4",
  "",
  "**重要：2 列网格布局规则**",
  "- 2x2 占 1 列（正方形）",
  "- 4x2 占 2 列（横跨整行，高度和 2x2 相同）",
  "- 2x1 占 1 列（高度是 2x2 的一半）",
  "- 4x1 占 2 列（横跨整行，高度是 2x2 的一半）",
  "- 生成顺序要让网格对齐：",
  "  ✓ 2x2 + 2x2（一行两个正方形）",
  "  ✓ 2x2 + 2x1 + 2x1（左边正方形，右边两个小的）",
  "  ✓ 4x2（单独一行）",
  "  ✓ 4x1 + 2x1 + 2x1（上面横条，下面两个小的）",
  "  ✗ 避免：2x2 + 4x1（会错位）",
  "",
  "CSS 类（已定义）：",
  ".w-icon — emoji 32px",
  ".w-label — 小标签 12px 灰色大写",
  ".w-title — 标题 20px 粗体",
  ".w-value — 大数字 42px 细体",
  ".w-unit — 单位 20px",
  ".w-body — 正文 15px",
  ".w-meta — 底部小字 12px",
  ".w-row / .w-col — flex 布局",
  ".w-action — iOS 蓝色按钮",
  ".w-progress + .w-progress-fill — 进度条（需 style='width:70%'）",
  ".w-list-item + .w-list-dot — 列表项",
  ".w-list-time — 时间列 14px",
  "",
  "设计原则：",
  "1. iOS 小组件风格：大字号、大留白、信息密度低",
  "2. 每个 widget 聚焦一个信息点",
  "3. 用 emoji 做图标",
  "4. 生成内容要具体真实（具体温度、时间、地点）",
  "5. 每个场景包含一个操作按钮 widget",
  "",
  "生成 4-6 个 widget，注意网格对齐。",
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
