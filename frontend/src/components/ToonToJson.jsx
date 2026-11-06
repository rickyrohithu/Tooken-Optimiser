import { useState } from 'react';
import { convertToonToJson } from '../services/api';
import './ToonToJson.css';

function ToonToJson() {
    const [toonInput, setToonInput] = useState(`[2,]{id,name}:
  1,Apple
  2,Banana`);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleConvert = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await convertToonToJson(toonInput);
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
                    <h2>Input TOON</h2>
                    <textarea
                        className="code-input"
                        value={toonInput}
                        onChange={(e) => setToonInput(e.target.value)}
                        placeholder="Paste your TOON format here..."
                    />
                </div>

                <div className="options-section">
                    <h2>Convert</h2>

                    <button
                        className="btn-convert"
                        onClick={handleConvert}
                        disabled={loading}
                    >
                        {loading ? 'Converting...' : '🚀 Convert to JSON'}
                    </button>

                    {error && (
                        <div className="error-message">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {result && (
                        <div className="metrics">
                            <div className="metric">
                                <span className="metric-label">TOON Tokens</span>
                                <span className="metric-value toon">{result.toon_data_tokens}</span>
                            </div>
                            <div className="metric">
                                <span className="metric-label">JSON Tokens</span>
                                <span className="metric-value">{result.json_data_tokens}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {result && (
                <div className="output-section">
                    <h2>JSON Output</h2>
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

export default ToonToJson;
