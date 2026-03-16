"use client";

import { useState } from "react";

interface Widget {
  size: "2x1" | "2x2" | "4x2" | "4x4";
  html: string;
  wrapperClass?: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(false);

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
        setWidgets((prev) => [...prev, ...data.widgets]);
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
      {widgets.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <div className="empty-title">Gen Widget</div>
          <div className="empty-subtitle">
            描述一个场景，生成 iOS 风格小组件
          </div>
        </div>
      )}

      {(widgets.length > 0 || loading) && (
        <div className="widget-grid">
          {widgets.map((w, i) => (
            <div
              key={i}
              className={`widget widget-enter ${w.wrapperClass || ""}`}
              data-size={w.size}
              style={{ animationDelay: `${(i % 6) * 60}ms` }}
              dangerouslySetInnerHTML={{ __html: w.html }}
            />
          ))}
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
      )}

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
