import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 Gen Widget 引擎。用户描述场景/用户画像，你生成 5-7 个 iOS 风格的智能小部件。",
  "",
  "## 输出格式",
  "严格 JSON，不要 markdown 代码块：",
  '{"widgets":[{"size":"2x2","html":"<div class=\'w-icon\'>🌤</div>..."}]}',
  "",
  "## 可用尺寸",
  "- 2x1：一行简短信息（通勤时间、快递状态）",
  "- 2x2：单个数据点+标题（天气、项目进度）",
  "- 4x1：横向信息条（客户反馈摘要）",
  "- 4x2：列表/多项内容（日程、训练计划）",
  "- 4x4：复杂综合内容（健康仪表板）",
  "",
  "## 可用 CSS 类",
  "### 排版",
  "- .w-icon — emoji 图标（28px，顶部）",
  "- .w-label — 小标签（11px，灰色大写，标识类别）",
  "- .w-title — 大标题（20px，粗体，主信息）",
  "- .w-value — 超大数字（42px，超细体，数据焦点）",
  "- .w-unit — 单位（18px，灰色，跟在数字后）",
  "- .w-body — 正文（14px，描述/说明）",
  "- .w-meta — 底部注释（11px，最浅灰，自动推到底部）",
  "",
  "### 颜色",
  "- .w-accent-blue / .w-accent-green / .w-accent-orange / .w-accent-red / .w-accent-purple / .w-accent-teal",
  "",
  "### 组件",
  "- .w-action — 蓝色圆角按钮（白字，用于下一步动作）",
  "- .w-action-green — 绿色按钮",
  "- .w-action-orange — 橙色按钮",
  "- .w-action-secondary — 灰底蓝字按钮",
  "- .w-progress + .w-progress-fill — 进度条（可加 -green/-orange/-red 后缀）",
  "- .w-list-item + .w-list-dot — 列表项（圆点可加 -green/-orange/-red/-purple）",
  "- .w-tag / .w-tag-blue / .w-tag-green / .w-tag-orange / .w-tag-red — 标签徽章",
  "- .w-check + .w-checkbox — 待办复选框（.w-checkbox-done = 已完成绿色）",
  "- .w-stats > .w-stat > .w-stat-label + .w-stat-value — 横排多数据",
  "",
  "## 设计铁律",
  "1. iOS 小组件美学：大留白、大字体、信息层次分明、一眼看到重点",
  "2. 每个 widget 只聚焦一个信息点，不要塞太多内容",
  "3. 数据要具体真实（具体温度 18°C、具体时间 09:30、具体地点五道口）",
  "4. 必须包含至少一个 .w-action 按钮（下一步动作）",
  "5. 混合使用不同尺寸，制造视觉节奏",
  "6. html 里允许用 style 属性微调，但优先用预定义类",
  "7. 不要包裹 <div class='widget'>，外层已有容器",
  "8. 信息是提炼后的语义，不是原始通知（说'取件码 5-203'而不是'顺丰快递通知'）",
  "9. 适当使用 emoji 增加识别度",
  "10. 生成 5-7 个 widget，2x2 和 4x2 为主力尺寸",
].join("\n");

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const apiBase =
      process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const res = await fetch(apiBase + "/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error("API " + res.status + ": " + raw.slice(0, 300));
    }

    const json = JSON.parse(raw);
    const textContent = json.content?.[0]?.text;
    if (!textContent) {
      throw new Error("No content in response");
    }

    let text = textContent.trim();
    // Strip markdown code blocks if present
    text = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Generate error:", msg);
    return NextResponse.json(
      {
        widgets: [
          {
            size: "4x1" as const,
            html:
              '<div class="w-icon">⚠️</div>' +
              '<div class="w-title">生成失败</div>' +
              '<div class="w-body">' +
              msg +
              "</div>",
          },
        ],
      },
      { status: 500 }
    );
  }
}
