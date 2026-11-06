import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { queryDataStream } from '../services/api';
import TokenStack from './TokenStack';
import './QueryAnalysis.css';

// Gemini 2.0/2.5 Flash Pricing
const GEMINI_PRICING = {
    INPUT_PER_MILLION: 0.15,
    OUTPUT_PER_MILLION: 0.60,
};

const calculateCost = (inputTokens, outputTokens) => {
    const cost =
        (inputTokens / 1_000_000) * GEMINI_PRICING.INPUT_PER_MILLION +
        (outputTokens / 1_000_000) * GEMINI_PRICING.OUTPUT_PER_MILLION;
    return cost.toFixed(6);
};

function QueryAnalysis() {
    const [dataFormat, setDataFormat] = useState('JSON');
    const [dataInput, setDataInput] = useState('[{"id": 1, "name": "Alice", "age": 30}, {"id": 2, "name": "Bob", "age": 25}]');
    const [question, setQuestion] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [answer, setAnswer] = useState('');
    const [metadata, setMetadata] = useState(null);
    const [finalStats, setFinalStats] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('query_history');
        return saved ? JSON.parse(saved) : [];
    });
    
    const abortControllerRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('query_history', JSON.stringify(history));
    }, [history]);

    const addToHistory = (item) => {
        setHistory(prev => {
            const newHistory = [item, ...prev].slice(0, 10);
            return newHistory;
        });
    };

    const handleAnalyze = () => {
        if (!question.trim()) {
            setError('Please enter a question');
            return;
        }
        if (!dataInput.trim()) {
            setError('Please provide data to analyze');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnswer('');
        setMetadata(null);
        setFinalStats(null);

        const callbacks = {
            onMetadata: (data) => setMetadata(data),
            onDelta: (delta) => setAnswer(prev => prev + delta),
            onFinal: (stats) => {
                setAnswer(stats.answer); // Ensure final answer is set
                setFinalStats(stats);
                setIsAnalyzing(false);
                addToHistory({
                    id: Date.now(),
                    question,
                    format: dataFormat,
                    timestamp: new Date().toLocaleTimeString(),
                    answer: stats.answer,
                    stats,
                    metadata: {
                        json_data_tokens: metadata?.json_data_tokens || 0,
                        toon_data_tokens: metadata?.toon_data_tokens || 0,
                        prompt_tokens: metadata?.prompt_tokens || 0
                    }
                });
            },
            onError: (err) => {
                setError(err);
                setIsAnalyzing(false);
            },
            onClose: () => setIsAnalyzing(false)
        };

        abortControllerRef.current = queryDataStream(dataInput, question, dataFormat, callbacks);
    };

    const handleExampleClick = (q) => setQuestion(q);
    
    const loadFromHistory = (item) => {
        setQuestion(item.question);
        setDataFormat(item.format);
        setAnswer(item.answer);
        setFinalStats(item.stats);
        setMetadata(item.metadata);
    };

    return (
        <div className="query-container">
            <div className="query-main">
                <div className="data-section">
                    <h3>📊 Input Data</h3>
                    <div className="format-selector-top">
                        <label className={`format-option ${dataFormat === 'JSON' ? 'active' : ''}`}>
                            <input type="radio" value="JSON" checked={dataFormat === 'JSON'} onChange={() => setDataFormat('JSON')} />
                            JSON
                        </label>
                        <label className={`format-option ${dataFormat === 'TOON' ? 'active' : ''}`}>
                            <input type="radio" value="TOON" checked={dataFormat === 'TOON'} onChange={() => setDataFormat('TOON')} />
                            TOON
                        </label>
                    </div>
                    <div className="input-wrapper">
                        <textarea 
                            className="code-input"
                            value={dataInput}
                            onChange={(e) => setDataInput(e.target.value)}
                            placeholder={`Paste your ${dataFormat} data here...`}
                        />
                    </div>
                </div>

                <div className="question-section">
                    <h3>🤖 Ask Gemini</h3>
                    <div className="input-wrapper">
                        <input 
                            type="text" 
                            className="question-input"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="What would you like to know?"
                            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                    </div>
                    
                    <div className="examples">
                        <span className="examples-label">Try these:</span>
                        <div className="example-buttons">
                            <button className="btn-example" onClick={() => handleExampleClick("Summarize this data")}>Summarize</button>
                            <button className="btn-example" onClick={() => handleExampleClick("Key trends?")}>Trends</button>
                        </div>
                    </div>

                    <button 
                        className="btn-analyze" 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !dataInput.trim() || !question.trim()}
                    >
                        {isAnalyzing ? "🤔 Analyzing..." : "🔍 Analyze Data"}
                    </button>

                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="error-message"
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {history.length > 0 && (
                        <div className="history-section">
                            <span className="examples-label">Recent History:</span>
                            <div className="history-list">
                                {history.map(item => (
                                    <button key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
                                        <span className="history-q">{item.question}</span>
                                        <span className="history-time">{item.timestamp}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {(answer || isAnalyzing) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="results-section"
                        >
                            <div className="answer-box">
                                <h3>AI Response</h3>
                                <div className="answer-content">
                                    {answer}
                                    {isAnalyzing && <span className="typing-cursor">|</span>}
                                </div>
                            </div>

                            {metadata && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="token-analysis-container"
                                >
                                    <div className="analysis-header">
                                        <h4>Efficiency Comparison</h4>
                                        <p className="analysis-subtitle">How TOON format affects your token usage</p>
                                    </div>
                                    
                                    <TokenStack 
                                        jsonTokens={metadata.json_data_tokens}
                                        toonTokens={metadata.toon_data_tokens}
                                    />

                                    <div className="breakdown-grid">
                                        <div className="breakdown-item">
                                            <span className="label">JSON Input tokens</span>
                                            <span className="value">{metadata.json_data_tokens}</span>
                                        </div>
                                        <div className="breakdown-item toon">
                                            <span className="label">TOON Input tokens</span>
                                            <span className="value">{metadata.toon_data_tokens}</span>
                                        </div>
                                        {finalStats && (
                                            <>
                                                <div className="breakdown-item total">
                                                    <span className="label">Total Tokens (In + Out)</span>
                                                    <span className="value">{finalStats.total_llm_tokens}</span>
                                                </div>
                                                <div className="breakdown-item cost">
                                                    <span className="label">Estimated Cost</span>
                                                    <span className="value">${calculateCost(metadata.prompt_tokens, finalStats.completion_tokens)}</span>
                                                </div>
                                                <div className="breakdown-item">
                                                    <span className="label">Execution Time</span>
                                                    <span className="value">{finalStats.exec_ms}ms</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default QueryAnalysis;
