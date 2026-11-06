import { useState } from 'react';
import { convertJsonToToon } from '../services/api';
import './JsonToToon.css';

function JsonToToon() {
    const [jsonInput, setJsonInput] = useState(`{
  "name": "Alice",
  "age": 30,
  "items": [
    {"id": 1, "name": "Apple"},
    {"id": 2, "name": "Banana"}
  ]
}`);
    const [indent, setIndent] = useState(2);
    const [delimiter, setDelimiter] = useState(',');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleConvert = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await convertJsonToToon(jsonInput, indent, delimiter);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(result.output);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            setError('Failed to copy to clipboard');
        }
    };

    return (
        <div className="converter-container">
            <div className="converter-main">
                <div className="input-section">
                    <h2>Input JSON</h2>
                    <textarea
                        className="code-input"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Paste your JSON here..."
                    />
                </div>

                <div className="options-section">
                    <h2>Options</h2>
                    <div className="option-group">
                        <label>
                            Indent Size
                            <input
                                type="number"
                                min="1"
                                max="8"
                                value={indent}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    if (!isNaN(value) && value >= 1 && value <= 8) {
                                        setIndent(value);
                                    }
                                }}
                            />
                        </label>

                        <label>
                            Delimiter
                            <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                                <option value=",">Comma (,)</option>
                                <option value="\t">Tab (\t)</option>
                                <option value="|">Pipe (|)</option>
                            </select>
                        </label>
                    </div>

                    <button
                        className="btn-convert"
                        onClick={handleConvert}
                        disabled={loading}
                    >
                        {loading ? 'Converting...' : '🚀 Convert to TOON'}
                    </button>

                    {error && (
                        <div className="error-message">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {result && (
                        <div className="metrics">
                            <div className="metric">
                                <span className="metric-label">JSON Tokens</span>
                                <span className="metric-value">{result.json_data_tokens}</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">TOON Tokens</span>
                                <span className="metric-value toon">{result.toon_data_tokens}</span>
                            </div>
                            <div className="metric highlight">
                                <span className="metric-label">Savings</span>
                                <span className="metric-value savings">
                                    {result.savings} ({result.savings_percent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {result && (
                <div className="output-section">
                    <h2>TOON Output</h2>
                    <pre className="code-output">{result.output}</pre>
                    <button
                        className="btn-copy"
                        onClick={handleCopy}
                    >
                        {copied ? '✓ Copied successfully' : '📋 Copy to Clipboard'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default JsonToToon;
