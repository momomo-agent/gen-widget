"use client";

import { useState, useRef, useEffect } from "react";

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
  const gridRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput("");
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
          ...prev,
          { id: Date.now().toString(), prompt, widgets: data.widgets },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="page">
      {/* Empty state */}
      {groups.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <div className="empty-title">Gen Widget</div>
          <div className="empty-subtitle">
            描述一个场景，AI 生成 iOS 风格的智能小部件
          </div>
        </div>
      )}

      {/* Widget grid — full width, horizontal flow */}
      <div className="widget-grid" ref={gridRef}>
        {groups.map((group, gi) => (
          <div key={group.id} style={{ display: "contents" }}>
            {group.widgets.map((w, wi) => (
              <div
                key={wi}
                className="widget widget-enter"
                data-size={w.size}
                style={{ animationDelay: `${wi * 60}ms` }}
                dangerouslySetInnerHTML={{ __html: w.html }}
              />
            ))}
          </div>
        ))}

        {/* Loading placeholders */}
        {loading && (
          <>
            <div className="widget widget-loading" data-size="2x2" />
            <div className="widget widget-loading" data-size="2x2" />
            <div className="widget widget-loading" data-size="4x2" />
            <div className="widget widget-loading" data-size="2x2" />
            <div className="widget widget-loading" data-size="2x2" />
          </>
        )}
      </div>

      {/* Floating input bar */}
      <div className="input-bar">
        <textarea
          className="input-field"
          placeholder="描述一个场景..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
        />
        <button
          type="submit"
          className="input-submit"
          disabled={!input.trim() || loading}
          onClick={handleSubmit}
        >
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
