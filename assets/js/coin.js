document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const coinId = urlParams.get('id');
    const container = document.getElementById('content-container');
    const mainLoader = document.getElementById('main-loader');

    if (!coinId) {
        container.innerHTML = '<div class="glass-card"><p class="text-center">No coin specified. Please go back and search for a coin.</p></div>';
        return;
    }

    try {
        const coinData = await getCoinDetails(coinId);
        if (!coinData) throw new Error('Failed to load data');

        mainLoader.style.display = 'none';
        
        // Clone template
        const template = document.getElementById('coin-template');
        const clone = template.content.cloneNode(true);

        // Fill basic info
        clone.getElementById('coin-image').src = coinData.image.large;
        clone.getElementById('coin-name').textContent = coinData.name;
        clone.getElementById('coin-symbol').textContent = coinData.symbol.toUpperCase();
        clone.getElementById('coin-rank').textContent = coinData.market_cap_rank || 'N/A';
        
        // Fill Prices (4 currencies)
        const marketData = coinData.market_data;
        clone.getElementById('price-usd').textContent = formatCurrency(marketData.current_price.usd, 'USD');
        clone.getElementById('price-eur').textContent = formatCurrency(marketData.current_price.eur, 'EUR');
        clone.getElementById('price-btc').textContent = marketData.current_price.btc.toFixed(8);
        clone.getElementById('price-eth').textContent = marketData.current_price.eth.toFixed(8);

        // Fill Stats
        clone.getElementById('stat-mcap').textContent = formatCurrency(marketData.market_cap.usd, 'USD');
        clone.getElementById('stat-vol').textContent = formatCurrency(marketData.total_volume.usd, 'USD');
        clone.getElementById('stat-supply').textContent = formatNumber(marketData.circulating_supply);
        clone.getElementById('stat-max-supply').textContent = marketData.total_supply ? formatNumber(marketData.total_supply) : '∞';
        clone.getElementById('stat-ath').textContent = formatCurrency(marketData.ath.usd, 'USD');
        clone.getElementById('stat-atl').textContent = formatCurrency(marketData.atl.usd, 'USD');

        // Description
        const descEl = clone.getElementById('coin-description');
        descEl.innerHTML = coinData.description.en ? coinData.description.en : '<p>No description available.</p>';
        
        // Symbols in text
        clone.querySelectorAll('.about-name').forEach(el => el.textContent = coinData.name);
        clone.querySelectorAll('.about-symbol').forEach(el => el.textContent = coinData.symbol.toUpperCase());

        // Converter
        const convertCoinInput = clone.getElementById('convert-coin');
        const convertUsdInput = clone.getElementById('convert-usd');
        const currentUsdPrice = marketData.current_price.usd;

        convertUsdInput.value = (1 * currentUsdPrice).toFixed(2);

        convertCoinInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            convertUsdInput.value = (val * currentUsdPrice).toFixed(2);
        });

        // Favorites
        const favBtn = clone.getElementById('fav-btn');
        if (isFavorite(coinId)) favBtn.classList.add('active');
        
        favBtn.addEventListener('click', () => {
            const isNowFav = toggleFavorite(coinId);
            if (isNowFav) favBtn.classList.add('active');
            else favBtn.classList.remove('active');
        });

        // Append to container
        container.appendChild(clone);

        // Init Chart
        await initChart(coinId);

    } catch (error) {
        console.error(error);
        mainLoader.style.display = 'none';
        container.innerHTML = '<div class="glass-card"><p class="text-center" style="color: var(--danger)">Failed to load coin details. Please try again later.</p></div>';
    }
});

let priceChart; // Global chart instance

async function initChart(coinId) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Load initial 7 days data
    await loadChartData(coinId, 7);

    // Setup chart buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const days = e.target.getAttribute('data-days');
            await loadChartData(coinId, days);
        });
    });

    // Theme integration for chart
    window.updateChartTheme = function(theme) {
        if (priceChart) {
            const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
            const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            
            priceChart.options.scales.x.ticks.color = textColor;
            priceChart.options.scales.y.ticks.color = textColor;
            priceChart.options.scales.x.grid.color = gridColor;
            priceChart.options.scales.y.grid.color = gridColor;
            priceChart.options.plugins.legend.labels.color = textColor;
            priceChart.update();
        }
    }
}

async function loadChartData(coinId, days) {
    const chartData = await getCoinChart(coinId, days);
    if (!chartData) return;

    const prices = chartData.prices;
    const labels = prices.map(p => {
        const date = new Date(p[0]);
        return days == 1 ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : date.toLocaleDateString();
    });
    const dataPoints = prices.map(p => p[1]);

    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    if (priceChart) {
        priceChart.destroy();
    }

    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (USD)',
                data: dataPoints,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { 
                        color: textColor,
                        callback: function(value) {
                            if (value >= 1000) {
                                return '$' + (value / 1000).toFixed(1) + 'k';
                            }
                            return '$' + value.toPrecision(3);
                        }
                    }
                }
            }
        }
    });
}

function formatCurrency(value, currency = 'USD') {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: value < 1 ? 4 : 2,
        maximumFractionDigits: value < 1 ? 4 : 2
    }).format(value);
}

function formatNumber(value) {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
}
