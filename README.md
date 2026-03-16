# Gen Widget

AI 生成的智能小部件 — 输入场景描述，生成对应的 iOS 风格 widget。

## 特性

- 🎨 浅色毛玻璃设计，参考 iOS 小组件
- 📱 iPhone 模拟器预览
- ✨ 支持 2x1, 2x2, 4x1, 4x2, 4x4 多种尺寸
- 🤖 Claude 驱动的智能生成

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 Anthropic API Key

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000

## 使用示例

输入场景描述：
- "上班族，周一早上 8:15"
- "健身达人，周六早上 6:30"
- "旅行中，东京 Day 3"
- "外卖骑手，周六中午 11:50"

AI 会生成 2-4 个相关的智能小部件。

## 技术栈

- Next.js 15 + React 19
- Tailwind CSS 4
- Anthropic Claude API
- TypeScript

## 项目结构

```
src/app/
├── api/generate/route.ts  # LLM 生成 API
├── page.tsx               # 主页面
├── layout.tsx             # 布局
└── globals.css            # 样式（widget 组件库）
```

## License

MIT
