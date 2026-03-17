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
  "",
  "### 文字（按大小选择）",
  ".w-value — 超大数字（1-4 字符：18°、¥89、5km）",
  ".w-value-md — 中号数字（5-8 字符：¥4,267、23:42、5'12''）",
  ".w-value-sm — 小号数字（8+ 字符或长文本）",
  ".w-title — 大粗标题（最多 5 字）  .w-label — 灰色小标签",
  ".w-body — 正文  .w-meta — 底部灰字（自动推底）  .w-unit — 数字后的单位",
  "",
  "### 布局",
  ".w-icon — emoji 图标  .w-row — 横排  .w-col — 竖排",
  ".w-action — tinted 胶囊按钮  .w-action-green/orange — 彩色按钮",
  ".w-progress > .w-progress-fill — 进度条  .w-badge — 红色角标  .w-tag — 灰底小标签",
  ".w-list-item > .w-list-time + text — 带时间的列表项",
  ".w-up — 绿色（涨）  .w-down — 红色（跌）",
  "",
  "### 背景色（wrapperClass）",
  "w-bg-blue / w-bg-green / w-bg-dark / w-bg-orange（每组 2-3 个有色）",
  "",
  "## 示例 — 注意结构多样性",
  '{"widgets":[',
  // 数字型 — 短数字用 w-value
  '{"size":"2x2","wrapperClass":"w-bg-blue","html":"<div class=\'w-icon\'>☀️</div><div class=\'w-label\'>北京 · 多云</div><div class=\'w-value\'>18<span class=\'w-unit\'>°C</span></div><div class=\'w-meta\'>体感 16° · 空气优良</div>"},',
  // 数据型 — 长数字用 w-value-md + 进度条
  '{"size":"2x2","wrapperClass":"w-bg-dark","html":"<div class=\'w-icon\'>💰</div><div class=\'w-label\'>本月支出</div><div class=\'w-value-md\'>¥4,267</div><div class=\'w-progress\'><div class=\'w-progress-fill\' style=\'width:65%\'></div></div><div class=\'w-meta\'>预算剩余 ¥1,733</div>"},',
  // 列表型 — 4x2 大标题+列表
  '{"size":"4x2","html":"<div class=\'w-row\'><div class=\'w-icon\'>📋</div><div class=\'w-col\'><div class=\'w-title\'>今日日程</div><div class=\'w-label\'>3 个会议</div></div></div><div class=\'w-list-item\'><div class=\'w-list-time\'>09:30</div>产品周会 · 3楼会议室</div><div class=\'w-list-item\'><div class=\'w-list-time\'>14:00</div>项目评审 · 线上</div><div class=\'w-meta\'>还有 2 小时</div>"},',
  // 操作型 — 标题+描述+按钮
  '{"size":"2x2","html":"<div class=\'w-icon\'>☕</div><div class=\'w-title\'>瑞幸咖啡</div><div class=\'w-body\'>美式 · 常喝</div><div class=\'w-action-green\'>下单 ¥9.9</div>"},',
  // 进度型 — 步数+进度条
  '{"size":"2x2","wrapperClass":"w-bg-green","html":"<div class=\'w-icon\'>🏃</div><div class=\'w-label\'>今日步数</div><div class=\'w-value-md\'>6,832</div><div class=\'w-progress\'><div class=\'w-progress-fill w-fill-green\' style=\'width:68%\'></div></div><div class=\'w-meta\'>目标 10,000 · 还差 3,168</div>"},',
  // 通勤型 — 短数字
  '{"size":"2x2","html":"<div class=\'w-icon\'>🚇</div><div class=\'w-label\'>通勤 · 2号线</div><div class=\'w-value\'>25<span class=\'w-unit\'>分</span></div><div class=\'w-meta\'>8:40 到站 · 3 站</div>"}',
  ']}',
  "",
  "## ⚠️ 关键规则",
  "1. 根据内容长度选择字号：1-4字→w-value，5-8字→w-value-md，8+字→w-value-sm",
  "2. 内容必须具体真实（温度18°C、地铁2号线8:40、¥4,267、产品周会·3楼）",
  "3. 每个 widget 有完整信息层级：标签(w-label) + 焦点(w-value/w-title) + 补充(w-meta)",
  "4. 结构多样！至少包含 3 种不同结构：",
  "   - 纯数字型（w-value + w-meta）",
  "   - 标题操作型（w-title + w-body + w-action）",
  "   - 列表型（w-title + w-list-item）",
  "   - 数据型（w-value-md + w-progress + w-meta）",
  "   - 状态型（w-icon + w-title + w-tag）",
  "5. 每组 2-3 个彩色底 widget",
  "6. 用 emoji 做图标",
  "7. 禁止抽象模糊（❌ '学习进度' ✓ '已背 150 词 · 复习 45 词'）",
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
