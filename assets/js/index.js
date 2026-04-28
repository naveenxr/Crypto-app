document.addEventListener('DOMContentLoaded', async () => {
    const tickerContainer = document.getElementById('crypto-ticker');
    const tableBody = document.getElementById('market-table-body');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const loadMoreBtn = document.getElementById('load-more-btn');

    let currentPage = 1;
    let sparklines = [];

    // Handle search submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    });

    // Load trending coins for ticker
    getTrendingCoins().then(trending => {
        if (trending && trending.length > 0) {
            renderTicker(trending);
        }
    });

    // Load initial table data
    await loadTableData();

    // Handle Load More
    loadMoreBtn.addEventListener('click', async () => {
        currentPage++;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        loadMoreBtn.disabled = true;
        await loadTableData(true);
        loadMoreBtn.innerHTML = 'Load More';
        loadMoreBtn.disabled = false;
    });

    function renderTicker(coins) {
        let tickerHTML = '';
        const displayCoins = [...coins, ...coins];
        
        displayCoins.forEach(coin => {
            const priceHtml = coin.data && coin.data.price ? 
                `<span>$${parseFloat(coin.data.price.toFixed(4))}</span>` : '';
            
            tickerHTML += `
                <a href="coin.html?id=${coin.id}" class="ticker-item">
                    <img src="${coin.small}" alt="${coin.name}">
                    ${coin.symbol.toUpperCase()}
                    ${priceHtml}
                </a>
            `;
        });
        
        tickerContainer.innerHTML = tickerHTML;
    }

    async function loadTableData(append = false) {
        if (!append) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 3rem;"><div class="loader-container"><div class="loader"></div></div></td></tr>';
        }

        const coins = await getTopCoins(currentPage, 50);
        
        if (!coins || coins.length === 0) {
            if (!append) tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Failed to load market data. Please try again later.</td></tr>';
            return;
        }

        if (!append) {
            tableBody.innerHTML = '';
        }

        renderTableRows(coins);
    }

    function renderTableRows(coins) {
        coins.forEach((coin, index) => {
            const tr = document.createElement('tr');
            tr.onclick = (e) => {
                // Prevent navigation if clicking on favorite button
                if (e.target.closest('.fav-btn')) return;
                window.location.href = `coin.html?id=${coin.id}`;
            };
            
            const isFav = isFavorite(coin.id);
            const rank = (currentPage - 1) * 50 + index + 1;
            
            const price = coin.current_price ? `$${formatNumber(coin.current_price)}` : 'N/A';
            const change24h = coin.price_change_percentage_24h;
            const change7d = coin.price_change_percentage_7d_in_currency;
            
            const change24hHtml = change24h ? 
                `<span class="${change24h >= 0 ? 'price-up' : 'price-down'}">${change24h >= 0 ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>'} ${Math.abs(change24h).toFixed(2)}%</span>` : '-';
                
            const change7dHtml = change7d ? 
                `<span class="${change7d >= 0 ? 'price-up' : 'price-down'}">${change7d >= 0 ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>'} ${Math.abs(change7d).toFixed(2)}%</span>` : '-';

            const mcap = coin.market_cap ? `$${formatCompactNumber(coin.market_cap)}` : '-';
            const vol = coin.total_volume ? `$${formatCompactNumber(coin.total_volume)}` : '-';

            // Sparkline canvas ID
            const canvasId = `sparkline-${coin.id}-${Date.now()}`;

            tr.innerHTML = `
                <td>
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavFromCard('${coin.id}', this)" aria-label="Favorite">
                        <i class="fas fa-star"></i>
                    </button>
                </td>
                <td style="opacity: 0.6; font-weight: 600;">${rank}</td>
                <td>
                    <div class="table-coin-info">
                        <img src="${coin.image}" alt="${coin.name}">
                        <span class="table-coin-name">${coin.name}</span>
                        <span class="table-coin-symbol">${coin.symbol}</span>
                    </div>
                </td>
                <td style="font-weight: 600;">${price}</td>
                <td>${change24hHtml}</td>
                <td>${change7dHtml}</td>
                <td>${mcap}</td>
                <td>${vol}</td>
                <td>
                    <div class="sparkline-container">
                        <canvas id="${canvasId}"></canvas>
                    </div>
                </td>
            `;

            tableBody.appendChild(tr);

            // Render sparkline if data exists
            if (coin.sparkline_in_7d && coin.sparkline_in_7d.price) {
                renderSparkline(canvasId, coin.sparkline_in_7d.price, change7d >= 0);
            }
        });
    }

    function renderSparkline(canvasId, data, isPositive) {
        setTimeout(() => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            const color = isPositive ? '#10b981' : '#ef4444'; // Accent or Danger
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map((_, i) => i),
                    datasets: [{
                        data: data,
                        borderColor: color,
                        borderWidth: 1.5,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    animation: false,
                    interaction: { mode: null }
                }
            });
            sparklines.push(chart);
        }, 100);
    }

    function formatNumber(num) {
        if (num < 1) return parseFloat(num).toFixed(4);
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }

    function formatCompactNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        return new Intl.NumberFormat('en-US').format(num);
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
