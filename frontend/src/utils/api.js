import { showToast } from './notifications.jsx';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const API_BASE = VITE_API_URL && VITE_API_URL !== '/api'
    ? VITE_API_URL
    : 'https://api.internshipcscuiatd.artdevelopers.site/api';

export const apiRequest = async (endpoint, options = {}, retryCount = 0) => {
    const { method = 'GET', body, headers = {}, silent = false, timeout = 25000 } = options;

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
        signal: controller.signal,
        ...options
    };

    if (body && body instanceof FormData) {
        delete config.headers['Content-Type'];
    } else if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        clearTimeout(id);

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            if (response.ok) return { success: true };
            if (response.status === 413) {
                const error = new Error("Request payload too large (Max 2MB)!");
                error.status = 413;
                showToast.error(error.message);
                throw error;
            }
            const nonJsonError = await response.text();
            const error = new Error(nonJsonError || 'Server error - invalid format');
            error.status = response.status;
            throw error;
        }

        if (!response.ok) {
            if (response.status === 401 && !silent && window._handleLogout) {
                window._handleLogout();
                showToast.error("Session expired. Please login again.");
                return;
            }
            if (response.status >= 500 && retryCount < 2) {
                 console.warn(`[RETRY] Server error ${response.status}. Retrying ${retryCount + 1}/2...`);
                 return apiRequest(endpoint, options, retryCount + 1);
            }

            const error = new Error(data.message || 'Something went wrong');
            error.status = response.status;
            error.data = data;
            if (!silent) showToast.error(error.message);
            throw error;
        }

        return data;
    } catch (error) {
        clearTimeout(id);
        
        if (error.name === 'AbortError') {
             if (retryCount < 2) {
                 console.warn(`[TIMEOUT] Request to ${endpoint} timed out. Retrying ${retryCount + 1}/2...`);
                 return apiRequest(endpoint, { ...options, timeout: timeout + 5000 }, retryCount + 1);
             }
             if (!silent) showToast.error("Network slow. Please try again later.");
        } else if (!silent) {
            console.error('Issue communicating with the system endpoint.');
        }
        throw error;
    }
};
