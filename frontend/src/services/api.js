const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API Service for backend communication
class ApiService {
    async get(endpoint, headers = {}) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async post(endpoint, data) {
        const geminiKey = localStorage.getItem('gemini_api_key');
        const langsmithKey = localStorage.getItem('langsmith_api_key');
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (geminiKey) headers['X-Gemini-API-Key'] = geminiKey;
        if (langsmithKey) headers['X-LangSmith-API-Key'] = langsmithKey;

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch {
                // Non-JSON response from server/proxy
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    }
}

const api = new ApiService();

// API Methods
export const getStatus = (geminiKey, langsmithKey) => {
    const headers = {};
    if (geminiKey) headers['X-Gemini-API-Key'] = geminiKey;
    if (langsmithKey) headers['X-LangSmith-API-Key'] = langsmithKey;
    
    return api.get('/api/status', headers);
};

export const getHealth = () => api.get('/api/health');

export const convertJsonToToon = (jsonInput, indent = 2, delimiter = ',') =>
    api.post('/api/convert/json-to-toon', {
        json_input: jsonInput,
        indent,
        delimiter,
    });

export const convertToonToJson = (toonInput) =>
    api.post('/api/convert/toon-to-json', {
        toon_input: toonInput,
    });

export const queryData = (dataText, question, dataFormat) =>
    api.post('/api/query', {
        data_text: dataText,
        question,
        data_format: dataFormat,
    });

export const countTokens = (text) =>
    api.post('/api/count', { text });

/**
 * WebSocket streaming query
 * @param {string} dataText 
 * @param {string} question 
 * @param {string} dataFormat 
 * @param {Object} callbacks - { onMetadata, onDelta, onFinal, onError, onClose }
 * @returns {WebSocket}
 */
export const queryDataStream = (dataText, question, dataFormat, callbacks) => {
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/query';
    const ws = new WebSocket(wsUrl);
    const geminiKey = localStorage.getItem('gemini_api_key');
    const langsmithKey = localStorage.getItem('langsmith_api_key');

    ws.onopen = () => {
        ws.send(JSON.stringify({
            data_text: dataText,
            question,
            data_format: dataFormat,
            api_key: geminiKey,
            langsmith_key: langsmithKey // Send optional LangSmith key
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle direct error response
        if (data.error && callbacks.onError) {
            callbacks.onError(data.error);
            ws.close();
            return;
        }

        if (data.type === 'metadata' && callbacks.onMetadata) callbacks.onMetadata(data);
        if (data.type === 'content' && callbacks.onDelta) callbacks.onDelta(data.delta);
        if (data.type === 'final' && callbacks.onFinal) callbacks.onFinal(data);
        if (data.type === 'error' && callbacks.onError) {
            callbacks.onError(data.message);
            ws.close();
        }
    };

    ws.onerror = () => {
        if (callbacks.onError) callbacks.onError('WebSocket connection error');
    };

    ws.onclose = () => {
        if (callbacks.onClose) callbacks.onClose();
    };

    return ws;
};

export default api;
