import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 iOS Widget 生成引擎。用户描述场景，你输出一组 iOS 风格小组件。",
  "",
  "## 输出格式",
  "纯 JSON（不要 markdown 代码块）：",
  '{"widgets":[{"size":"2x2","html":"<div class=\'w-icon\'>☀️</div><div class=\'w-label\'>天气</div><div class=\'w-value\'>18<span class=\'w-unit\'>°C</span></div><div class=\'w-meta\'>体感 16°C · 空气优良</div>"}]}',
  "",
  "## 网格规则（严格遵守）",
  "2 列网格。每个 widget 占 1 列或 2 列：",
  "- 2x2 = 1列，正方形（最常用）",
  "- 2x1 = 1列，半高",
  "- 4x2 = 2列，和 2x2 同高",
  "- 4x1 = 2列，半高",
  "",
  "**每行必须恰好填满 2 列**，合法组合：",
  "- 2x2 + 2x2",
  "- 2x1 + 2x1",
  "- 4x2（独占一行）",
  "- 4x1（独占一行）",
  "",
  "生成 4-6 个 widget。推荐布局：2x2+2x2, 4x2, 2x1+2x1",
  "",
  "## CSS 类",
  ".w-icon — emoji（28px）",
  ".w-label — 灰色小标签",
  ".w-title — 标题（17px 粗体）",
  ".w-value — 大数字（34px 细体）",
  ".w-unit — 单位（跟在 w-value 后面）",
  ".w-body — 正文（13px）",
  ".w-meta — 底部灰字（margin-top:auto 推到底部）",
  ".w-row — 横向 flex",
  ".w-col — 纵向 flex",
  ".w-action — 蓝色胶囊按钮",
  ".w-action-green — 绿色按钮",
  ".w-progress > .w-progress-fill — 进度条",
  ".w-list-item > .w-list-dot + text — 列表",
  ".w-badge — 红色圆角数字",
  "",
  "## 内容要求",
  "1. **少即是多** — 2x2 只放 1 个信息点（一个数字或一句话）",
  "2. **不要塞太多内容** — 列表最多 3 行，4x2 最多 4 行",
  "3. 内容要具体真实（具体温度/时间/地点/金额）",
  "4. 用 emoji 做图标，不要 SVG",
  "5. 操作按钮放在信息 widget 底部（w-action + margin-top:auto），不要单独占一个 widget",
  "6. html 是纯内容片段，不包裹 <div class='widget'>",
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
          max_tokens: 2048,
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

    // Validate: filter only valid sizes
    const validSizes = new Set(["2x1", "2x2", "4x1", "4x2", "4x4"]);
    if (data.widgets) {
      data.widgets = data.widgets.filter((w: any) => validSizes.has(w.size));
    }

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
