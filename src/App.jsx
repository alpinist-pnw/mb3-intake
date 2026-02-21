import { useState, useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { SECTIONS } from "./questions";
import { buildScopeDoc } from "./export";

// ── Textarea: manages its own local state so typing is never interrupted ──────
function Textarea({ qId, remoteValue, onChange, placeholder, small }) {
  const [local, setLocal] = useState(remoteValue || "");
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(remoteValue || "");
  }, [remoteValue]);

  return (
    <textarea
      value={local}
      placeholder={placeholder || "Type your answer here…"}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; onChange(qId, local); }}
      onChange={e => { setLocal(e.target.value); onChange(qId, e.target.value); }}
      style={{
        width: "100%", background: "#161B22",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4,
        padding: "0.75rem 0.9rem", color: "#F0F4F8",
        fontFamily: "'Barlow', 'Segoe UI', sans-serif",
        fontSize: small ? "0.82rem" : "0.88rem",
        resize: "vertical", minHeight: small ? 60 : 90,
        lineHeight: 1.6, outline: "none",
        transition: "border-color 0.2s",
      }}
      onFocusCapture={e => { e.target.style.borderColor = "#E8600A"; }}
      onBlurCapture={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
    />
  );
}

// ── Option button for radio/priority fields ───────────────────────────────────
function OptionBtn({ label, selected, color, isRadio, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left",
      background: selected ? `${color}15` : "#1C2330",
      border: `1px solid ${selected ? `${color}50` : "rgba(255,255,255,0.06)"}`,
      borderRadius: 4, padding: "0.6rem 0.9rem",
      color: selected ? "#F0F4F8" : "#8BA3BC",
      fontSize: "0.85rem", cursor: "pointer",
      transition: "all 0.15s", marginBottom: "0.32rem",
      display: "flex", alignItems: "center",
    }}>
      <span style={{
        display: "inline-block", width: 13, height: 13, marginRight: "0.65rem",
        borderRadius: isRadio ? "50%" : 2,
        border: `2px solid ${selected ? color : "#2A3F52"}`,
        background: selected ? color : "transparent",
        flexShrink: 0, transition: "all 0.15s",
      }} />
      {label}
    </button>
  );
}

// ── Join screen ───────────────────────────────────────────────────────────────
function JoinScreen({ onJoin }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const join = () => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 3) { setErr("Code must be at least 3 characters."); return; }
    onJoin(clean);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Barlow', 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ display: "inline-block", fontFamily: "monospace", fontWeight: 800, fontSize: "0.88rem", letterSpacing: "0.1em", color: "#E8600A", background: "rgba(232,96,10,0.1)", border: "1px solid rgba(232,96,10,0.28)", borderRadius: 3, padding: "0.22rem 0.7rem", marginBottom: "1.4rem" }}>MB3 DESIGN</div>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif", fontWeight: 800, fontSize: "2.4rem", color: "#F0F4F8", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.05, marginBottom: "0.8rem" }}>
          Strategic<br /><span style={{ color: "#E8600A" }}>Alignment</span>
        </h1>
        <p style={{ color: "#4A6070", fontSize: "0.84rem", lineHeight: 1.65, marginBottom: "1.8rem" }}>
          Enter the session code to open the live document.<br />
          Both participants use the same code — no account needed.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            value={code} autoFocus
            onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && join()}
            placeholder="MAUGHAN1"
            maxLength={12}
            style={{ flex: 1, background: "#161B22", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "0.75rem 1rem", color: "#F0F4F8", fontFamily: "monospace", fontSize: "1.05rem", letterSpacing: "0.15em", textTransform: "uppercase", outline: "none" }}
          />
          <button onClick={join} style={{ background: "#E8600A", border: "none", borderRadius: 4, padding: "0.75rem 1.3rem", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            Join →
          </button>
        </div>
        {err && <p style={{ color: "#DC2626", fontSize: "0.76rem" }}>{err}</p>}
        <p style={{ color: "#2A3F52", fontSize: "0.68rem", fontFamily: "monospace", marginTop: "1rem", lineHeight: 1.6 }}>
          Answers save automatically · Updates sync live to all participants
        </p>
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activeSection, setActiveSection] = useState(0);
  const [syncStatus, setSyncStatus] = useState("connecting");
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimers = useRef({});

  // ── Real-time Firestore listener ──
  useEffect(() => {
    if (!sessionId) return;
    setSyncStatus("connecting");
    const docRef = doc(db, "sessions", sessionId);
    const unsub = onSnapshot(
      docRef,
      snapshot => {
        setAnswers(snapshot.data()?.answers || {});
        setSyncStatus("live");
      },
      () => setSyncStatus("error")
    );
    return () => unsub();
  }, [sessionId]);

  // ── Write to Firestore, debounced ──
  const handleChange = useCallback((qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setSyncStatus("saving");
    if (saveTimers.current[qId]) clearTimeout(saveTimers.current[qId]);
    saveTimers.current[qId] = setTimeout(async () => {
      try {
        const docRef = doc(db, "sessions", sessionId);
        await setDoc(docRef, { answers: { [qId]: value } }, { merge: true });
        setSyncStatus("live");
      } catch { setSyncStatus("error"); }
    }, 500);
  }, [sessionId]);

  const section = SECTIONS[activeSection];
  const allQs = SECTIONS.flatMap(s => s.questions);
  const answered = allQs.filter(q => answers[q.id]).length;
  const pct = Math.round((answered / allQs.length) * 100);

  const exportDoc = () => {
    const blob = new Blob([buildScopeDoc(answers, sessionId)], { type: "text/plain" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `MB3_Scope_${sessionId}.txt` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const copyDoc = () => {
    navigator.clipboard.writeText(buildScopeDoc(answers, sessionId));
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  if (!sessionId) return <JoinScreen onJoin={setSessionId} />;

  const syncColor = syncStatus === "live" ? "#059669" : syncStatus === "saving" ? "#D97706" : syncStatus === "error" ? "#DC2626" : "#4A6070";
  const syncLabel = syncStatus === "live" ? `● live · ${sessionId}` : syncStatus === "saving" ? "● saving…" : syncStatus === "error" ? "✗ error" : "○ connecting…";

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#F0F4F8", fontFamily: "'Barlow', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0A; }
        textarea::placeholder { color: #2A3F52 !important; }
        input::placeholder { color: #2A3F52 !important; }
        button:focus { outline: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .q-block { animation: fadeUp 0.3s ease both; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #1C2330; border-radius: 2px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#111418", borderBottom: "2px solid #E8600A", padding: "0.8rem 1.8rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#E8600A", background: "rgba(232,96,10,0.1)", border: "1px solid rgba(232,96,10,0.28)", borderRadius: 3, padding: "0.15rem 0.5rem", fontSize: "0.82rem", letterSpacing: "0.08em" }}>MB3</span>
          <span style={{ color: "#2A3F52" }}>×</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#8BA3BC", letterSpacing: "0.06em", textTransform: "uppercase" }}>Maughan Strategic Alignment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 80, height: 4, background: "#1C2330", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#E8600A", borderRadius: 2, transition: "width 0.4s ease" }} />
            </div>
            <span style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "#4A6070" }}>{answered}/{allQs.length}</span>
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "0.62rem", color: syncColor, whiteSpace: "nowrap" }}>{syncLabel}</span>
          <button onClick={() => setShowExport(true)} style={{ background: "rgba(232,96,10,0.12)", border: "1px solid rgba(232,96,10,0.28)", borderRadius: 3, padding: "0.3rem 0.75rem", color: "#E8600A", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            Export →
          </button>
        </div>
      </div>

      {/* SECTION TABS */}
      <div style={{ background: "#0E1318", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", overflowX: "auto", padding: "0 1.5rem", flexShrink: 0 }}>
        {SECTIONS.map((s, i) => {
          const n = s.questions.filter(q => answers[q.id]).length;
          const active = activeSection === i;
          return (
            <button key={s.id} onClick={() => setActiveSection(i)} style={{
              padding: "0.72rem 1rem", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: "0.76rem", letterSpacing: "0.06em", textTransform: "uppercase",
              color: active ? s.color : "#4A6070", border: "none",
              borderBottom: `2px solid ${active ? s.color : "transparent"}`,
              background: "transparent", cursor: "pointer", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: "0.4rem", transition: "color 0.18s",
            }}>
              {s.label}
              {n > 0 && <span style={{ fontFamily: "monospace", fontSize: "0.52rem", color: s.color, background: `${s.color}18`, padding: "0.08rem 0.3rem", borderRadius: 2 }}>{n}/{s.questions.length}</span>}
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 700, width: "100%", margin: "0 auto", padding: "2rem 1.8rem 8rem", flex: 1 }}>
        {/* Section heading */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontFamily: "monospace", fontSize: "0.6rem", color: section.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>{section.label}</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.85rem", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1 }}>{section.title}</h2>
          <div style={{ height: 2, width: 44, background: section.color, borderRadius: 1, marginTop: "0.6rem" }} />
        </div>

        {/* Questions */}
        {section.questions.map((q, qi) => (
          <div key={q.id} className="q-block" style={{ marginBottom: "1.8rem", animationDelay: `${qi * 0.05}s` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.55rem" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#F0F4F8", marginBottom: "0.15rem" }}>{q.label}</div>
                <div style={{ fontSize: "0.74rem", color: "#4A6070", fontStyle: "italic" }}>{q.hint}</div>
              </div>
              {answers[q.id] && <span style={{ fontFamily: "monospace", fontSize: "0.56rem", color: "#059669", background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 2, padding: "0.1rem 0.38rem", whiteSpace: "nowrap", flexShrink: 0 }}>✓</span>}
            </div>

            {q.type === "textarea" && (
              <Textarea qId={q.id} remoteValue={answers[q.id]} onChange={handleChange} />
            )}

            {(q.type === "radio" || q.type === "priority") && (
              <div>
                {q.options.map(opt => (
                  <OptionBtn key={opt} label={opt} selected={answers[q.id] === opt}
                    color={section.color} isRadio={q.type === "radio"}
                    onClick={() => handleChange(q.id, answers[q.id] === opt ? "" : opt)} />
                ))}
              </div>
            )}

            {q.type === "priority" && q.notes_id && (
              <div style={{ marginTop: "0.5rem" }}>
                <Textarea qId={q.notes_id} remoteValue={answers[q.notes_id]} onChange={handleChange} placeholder={q.notes_hint} small />
              </div>
            )}
          </div>
        ))}

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "1rem" }}>
          <button onClick={() => setActiveSection(i => Math.max(0, i - 1))} disabled={activeSection === 0}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.5rem 1.1rem", borderRadius: 3, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: activeSection === 0 ? "#1C2330" : "#8BA3BC", cursor: activeSection === 0 ? "not-allowed" : "pointer" }}>
            ← Back
          </button>
          {activeSection < SECTIONS.length - 1 ? (
            <button onClick={() => setActiveSection(i => i + 1)}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.5rem 1.2rem", borderRadius: 3, border: "none", background: section.color, color: "#fff", cursor: "pointer" }}>
              Next →
            </button>
          ) : (
            <button onClick={() => setShowExport(true)}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.5rem 1.2rem", borderRadius: 3, border: "none", background: "#059669", color: "#fff", cursor: "pointer" }}>
              Export Scope Doc →
            </button>
          )}
        </div>
      </div>

      {/* EXPORT MODAL */}
      {showExport && (
        <div onClick={() => setShowExport(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111418", border: "1px solid rgba(255,255,255,0.1)", borderTop: "3px solid #E8600A", borderRadius: 8, padding: "2rem", maxWidth: 520, width: "100%" }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>Export Scope Document</h3>
            <p style={{ color: "#4A6070", fontSize: "0.8rem", marginBottom: "1.2rem" }}>Formatted text — paste into Word, email, or your SOW template.</p>
            <pre style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "0.9rem", fontFamily: "monospace", fontSize: "0.62rem", color: "#4A6070", lineHeight: 1.8, maxHeight: 200, overflowY: "auto", marginBottom: "1.2rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {buildScopeDoc(answers, sessionId).substring(0, 600)}…
            </pre>
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.7rem" }}>
              <button onClick={exportDoc} style={{ flex: 1, background: "#E8600A", border: "none", borderRadius: 3, padding: "0.65rem", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>↓ Download</button>
              <button onClick={copyDoc} style={{ flex: 1, background: copied ? "#059669" : "#1C2330", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3, padding: "0.65rem", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            </div>
            <button onClick={() => setShowExport(false)} style={{ width: "100%", background: "transparent", border: "none", color: "#2A3F52", fontFamily: "monospace", fontSize: "0.62rem", cursor: "pointer", padding: "0.3rem" }}>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
