import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StatusIndicator from "./components/StatusIndicator";
import JsonToToon from "./components/JsonToToon";
import ToonToJson from "./components/ToonToJson";
import QueryAnalysis from "./components/QueryAnalysis";
import HowToUse from "./components/HowToUse";
import IntroOverlay from "./components/IntroOverlay";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("json-to-toon");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("gemini_api_key") || "");
  const [langsmithKey, setLangsmithKey] = useState(localStorage.getItem("langsmith_api_key") || "");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("gemini_api_key", geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem("langsmith_api_key", langsmithKey);
  }, [langsmithKey]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <>
      <IntroOverlay />
      <div className="app-container animate-fade-in-content">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">Lexa Studio</h1>
          <p className="app-subtitle">Token Efficiency Toolkit</p>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === "json-to-toon" ? "active" : ""}`}
            onClick={() => setActiveTab("json-to-toon")}
          >
            <span className="nav-icon">📝</span>
            <span className="nav-label">JSON to TOON</span>
          </button>
          <button
            className={`nav-item ${activeTab === "toon-to-json" ? "active" : ""}`}
            onClick={() => setActiveTab("toon-to-json")}
          >
            <span className="nav-icon">🔄</span>
            <span className="nav-label">TOON to JSON</span>
          </button>
          <button
            className={`nav-item ${activeTab === "query" ? "active" : ""}`}
            onClick={() => setActiveTab("query")}
          >
            <span className="nav-icon">🤖</span>
            <span className="nav-label">Query & Analysis</span>
          </button>
          <button
            className={`nav-item ${activeTab === "how-to-use" ? "active" : ""}`}
            onClick={() => setActiveTab("how-to-use")}
          >
            <span className="nav-icon">📚</span>
            <span className="nav-label">How to Use</span>
          </button>
        </nav>

        <div className="sidebar-settings">
          <div className="settings-header">
            <span className="settings-icon">🔑</span>
            <span className="settings-label">API Settings</span>
          </div>
          <div className="api-key-input-wrapper">
            <input 
              type="password" 
              className="sidebar-api-input"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Gemini API Key..."
            />
            {geminiKey && (
              <button className="clear-api-key" onClick={() => setGeminiKey("")} title="Clear Key">
                ✕
              </button>
            )}
          </div>

          <div className="api-key-input-wrapper" style={{ marginTop: '8px' }}>
            <input 
              type="password" 
              className="sidebar-api-input"
              value={langsmithKey}
              onChange={(e) => setLangsmithKey(e.target.value)}
              placeholder="LangSmith Key (Optional)"
            />
            {langsmithKey && (
              <button className="clear-api-key" onClick={() => setLangsmithKey("")} title="Clear Key">
                ✕
              </button>
            )}
          </div>
          <p className="api-notice">Keys are stored locally in your browser.</p>
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark Mode">
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
          <StatusIndicator geminiKey={geminiKey} langsmithKey={langsmithKey} />
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h2>
            {activeTab === "json-to-toon" && "JSON to TOON Converter"}
            {activeTab === "toon-to-json" && "TOON to JSON Converter"}
            {activeTab === "query" && "AI-Powered Query & Analysis"}
            {activeTab === 'how-to-use' && '📚 How to Use Lexa Studio'}
          </h2>
          <p className="content-description">
            {activeTab === "json-to-toon" &&
              "Convert JSON to efficient TOON format and save tokens"}
            {activeTab === "toon-to-json" &&
              "Convert TOON format back to standard JSON"}
            {activeTab === "query" &&
              "Ask questions about your data using Google Gemini AI"}
            {activeTab === "how-to-use" &&
              "Learn how to use each feature to maximize token efficiency"}
          </p>
        </header>

        <div className="content-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {activeTab === "json-to-toon" && <JsonToToon />}
              {activeTab === "toon-to-json" && <ToonToJson />}
              {activeTab === "query" && <QueryAnalysis />}
              {activeTab === "how-to-use" && <HowToUse />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </>
  );
}

export default App;
