import { showToast } from './notifications.jsx';

const API_BASE = import.meta.env.VITE_API_URL;

export const apiRequest = async (endpoint, options = {}) => {
    const { method = 'GET', body, headers = {}, silent = false } = options;

    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        credentials: 'include',
        ...options
    };

    if (body && body instanceof FormData) {
        delete config.headers['Content-Type'];
    } else if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            // Robust non-JSON response handling
            if (response.ok) return { success: true };
            if (response.status === 413) {
                showToast.error("File is too large! Please try a smaller image.");
                throw new Error('Payload Too Large');
            }
            const nonJsonError = await response.text();
            throw new Error(nonJsonError || 'Server error - invalid format');
        }

        if (!response.ok) {
            if (response.status === 401 && !silent && window._handleLogout) {
                window._handleLogout();
                showToast.error("Session expired. Please login again.");
                return;
            }

            const errorMsg = data.message || 'Something went wrong';
            if (!silent) showToast.error(errorMsg);
            throw new Error(errorMsg);
        }

        return data;
    } catch (error) {
        if (!silent) {
            console.error('API Request Error:', error.message);
        }
        throw error;
    }
};
