import React from 'react';
import './HowToUse.css';

function HowToUse() {
    return (
        <div className="how-to-use">
            <div className="instructions-grid">
                <div className="instruction-card">
                    <h3>1️⃣ JSON to TOON</h3>
                    <ol>
                        <li>Paste your JSON data in the input area</li>
                        <li>Adjust indent size (1-8) and delimiter</li>
                        <li>Click "🚀 Convert to TOON"</li>
                        <li>See token savings and copy the result</li>
                    </ol>
                </div>

                <div className="instruction-card">
                    <h3>2️⃣ TOON to JSON</h3>
                    <ol>
                        <li>Paste your TOON formatted data</li>
                        <li>Click "🚀 Convert to JSON"</li>
                        <li>View the JSON output</li>
                        <li>Copy the result to use elsewhere</li>
                    </ol>
                </div>

                <div className="instruction-card">
                    <h3>3️⃣ Query & Analysis</h3>
                    <ol>
                        <li>Select format (JSON or TOON)</li>
                        <li>Paste your data</li>
                        <li>Ask a question about your data</li>
                        <li>Click "🔍 Analyze" to get AI-powered answers</li>
                    </ol>
                </div>
            </div>

            <div className="quick-tips">
                <h3>💡 Quick Tips</h3>
                <ul>
                    <li><strong>Token Savings:</strong> TOON typically saves 30-70% tokens compared to JSON</li>
                    <li><strong>Cost Formula:</strong> (Input Tokens ÷ 1,000,000) × $0.15 + (Output Tokens ÷ 1,000,000) × $0.60</li>
                    <li><strong>Copy Feature:</strong> Click any "📋 Copy" button for instant clipboard access</li>
                    <li><strong>Live Token Count:</strong> Token count updates automatically as you type</li>
                </ul>
            </div>
        </div>
    );
}

export default HowToUse;
