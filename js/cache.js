const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in ms
const CACHE_KEY = 'shoe_catalog_all';

export function getCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

export function setCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch {
        console.log("localStorage might be full or unavailable")
    }
}
