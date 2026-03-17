import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
    baseURL: API_URL,
});

// Add a request interceptor to automatically attach JWT token
api.interceptors.request.use(
    (config) => {
        // Assuming token is stored in localStorage under 'userInfo'
        const userInfoString = localStorage.getItem('userInfo');
        if (userInfoString) {
            try {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo.token) {
                    config.headers.Authorization = userInfo.token;
                }
            } catch (err) {
                console.error("Error parsing userInfo from localStorage", err);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration or unauthorized access
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error(`API Error [${error.response.status}]:`, error.response.data);
            
            // If it's a 401 or 403, and we're not already on the login page
            if ((error.response.status === 401 || error.response.status === 403) && 
                !window.location.pathname.includes('/login')) {
                console.warn("Session expired or unauthorized access detected. Please log in again.");
                // We don't force redirect here to avoid potential loops, 
                // but let the components handle it via catch blocks.
            }
        } else if (error.request) {
            console.error("API Error [No Response]:", error.request);
        } else {
            console.error("API Error [Setup]:", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
