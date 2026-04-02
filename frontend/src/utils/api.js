let _showToast = null;
const getToast = async () => {
    if (!_showToast) {
        const mod = await import('./notifications.jsx');
        _showToast = mod.showToast;
    }
    return _showToast;
};

const VITE_API_URL = import.meta.env.VITE_API_URL;

const API_BASE = VITE_API_URL && VITE_API_URL !== '/api'
    ? VITE_API_URL
    : 'https://api.internshipcscuiatd.artdevelopers.site/api';

/**
 * Standardized API request utility
 * Automatically handles:
 * 1. Auth token injection
 * 2. Response parsing (JSON/Text)
 * 3. Token expiration/Logout
 * 4. Automatic error Toast notifications (if not silent)
 * 5. Retries for 500-level errors
 */
export const apiRequest = async (endpoint, options = {}, retryCount = 0) => {
    const { method = 'GET', body, headers = {}, silent = false, timeout = 60000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const token = localStorage.getItem('token');
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...headers,
        },
        credentials: 'include',
        signal: options.signal ? (AbortSignal.any ? AbortSignal.any([controller.signal, options.signal]) : options.signal) : controller.signal,
    };

    if (body && body instanceof FormData) {
        delete config.headers['Content-Type'];
        config.body = body;
    } else if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        clearTimeout(id);

        let data;
        const contentType = response.headers.get("content-type");
        if (options.responseType === 'blob') {
            data = await response.blob();
        } else if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            if (response.ok) return { success: true };
            
            // Handle payload too large
            if (response.status === 413) {
                const msg = "File/Data too large (Max 2MB)!";
                if (!silent) {
                    const toast = await getToast();
                    toast.error(msg);
                }
                const error = new Error(msg);
                error.status = 413;
                throw error;
            }

            const nonJsonError = await response.text();
            const error = new Error(nonJsonError || 'Server communication error');
            error.status = response.status;
            throw error;
        }

        if (!response.ok) {
            // Handle Session Expiration
            if (response.status === 401 && !silent && window._handleLogout) {
                window._handleLogout();
                const toast = await getToast();
                toast.error("Session expired. Please log in again.");
                return;
            }

            // Retry logic for transient server errors
            if (response.status >= 500 && retryCount < 2) {
                 return apiRequest(endpoint, options, retryCount + 1);
            }

            // Use backend-provided standardized error message
            const error = new Error(data.message || 'An unexpected error occurred');
            error.status = response.status;
            error.data = data;

            if (!silent) {
                const toast = await getToast();
                toast.error(error.message);
            }
            throw error;
        }

        return data;
    } catch (error) {
        clearTimeout(id);
        
        if (error.name === 'AbortError') {
             if (controller.signal.aborted && retryCount < 2) {
                 return apiRequest(endpoint, { ...options, timeout: timeout + 10000 }, retryCount + 1);
             }
             throw error;
        } 
        
        // Handle network/connection errors
        if (!silent && !error.status) {
            const toast = await getToast();
            toast.error("Connection failed. Please check your internet.");
        }
        
        throw error;
    }
};
