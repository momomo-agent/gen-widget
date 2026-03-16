"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Widget {
  size: "2x1" | "2x2" | "4x1" | "4x2" | "4x4";
  html: string;
}

interface WidgetGroup {
  id: string;
  prompt: string;
  widgets: Widget[];
}

export default function Home() {
  const [input, setInput] = useState("");
  const [groups, setGroups] = useState<WidgetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [groups, loading]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.widgets) {
        setGroups((prev) => [
          { id: Date.now().toString(), prompt, widgets: data.widgets },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter sends, Shift+Enter adds newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="main-container">
      <div className="scroll-area" ref={scrollRef}>
        {/* Empty state */}
        {groups.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <div className="empty-title">Gen Widget</div>
            <div className="empty-desc">
              描述一个场景或用户画像，AI 生成对应的智能小部件
            </div>
          </div>
        )}

        {/* Loading placeholders at top (since new content prepends) */}
        {loading && (
          <div className="widget-grid" style={{ marginBottom: 16 }}>
            <div className="widget widget-loading" data-size="2x2" />
            <div className="widget widget-loading" data-size="2x2" />
            <div className="widget widget-loading" data-size="4x1" />
            <div className="widget widget-loading" data-size="2x1" />
            <div className="widget widget-loading" data-size="2x1" />
          </div>
        )}

        {/* Widget groups — newest first */}
        {groups.map((group) => (
          <div key={group.id} className="widget-grid" style={{ marginBottom: 8 }}>
            <div className="scene-divider">
              <span className="scene-title">{group.prompt}</span>
            </div>
            {group.widgets.map((w, wi) => (
              <div
                key={wi}
                className="widget widget-enter"
                data-size={w.size}
                style={{ animationDelay: wi * 80 + "ms" }}
                dangerouslySetInnerHTML={{ __html: w.html }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Floating input bar */}
      <div className="input-bar">
        <form
          className="input-wrapper"
          onSubmit={handleSubmit}
        >
          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="描述一个场景... (Enter 发送，Shift+Enter 换行)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
          />
          <button
            type="submit"
            className="input-submit"
            disabled={!input.trim() || loading}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94l18.04-8.01a.75.75 0 0 0 0-1.37L3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
