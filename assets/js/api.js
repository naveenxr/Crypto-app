const API_BASE = 'https://api.coingecko.com/api/v3';

// Cache to handle rate limits and improve performance
const cache = new Map();

async function fetchAPI(endpoint, cacheTime = 60000) {
    if (cache.has(endpoint)) {
        const cachedData = cache.get(endpoint);
        if (Date.now() - cachedData.time < cacheTime) {
            return cachedData.data;
        }
    }

    try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        cache.set(endpoint, { data, time: Date.now() });
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

// Get top coins by market cap
async function getTopCoins(page = 1, perPage = 50) {
    const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=24h,7d`;
    return await fetchAPI(endpoint, 60000); // 1 min cache
}

// Get trending coins (for index ticker and initial list)
async function getTrendingCoins() {
    const data = await fetchAPI('/search/trending', 300000); // 5 min cache
    return data ? data.coins.map(item => item.item) : [];
}

// Search coins
async function searchCoins(query) {
    const data = await fetchAPI(`/search?query=${query}`);
    return data ? data.coins : [];
}

// Get coin details
async function getCoinDetails(id) {
    return await fetchAPI(`/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`, 60000);
}

// Get coin market chart
async function getCoinChart(id, days = 7) {
    return await fetchAPI(`/coins/${id}/market_chart?vs_currency=usd&days=${days}`, 300000);
}
