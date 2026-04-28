document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-page-form');
    const searchInput = document.getElementById('search-page-input');
    const resultsContainer = document.getElementById('search-results');
    const loadingIndicator = document.getElementById('loading');
    const searchTitle = document.getElementById('search-title');

    // Check for query param
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');

    if (queryParam) {
        searchInput.value = queryParam;
        performSearch(queryParam);
    } else {
        resultsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; opacity: 0.7;">Enter a cryptocurrency name to search...</p>';
    }

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            // Update URL without reloading
            const url = new URL(window.location);
            url.searchParams.set('q', query);
            window.history.pushState({}, '', url);
            
            performSearch(query);
        }
    });

    async function performSearch(query) {
        resultsContainer.innerHTML = '';
        loadingIndicator.style.display = 'flex';
        searchTitle.innerHTML = `Search Results for "${query}"`;

        const coins = await searchCoins(query);
        
        loadingIndicator.style.display = 'none';

        if (!coins || coins.length === 0) {
            resultsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; opacity: 0.7;">No cryptocurrencies found matching your query.</p>';
            return;
        }

        renderSearchResults(coins);
    }

    function renderSearchResults(coins) {
        let gridHTML = '';

        coins.forEach(coin => {
            const isFav = isFavorite(coin.id);
            
            gridHTML += `
                <div class="crypto-card glass-card">
                    <div class="card-header">
                        <div class="coin-info-short">
                            <img src="${coin.large}" alt="${coin.name}" class="coin-icon">
                            <div>
                                <div class="coin-name">${coin.name}</div>
                                <div class="coin-symbol">${coin.symbol}</div>
                            </div>
                        </div>
                        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.preventDefault(); toggleFavFromCard('${coin.id}', this)" aria-label="Favorite">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="card-price">Rank #${coin.market_cap_rank || 'N/A'}</div>
                    <a href="coin.html?id=${coin.id}" class="btn-more mt-4">More Info</a>
                </div>
            `;
        });

        resultsContainer.innerHTML = gridHTML;
    }
});

// Global function for favorite toggle
window.toggleFavFromCard = function(coinId, btnElement) {
    const isNowFav = toggleFavorite(coinId);
    if (isNowFav) {
        btnElement.classList.add('active');
    } else {
        btnElement.classList.remove('active');
    }
}
