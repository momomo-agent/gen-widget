import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 Gen Widget 引擎。用户描述场景/用户画像，你生成 5-7 个 iOS 风格的智能小部件。",
  "",
  "## 输出格式",
  "严格 JSON，不要 markdown 代码块：",
  '{"widgets":[{"size":"2x2","html":"...","wrapperClass":"w-bg-blue"}]}',
  "",
  "## 可用尺寸",
  "- 2x1：一行简短信息（通勤时间、快递状态）",
  "- 2x2：单个数据点+标题（天气、项目进度）— 最常用",
  "- 4x2：列表/多项内容（日程、训练计划）",
  "- 4x4：复杂综合内容（健康仪表板）",
  "",
  "## 背景色（wrapperClass 字段）",
  "w-bg-blue — 蓝色渐变  w-bg-green — 绿色渐变  w-bg-dark — 深色毛玻璃  w-bg-orange — 橙色渐变",
  "不加 = 白色毛玻璃。每组 2-3 个有色 widget，其余白色。",
  "",
  "## CSS 类",
  "",
  "### 排版",
  "- .w-icon — emoji 图标",
  "- .w-label — 小标签（灰色，标识类别）",
  "- .w-title — 大标题（粗体，主信息，最多5字）",
  "- .w-value — 超大数字（1-4字符：18°、¥89）",
  "- .w-value-md — 中号数字（5-8字符：¥4,267、23:42）",
  "- .w-value-sm — 小号数字（8+字符的长文本）",
  "- .w-unit — 单位（跟在数字后）",
  "- .w-body — 正文",
  "- .w-meta — 底部注释（自动推到底部）",
  "",
  "### 颜色文字",
  "- .w-accent-blue/green/orange/red/purple/teal — 强调色文字",
  "- .w-up — 绿色（涨）  .w-down — 红色（跌）",
  "",
  "### 组件",
  "- .w-action — tinted 蓝色胶囊按钮  .w-action-green — 绿色  .w-action-orange — 橙色",
  "- .w-action-secondary — 灰底蓝字按钮",
  "- .w-progress > .w-progress-fill — 进度条（可加 -green/-orange/-red）",
  "- .w-list-item > .w-list-time + text — 带时间的列表项",
  "- .w-tag / .w-tag-blue / .w-tag-green / .w-tag-orange / .w-tag-red — 标签徽章",
  "- .w-check > .w-checkbox + text — 待办复选框（.w-checkbox-done = 已完成）",
  "- .w-stats > .w-stat > .w-stat-label + .w-stat-value — 横排多数据",
  "- .w-badge — 红色角标  .w-divider — 分割线",
  "- .w-row — 横排  .w-col — 竖排  .w-spacer — 弹性占位",
  "",
  "## 设计铁律",
  "1. iOS 小组件美学：大留白、大字体、信息层次分明、一眼看到重点",
  "2. 每个 widget 只聚焦一个信息点，不要塞太多内容",
  "3. 数据要具体真实（温度 18°C、时间 09:30、地点五道口、取件码 5-203）",
  "4. 数字长度决定字号：1-4字→w-value，5-8字→w-value-md，8+字→w-value-sm",
  "5. 必须包含至少一个 .w-action 按钮（下一步动作）",
  "6. 混合使用不同尺寸和不同组件类型，制造视觉节奏和变化",
  "7. html 里不要包裹 <div class='widget'>，外层已有容器",
  "8. 信息是提炼后的语义，不是原始通知（说'取件码 5-203'而不是'顺丰快递通知'）",
  "9. 用 emoji 做图标",
  "10. 生成 5-7 个 widget，2x2 和 4x2 为主力尺寸",
  "11. 善用 w-check/w-tag/w-stats/w-progress 等丰富组件，不要总是 icon+value+meta",
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
