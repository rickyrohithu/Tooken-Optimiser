import { useState, useEffect } from 'react';
import { getStatus } from '../services/api';
import './StatusIndicator.css';

function StatusIndicator({ geminiKey, langsmithKey }) {
    const [status, setStatus] = useState({
        langsmith_connected: false,
        gemini_configured: false,
        loading: true,
    });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getStatus(geminiKey, langsmithKey);
                
                setStatus({ 
                    ...data, 
                    langsmith_connected: data.langsmith_connected || !!langsmithKey,
                    gemini_configured: data.gemini_configured || !!geminiKey,
                    loading: false 
                });
            } catch (error) {
                console.error('Failed to fetch status:', error);
                setStatus({
                    langsmith_connected: !!langsmithKey,
                    gemini_configured: !!geminiKey,
                    loading: false
                });
            }
        };

        fetchStatus();
    }, [geminiKey, langsmithKey]);

    if (status.loading) {
        return <div className="status-loading">Checking connection...</div>;
    }

    return (
        <div className="status-container">
            <h2>Connection Status</h2>

            <div className={`status-item ${status.langsmith_connected ? 'connected' : 'disconnected'}`}>
                <span className="status-icon">{status.langsmith_connected ? '✓' : '✗'}</span>
                <div className="status-info">
                    <span className="status-label">LangSmith</span>
                    {!status.langsmith_connected && (
                        <span className="status-hint">Optional: Set in Sidebar</span>
                    )}
                </div>
            </div>

            <div className={`status-item ${status.gemini_configured ? 'connected' : 'disconnected'}`}>
                <span className="status-icon">{status.gemini_configured ? '✓' : '✗'}</span>
                <div className="status-info">
                    <span className="status-label">Gemini AI</span>
                    {!status.gemini_configured && (
                        <span className="status-hint">Required: Set in Sidebar</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StatusIndicator;
