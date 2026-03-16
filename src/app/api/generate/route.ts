import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 iOS Widget 生成引擎。用户描述场景，你输出一组 iOS 风格小组件。",
  "",
  "## 输出格式",
  "纯 JSON（不要 markdown 代码块）：",
  '{"widgets":[{"size":"2x2","html":"<div class=\'w-icon\'>☀️</div><div class=\'w-label\'>天气</div><div class=\'w-value\'>18<span class=\'w-unit\'>°C</span></div><div class=\'w-meta\'>体感 16°C · 空气优良</div>"}]}',
  "",
  "## 尺寸",
  "2x2（最常用）、4x2（双宽）、2x1、4x1。生成 4-6 个。",
  "",
  "## CSS 类",
  ".w-icon — emoji 图标（大号）",
  ".w-label — 灰色小标签（类别名）",
  ".w-title — 标题（大号粗体）",
  ".w-value — 核心数字（超大号细体，是 widget 的视觉中心）",
  ".w-unit — 跟在 w-value 后面的单位",
  ".w-body — 说明文字",
  ".w-meta — 底部辅助信息（自动推到底部）",
  ".w-row — 横向排列",
  ".w-col — 纵向排列",
  ".w-action — 圆角按钮（蓝色）",
  ".w-action-green — 绿色按钮",
  ".w-progress > .w-progress-fill — 进度条",
  ".w-list-item > .w-list-dot + text — 列表项",
  ".w-badge — 红色角标数字",
  "",
  "## ⚠️ 关键设计原则",
  "",
  "**每个 widget 必须视觉饱满**——用大 emoji + 大数字/大标题填充空间。",
  "",
  "2x2 widget 的标准结构（从上到下）：",
  "1. w-icon（大 emoji）",
  "2. w-label（类别）",
  "3. w-value + w-unit（核心数据，占最大视觉面积）",
  "4. w-meta（底部补充）",
  "",
  "❌ 错误示范（太空）：只放一个 emoji + 一行小字",
  "✅ 正确示范：emoji + 标签 + 大数字 + 底部说明，层次分明",
  "",
  "4x2 widget：可以用 w-row 左右分栏，或放 2-3 行列表，但仍要有大标题。",
  "",
  "其他规则：",
  "- 内容要具体真实（具体数字/时间/地点/金额）",
  "- 用 emoji 做图标",
  "- 操作按钮（w-action）放在 widget 底部，不要单独占一个 widget",
  "- html 是纯内容片段，不包裹 <div class='widget'>",
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
            size: "2x2",
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
