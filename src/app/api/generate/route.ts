import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 iOS Widget 生成引擎。用户描述场景，你输出 4-6 个 iOS 风格小组件。",
  "",
  "输出纯 JSON（不要 markdown 代码块）。html 是纯内容片段，不包裹 widget 容器。",
  "",
  "尺寸：2x2（最常用）、4x2（双宽）",
  "",
  "## CSS 类",
  ".w-icon — 大 emoji   .w-label — 灰色小标签   .w-title — 大粗体标题",
  ".w-value — 超大数字（widget 视觉中心）  .w-unit — 单位",
  ".w-body — 正文   .w-meta — 底部灰字（自动推底）",
  ".w-row — 横排   .w-col — 竖排   .w-action — 蓝色按钮   .w-action-green — 绿色按钮",
  ".w-progress > .w-progress-fill — 进度条   .w-badge — 红色角标",
  ".w-list-item > .w-list-dot — 列表项   .w-list-time — 时间",
  "",
  "## 示例（学习这些结构）",
  "",
  '{"widgets":[',
  // 天气 — 标准数字型
  '{"size":"2x2","html":"<div class=\'w-icon\'>☀️</div><div class=\'w-label\'>北京 · 多云</div><div class=\'w-value\'>18<span class=\'w-unit\'>°C</span></div><div class=\'w-meta\'>体感 16°C · 空气优良</div>"},',
  // 通勤 — 标题 + 数字 + 动作
  '{"size":"2x2","html":"<div class=\'w-icon\'>🚇</div><div class=\'w-label\'>通勤</div><div class=\'w-value\'>25<span class=\'w-unit\'>分钟</span></div><div class=\'w-meta\'>地铁2号线 · 预计 8:40 到达</div>"},',
  // 日程 — 4x2 列表型（必须有大标题）
  '{"size":"4x2","html":"<div class=\'w-row\'><div class=\'w-icon\'>📋</div><div class=\'w-col\'><div class=\'w-title\'>今日日程</div><div class=\'w-label\'>3 个会议</div></div></div><div class=\'w-list-item\'><div class=\'w-list-time\'>09:30</div>产品周会 · 3楼会议室</div><div class=\'w-list-item\'><div class=\'w-list-time\'>14:00</div>项目评审 · 线上</div><div class=\'w-list-item\'><div class=\'w-list-time\'>16:30</div>1v1 沟通</div>"},',
  // 操作型 — 大标题 + 按钮
  '{"size":"2x2","html":"<div class=\'w-icon\'>☕</div><div class=\'w-title\'>瑞幸咖啡</div><div class=\'w-body\'>美式 · 常喝</div><div class=\'w-action-green\'>下单 ¥9.9</div>"},',
  // 数据型 — 步数/金额
  '{"size":"2x2","html":"<div class=\'w-icon\'>💰</div><div class=\'w-label\'>本月支出</div><div class=\'w-value\'>¥4,267</div><div class=\'w-progress\'><div class=\'w-progress-fill\' style=\'width:65%\'></div></div><div class=\'w-meta\'>预算剩余 ¥1,733</div>"}',
  ']}',
  "",
  "## 规则",
  "1. **每个 2x2 必须有 w-value（大数字）或 w-title（大标题）**——这是视觉焦点",
  "2. 4x2 必须有 w-title 大标题 + 列表或分栏内容",
  "3. 内容具体真实（具体温度/时间/地点/金额/百分比）",
  "4. 操作按钮放在信息 widget 底部",
  "5. 用 emoji 做图标",
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
