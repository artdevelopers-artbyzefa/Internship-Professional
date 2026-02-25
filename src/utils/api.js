const API_BASE = import.meta.env.VITE_API_URL;

export const apiRequest = async (endpoint, options = {}) => {
    const { method = 'GET', body, headers = {} } = options;

    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        credentials: 'include',
        ...options
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 && window._handleLogout) {
                window._handleLogout();
            }
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error.message);
        throw error;
    }
};
