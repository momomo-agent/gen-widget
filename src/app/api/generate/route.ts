import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 iOS Widget 生成引擎。用户描述场景，你输出 5-6 个 iOS 风格小组件。",
  "",
  "输出纯 JSON。html 是纯内容片段，不包裹 widget 容器。",
  "",
  "## 尺寸（严格只用这 4 种）",
  "2x2 — 正方形（最常用）  4x2 — 宽（列表/分栏）  4x4 — 大（复杂信息）  2x1 — 窄条",
  "",
  "## CSS 类",
  "字号已按 cqi（相对 widget 宽度）设好，你只管用类名：",
  ".w-icon — 大 emoji  .w-label — 极小灰色标签  .w-title — 巨大粗体标题",
  ".w-value — 超大数字  .w-unit — 跟在 value 后  .w-body — 小正文  .w-meta — 底部极小灰字",
  ".w-row — 横排  .w-col — 竖排  .w-action — 全宽大按钮（蓝色）",
  ".w-action-green — 绿色按钮  .w-action-orange — 橙色按钮",
  ".w-progress > .w-progress-fill — 进度条  .w-badge — 红色角标",
  ".w-list-item > .w-list-time + text — 带时间的列表项",
  "",
  "## 🎨 色彩变化（让每组 widget 不单调）",
  "在 widget 容器上加 class（通过 wrapperClass 字段）：",
  "w-bg-blue — 蓝色渐变底（适合天气/出行）",
  "w-bg-green — 绿色渐变底（适合健康/运动）",
  "w-bg-dark — 深色毛玻璃底（适合股票/数据/阅读）",
  "w-bg-orange — 橙粉渐变底（适合促销/倒计时）",
  "不加 = 默认白色毛玻璃。每组建议 1-2 个有色 widget。",
  "",
  "## 示例（注意内容极简）",
  '{"widgets":[',
  '{"size":"2x2","wrapperClass":"w-bg-blue","html":"<div class=\'w-icon\'>☀️</div><div class=\'w-value\'>18<span class=\'w-unit\'>°</span></div><div class=\'w-meta\'>晴 · 空气优</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>🚇</div><div class=\'w-value\'>25<span class=\'w-unit\'>分钟</span></div><div class=\'w-meta\'>2号线 8:40</div>"},',
  '{"size":"4x2","html":"<div class=\'w-row\'><div class=\'w-icon\'>📋</div><div class=\'w-col\'><div class=\'w-title\'>今日日程</div></div></div><div class=\'w-list-item\'><div class=\'w-list-time\'>09:30</div>产品周会</div><div class=\'w-list-item\'><div class=\'w-list-time\'>14:00</div>项目评审</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>☕</div><div class=\'w-title\'>订咖啡</div><div class=\'w-action-green\'>下单 ¥9.9</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-dark","html":"<div class=\'w-icon\'>📊</div><div class=\'w-value\'>¥4,267</div><div class=\'w-meta\'>本月支出</div>"}',
  ']}',
  "",
  "## ⚠️ 设计铁律",
  "1. 每个 widget 必须有 w-value（大数字）或 w-title（大标题）作为视觉焦点",
  "2. 每个 widget 必须有具体数据（温度23°、时间08:40、金额¥15.9、百分比85%、数量3杯、距离2.5km）",
  "3. 每个 widget 必须有 w-meta 或 w-label 底部辅助文字",
  "4. 按钮用 w-action（全宽大胶囊），不要小按钮",
  "5. 内容极简 — 2x2 只有 icon + 大数字 + 1 行辅助，4x2 最多 2 行内容",
  "6. 每组 5-6 个 widget，1-2 个用彩色底",
  "7. 用 emoji 做图标",
  "8. 禁止抽象/模糊内容（❌ '学习进度' ✓ '已背 150 词'）",
  "9. w-value 内容控制在 5 字以内（如 18°、¥127、3.2km、85%），超长数字会溢出",
  "10. 4x2 的 w-title 控制在 5 字以内，不要长标题",
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
    if (!res.ok) throw new Error("API " + res.status);

    const json = JSON.parse(raw);
    if (!json.content?.[0]?.text) throw new Error("No content");

    let text = json.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

    const data = JSON.parse(text);

    const validSizes = new Set(["2x1", "2x2", "4x2", "4x4"]);
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
