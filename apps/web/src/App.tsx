import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:3000";

interface SeoCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

interface Report {
  id: number;
  url: string;
  score: number;
  recommendation: string;
  duration_ms: number;
  created_at: string;
  checks_json: string;
}

interface AgentResult {
  url: string;
  toolResult: { score: number; checks: SeoCheck[] };
  recommendation: string;
  durationMs: number;
  savedId?: number;
}

function StatusDot({ status }: { status: SeoCheck["status"] }) {
  const color = status === "pass" ? "#3fb950" : status === "warn" ? "#d29922" : "#f85149";
  return <span className="dot" style={{ background: color }} />;
}

function App() {
  const [url, setUrl] = useState("https://example.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [aiHealthy, setAiHealthy] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/ai/health`)
      .then((r) => r.json())
      .then((d) => setAiHealthy(d.aiHealthy))
      .catch(() => setAiHealthy(false));
    loadReports();
  }, []);

  function loadReports() {
    fetch(`${API_BASE}/api/reports`)
      .then((r) => r.json())
      .then((d) => setReports(d.reports))
      .catch(() => {});
  }

  async function runAudit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveId(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Request failed");
      }
      const data = await res.json();
      setResult(data);
      setActiveId(data.savedId ?? null);
      loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoryItem(id: number) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load report");
      }
      const data = await res.json();
      const r: Report = data.report;
      setResult({
        url: r.url,
        toolResult: { score: r.score, checks: JSON.parse(r.checks_json) },
        recommendation: r.recommendation,
        durationMs: r.duration_ms,
      });
      setUrl(r.url);
      setActiveId(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    }
  }

  async function confirmDelete(id: number) {
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete report");
      }
      if (activeId === id) {
        setResult(null);
        setActiveId(null);
      }
      setConfirmDeleteId(null);
      loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete report");
    }
  }

  function exportReport() {
    if (!result) return;
    const lines = [
      `AI Growth OS - SEO Audit Report`,
      `URL: ${result.url}`,
      `Score: ${result.toolResult.score}/100`,
      `Generated in: ${(result.durationMs / 1000).toFixed(1)}s`,
      ``,
      `CHECKS`,
      `------`,
      ...result.toolResult.checks.map(
        (c) => `[${c.status.toUpperCase()}] ${c.label}: ${c.message}`
      ),
      ``,
      `AI RECOMMENDATIONS`,
      `------------------`,
      result.recommendation,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const hostname = (() => {
      try {
        return new URL(result.url).hostname;
      } catch {
        return "report";
      }
    })();
    link.download = `seo-audit-${hostname}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="terminal">
      <header className="topbar">
        <span className="brand">AI GROWTH OS</span>
        <span className={`ai-status ${aiHealthy ? "ok" : "down"}`}>
          {aiHealthy === null ? "checking..." : aiHealthy ? "● LOCAL AI ONLINE" : "○ LOCAL AI OFFLINE"}
        </span>
      </header>

      <main className="layout">
        <section className="panel audit-panel">
          <h2>SEO Audit</h2>
          <div className="input-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={loading}
            />
            <button onClick={runAudit} disabled={loading}>
              {loading ? "RUNNING..." : "RUN AUDIT"}
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}

          {loading && (
            <div className="loading-box">
              Crawling page → running SEO checks → generating AI recommendations...
              <br />
              (local 8B model, may take 20-60s)
            </div>
          )}

          {result && (
            <div className="result-box">
              <div className="score-row">
                <span className="score">{result.toolResult.score}</span>
                <span className="score-label">SEO SCORE</span>
                <span className="duration">{(result.durationMs / 1000).toFixed(1)}s</span>
                <button className="export-btn" onClick={exportReport}>
                  EXPORT
                </button>
              </div>

              <div className="checks-grid">
                {result.toolResult.checks.map((c) => (
                  <div className="check-row" key={c.id}>
                    <StatusDot status={c.status} />
                    <span className="check-label">{c.label}</span>
                    <span className="check-message">{c.message}</span>
                  </div>
                ))}
              </div>

              <div className="recommendation-box">
                <h3>AI Recommendations</h3>
                <p>{result.recommendation}</p>
              </div>
            </div>
          )}
        </section>

        <section className="panel history-panel">
          <h2>Audit History</h2>
          <div className="history-list">
            {reports.length === 0 && <div className="empty">No audits yet</div>}
            {reports.map((r) => (
              <div key={r.id} className={`history-row ${activeId === r.id ? "active" : ""}`}>
                {confirmDeleteId === r.id ? (
                  <div className="confirm-row">
                    <span className="confirm-text">Delete this audit?</span>
                    <button className="confirm-yes" onClick={() => confirmDelete(r.id)}>
                      YES
                    </button>
                    <button className="confirm-no" onClick={() => setConfirmDeleteId(null)}>
                      NO
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="history-score" onClick={() => loadHistoryItem(r.id)}>
                      {r.score}
                    </span>
                    <span className="history-url" onClick={() => loadHistoryItem(r.id)}>
                      {r.url}
                    </span>
                    <span className="history-time" onClick={() => loadHistoryItem(r.id)}>
                      {new Date(r.created_at + "Z").toLocaleTimeString()}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(r.id);
                      }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
