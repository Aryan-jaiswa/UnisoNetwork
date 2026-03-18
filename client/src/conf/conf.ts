const conf = {
    // API configuration
    apiBaseUrl: String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'),
}

export default conf;