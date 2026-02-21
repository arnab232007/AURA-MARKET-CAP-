// Wrap everything in an event listener to ensure HTML is fully loaded first
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Simulated Backend API Call ---
    async function simulateAPIFetch() {
        return new Promise((resolve, reject) => {
            try {
                setTimeout(() => {
                    resolve([
                        { id: 'nifty', symbol: 'NIFTY 50', type: 'Index', price: 25565.50, change: 0.46, history: [25406, 25480, 25571, 25563, 25644, 25565] },
                        { id: 'gold', symbol: 'SGB Gold 24K', type: 'Commodity', price: 15766.00, change: 0.88, history: [15678, 15690, 15710, 15730, 15750, 15766] },
                        { id: 'rel', symbol: 'RELIANCE', type: 'Equity', price: 1419.40, change: -0.57, history: [1430, 1425, 1420, 1422, 1415, 1419.40] },
                        { id: 'hdfc', symbol: 'HDFCBANK', type: 'Equity', price: 911.85, change: 1.21, history: [900, 905, 902, 908, 910, 911.85] }
                    ]);
                }, 600);
            } catch (error) {
                console.error("Failed to fetch API data:", error);
                reject(error);
            }
        });
    }

    // --- Global State ---
    let marketData = [];
    let activeChartInstance = null;

    // --- 2. Initialize App & Render UI ---
    async function initDashboard() {
        try {
            marketData = await simulateAPIFetch();

            renderTickerGrid();
            renderWishlist();

            // Auto-select the first asset (NIFTY 50) for the chart if data exists
            if (marketData && marketData.length > 0) {
                selectAssetForAnalysis(marketData[0].id);
            }
        } catch (error) {
            const grid = document.getElementById('api-ticker-grid');
            if (grid) grid.innerHTML = `<div style="color: red; padding: 20px;">Error loading market data. Please check your connection.</div>`;
        }
    }

    // --- 3. Render 3D Ticker Cards ---
    function renderTickerGrid() {
        const grid = document.getElementById('api-ticker-grid');
        if (!grid) return; // Defensive check

        grid.innerHTML = '';

        marketData.forEach(asset => {
            const isUp = asset.change >= 0;
            const colorClass = isUp ? 'text-green' : 'text-red';
            const sign = isUp ? '+' : '';

            const card = document.createElement('div');
            card.className = 'market-card';
            card.innerHTML = `
                <div class="card-header">
                    <span class="asset-sym">${asset.symbol}</span>
                    <span class="asset-type">${asset.type}</span>
                </div>
                <div class="asset-price">₹${asset.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div class="asset-change ${colorClass}">${sign}${asset.change}%</div>
            `;

            // Physics-based 3D Parallax Hover Math
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -12;
                const rotateY = ((x - centerX) / centerX) * 12;

                card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });

            // Clicking a card analyzes it
            card.addEventListener('click', () => selectAssetForAnalysis(asset.id));

            grid.appendChild(card);
        });
    }

    // --- 4. Render Wishlist Sidebar ---
    function renderWishlist() {
        const container = document.getElementById('wishlist-container');
        if (!container) return; // Defensive check

        container.innerHTML = '';

        marketData.forEach(asset => {
            const isUp = asset.change >= 0;
            const colorClass = isUp ? 'text-green' : 'text-red';

            const item = document.createElement('div');
            item.className = 'wishlist-item';
            item.id = `wishlist-${asset.id}`;
            item.onclick = () => selectAssetForAnalysis(asset.id);

            item.innerHTML = `
                <div>
                    <div class="w-name">${asset.symbol}</div>
                    <div class="w-type" style="font-size: 0.75rem; color: #64748b;">${asset.type}</div>
                </div>
                <div>
                    <div class="w-price">₹${asset.price.toLocaleString('en-IN')}</div>
                    <div class="${colorClass}" style="font-size: 0.8rem; text-align: right; font-weight: 600;">
                        ${isUp ? '+' : ''}${asset.change}%
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // --- 5. Chart.js Engine ---
    function selectAssetForAnalysis(assetId) {
        const asset = marketData.find(a => a.id === assetId);
        if (!asset) return;

        // Update UI active states
        document.querySelectorAll('.wishlist-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.getElementById(`wishlist-${asset.id}`);
        if (activeItem) activeItem.classList.add('active');

        // Update Chart Headers safely
        const titleEl = document.getElementById('chart-title');
        const priceEl = document.getElementById('chart-price');

        if (titleEl) titleEl.innerText = `${asset.symbol} Analysis`;
        if (priceEl) {
            priceEl.innerText = `₹${asset.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            priceEl.className = `current-price ${asset.change >= 0 ? 'text-green' : 'text-red'}`;
        }

        // Render Chart
        renderChart(asset);
    }

    function renderChart(asset) {
        const canvas = document.getElementById('analysisChart');
        if (!canvas) return; // Prevent crashes if HTML canvas is missing

        // Ensure any ghost instances of Chart.js are destroyed
        let existingChart = Chart.getChart("analysisChart");
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const isUp = asset.change >= 0;
        const lineColor = isUp ? '#10b981' : '#ef4444';

        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
        gradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        activeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['09:15', '10:30', '11:45', '13:00', '14:15', '15:30'],
                datasets: [{
                    label: asset.symbol,
                    data: asset.history,
                    borderColor: lineColor,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: lineColor,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 12,
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, weight: 'bold', family: 'Inter' },
                        displayColors: false
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
                    y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { family: 'Inter' } } }
                },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    // Boot up the application
    initDashboard();

});