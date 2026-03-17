import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 iOS Widget 生成引擎。用户描述场景，你输出 5-6 个 iOS 风格小组件。",
  "",
  "输出纯 JSON。html 是纯内容片段，不包裹 widget 容器。",
  "",
  "## 尺寸（严格只用这 4 种）",
  "2x2 — 正方形（最常用）  4x2 — 宽（列表/双栏/大横幅）  4x4 — 大  2x1 — 窄条",
  "",
  "## CSS 类",
  "字号按 cqi 设好，直接用类名：",
  ".w-icon — emoji（11cqi）  .w-label — 极小灰标签（4.5cqi semibold）",
  ".w-title — 大粗标题（14cqi semibold）  .w-value — 超大数字（48cqi ultralight）",
  ".w-unit — 跟 value 后的单位  .w-body — 小正文  .w-meta — 底部极小灰字（自动推到底）",
  ".w-row — 横排  .w-col — 竖排  .w-spacer — 弹性占位",
  ".w-action — tinted 胶囊按钮（浅蓝底+蓝字）  .w-action-green/orange/red — 其他色",
  ".w-progress > .w-progress-fill — 进度条  .w-badge — 红色角标  .w-tag — 灰底小标签",
  ".w-list-item > .w-list-time + text — 带时间的列表项  .w-divider — 细分割线",
  ".w-up — 绿色文字（涨）  .w-down — 红色文字（跌）",
  "",
  "## 🎨 wrapperClass 色彩",
  "w-bg-blue — 蓝色渐变  w-bg-green — 绿色渐变  w-bg-dark — 深色毛玻璃  w-bg-orange — 橙色渐变",
  "不加 = 白色毛玻璃。每组 2-3 个有色 widget，剩余白色。",
  "",
  "## 示例 A: 上班族 周一早上（极简数字型）",
  '{"widgets":[',
  '{"size":"2x2","wrapperClass":"w-bg-blue","html":"<div class=\'w-icon\'>☀️</div><div class=\'w-value\'>18<span class=\'w-unit\'>°</span></div><div class=\'w-meta\'>晴 · 空气优</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>🚇</div><div class=\'w-value\'>25<span class=\'w-unit\'>分</span></div><div class=\'w-meta\'>2号线 8:40</div>"},',
  '{"size":"4x2","html":"<div class=\'w-row\'><div class=\'w-icon\'>📋</div><div class=\'w-col\'><div class=\'w-title\'>日程</div></div></div><div class=\'w-list-item\'><div class=\'w-list-time\'>09:30</div>产品周会</div><div class=\'w-list-item\'><div class=\'w-list-time\'>14:00</div>评审</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>☕</div><div class=\'w-title\'>咖啡</div><div class=\'w-action-green\'>下单 ¥9.9</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-dark","html":"<div class=\'w-icon\'>💰</div><div class=\'w-value\'>¥4.2K</div><div class=\'w-meta\'>本月支出</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-green","html":"<div class=\'w-icon\'>🎯</div><div class=\'w-value\'>3<span class=\'w-unit\'>/8</span></div><div class=\'w-meta\'>任务完成</div>"}',
  ']}',
  "",
  "## 示例 B: 健身达人 早上 6 点（数据+进度型）",
  '{"widgets":[',
  '{"size":"2x2","wrapperClass":"w-bg-green","html":"<div class=\'w-icon\'>🔥</div><div class=\'w-value\'>327<span class=\'w-unit\'>cal</span></div><div class=\'w-meta\'>目标 500</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>🏃</div><div class=\'w-value\'>5.2<span class=\'w-unit\'>km</span></div><div class=\'w-progress\'><div class=\'w-progress-fill w-fill-green\' style=\'width:68%\'></div></div><div class=\'w-meta\'>跑步 32min</div>"},',
  '{"size":"4x2","html":"<div class=\'w-row\'><div class=\'w-icon\'>💪</div><div class=\'w-title\'>训练</div><div class=\'w-spacer\'></div><div class=\'w-tag\'>上肢</div></div><div class=\'w-body\'>卧推 4×8 · 划船 3×12</div><div class=\'w-meta\'>预计 45min</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-blue","html":"<div class=\'w-icon\'>💧</div><div class=\'w-value\'>1.2<span class=\'w-unit\'>L</span></div><div class=\'w-meta\'>目标 2.5L</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>😴</div><div class=\'w-value\'>6.5<span class=\'w-unit\'>h</span></div><div class=\'w-meta\'>深睡 2.1h</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-orange","html":"<div class=\'w-icon\'>🥗</div><div class=\'w-title\'>早餐</div><div class=\'w-action\'>记录</div>"}',
  ']}',
  "",
  "## 示例 C: 旅行者 东京下午（混合型）",
  '{"widgets":[',
  '{"size":"2x2","wrapperClass":"w-bg-blue","html":"<div class=\'w-icon\'>⛅</div><div class=\'w-value\'>22<span class=\'w-unit\'>°</span></div><div class=\'w-meta\'>东京 · 多云</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-dark","html":"<div class=\'w-icon\'>🕐</div><div class=\'w-value\'>16:05</div><div class=\'w-meta\'>北京 17:05</div>"},',
  '{"size":"4x2","html":"<div class=\'w-row\'><div class=\'w-icon\'>📍</div><div class=\'w-title\'>行程</div></div><div class=\'w-list-item\'><div class=\'w-list-time\'>16:30</div>浅草寺</div><div class=\'w-list-item\'><div class=\'w-list-time\'>18:00</div>晚餐</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-orange","html":"<div class=\'w-icon\'>💴</div><div class=\'w-value\'>¥2.8K</div><div class=\'w-meta\'>旅行花费</div>"},',
  '{"size":"2x2","html":"<div class=\'w-icon\'>🗣️</div><div class=\'w-title\'>翻译</div><div class=\'w-body\'>すみません</div><div class=\'w-meta\'>不好意思</div>"},',
  '{"size":"2x2","wrapperClass":"w-bg-green","html":"<div class=\'w-icon\'>🚶</div><div class=\'w-value\'>8.7K</div><div class=\'w-meta\'>步 · 6.1km</div>"}',
  ']}',
  "",
  "## ⚠️ 设计规则",
  "1. 每个 widget 必有 w-value 或 w-title 作为视觉焦点",
  "2. 具体数据（温度23°、¥15.9、85%、3杯、2.5km），禁止抽象",
  "3. w-value 最多 5 字符（18°、¥127、3.2km），用 K/W 缩写大数（¥4.2K 不要 ¥4,267）",
  "4. 2x2 最多 3 层：icon → value/title → meta",
  "5. 4x2 最多：title 行 + 2 条 list-item + meta",
  "6. 有 w-action 的不放 w-meta",
  "7. 每组 5-6 个，2-3 个有色底",
  "8. 用 emoji 做图标",
  "9. 风格多样化！不要全是 icon+value+meta，混合使用：",
  "   - 数字型（w-value 为主）",
  "   - 标题+正文型（w-title + w-body）",
  "   - 列表型（4x2 + list-item）",
  "   - 进度型（w-value + w-progress）",
  "   - 动作型（w-title + w-action）",
  "10. 数据要贴合场景和时间（早上→天气/通勤/早餐，晚上→总结/明日/娱乐）",
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
