// Theme Logic
const themeToggle = document.getElementById('theme-toggle');
const body = document.documentElement;

// Check for saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // If chart exists, update its colors
        if (typeof window.updateChartTheme === 'function') {
            window.updateChartTheme(newTheme);
        }
    });
}

function updateThemeIcon(theme) {
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

// Favorites Logic (User Profile creativity point)
function getFavorites() {
    return JSON.parse(localStorage.getItem('crypto_favorites')) || [];
}

function toggleFavorite(coinId) {
    let favs = getFavorites();
    if (favs.includes(coinId)) {
        favs = favs.filter(id => id !== coinId);
    } else {
        favs.push(coinId);
    }
    localStorage.setItem('crypto_favorites', JSON.stringify(favs));
    return favs.includes(coinId);
}

function isFavorite(coinId) {
    return getFavorites().includes(coinId);
}
