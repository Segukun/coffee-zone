// Public configuration only. Add shared HTTP transport when API integration begins.
export const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
