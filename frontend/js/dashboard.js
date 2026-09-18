// =====================
// 1. CONFIGURATION
// =====================
const BASE_URL = (typeof API_BASE !== 'undefined') ? API_BASE : "https://pravah-br0g.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Utils === 'undefined') console.warn("common.js not loaded properly");
    
    initMap();
    fetchDashboardData();
});

let map;
let markersLayer; 

// =====================
// 2. MAP INITIALIZATION
// =====================
function initMap() {
    const delhiBounds = [
        [28.4045, 76.8425], 
        [28.8837, 77.3476]
    ];

    map = L.map('map', {
        center: [28.6139, 77.2090], 
        zoom: 11,
        minZoom: 11,
        maxZoom: 16,
        maxBounds: delhiBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Theme-Aware Tiles (Optional Polish)
    const isLight = document.body.classList.contains('light-mode');
    const tileUrl = isLight 
        ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // Standard Light
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"; // Dark Mode

    L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

// =====================
// 3. FETCH DATA
// =====================
async function fetchDashboardData() {
    const loader = document.getElementById('mapLoader');
    
    try {
        console.log("Fetching data from:", BASE_URL); // Debugging Log

        // ✅ Using BASE_URL ensures we look at the right place
        const [wardsRes, summaryRes, predictionRes] = await Promise.all([
            fetch(`${BASE_URL}/api/wards`),
            fetch(`${BASE_URL}/api/risk-summary`),
            fetch(`${BASE_URL}/api/prediction?hours=24`)
        ]);

        if (!wardsRes.ok) throw new Error(`Wards API Failed: ${wardsRes.status}`);
        if (!summaryRes.ok) throw new Error(`Summary API Failed: ${summaryRes.status}`);

        const wardsData = await wardsRes.json();
        const summaryData = await summaryRes.json();
        const predictionData = await predictionRes.json();

        // Render everything
        renderMapMarkers(wardsData);
        updateKPIs(summaryData, predictionData);
        populateWardList(wardsData);
        
        // Populate the dropdown in the Complaint Form
        if(typeof populateFormDropdown === 'function') {
            populateFormDropdown(wardsData); 
        } else if (window.populateFormDropdown) {
            window.populateFormDropdown(wardsData);
        }

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Dashboard Error:", error);
        if(loader) {
            loader.innerHTML = `
                <div style="text-align:center; color:#ef4444">
                    <i class="ri-wifi-off-line"></i><br>
                    Connection Failed
                </div>`;
        }
    }
}

// =====================
// 4. RENDER MARKERS
// =====================
function renderMapMarkers(geoJsonData) {
    markersLayer.clearLayers();

    geoJsonData.features.forEach(feature => {
        const props = feature.properties;
        const lat = feature.geometry.coordinates[1];
        const lng = feature.geometry.coordinates[0];
        
        const riskLevel = (props.riskLevel || 'Low').toLowerCase();
        
        // Safe Color Fallback
        let color = "#22c55e"; // default low
        if (typeof Utils !== 'undefined' && Utils.getRiskColor) {
            color = Utils.getRiskColor(props.riskLevel);
        } else {
             if(riskLevel === 'high') color = '#ef4444';
             else if(riskLevel === 'medium') color = '#eab308';
        }
        
        // Determine size based on risk
        const radius = riskLevel === "high" ? 14 : riskLevel === "medium" ? 12 : 10;

        // A. The Main Dot
        const marker = L.circleMarker([lat, lng], {
            radius: radius,
            fillColor: color,
            color: '#fff', // White border for contrast
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
            className: `ward-hotspot ward-hotspot-${riskLevel}` 
        });

        // B. The Pulse Effect (Only for High Risk)
        if (riskLevel === "high") {
            const pulse = L.circleMarker([lat, lng], {
                radius: radius + 8,
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 0.3,
                fillOpacity: 0.2,
                className: "ward-hotspot-pulse"
            });
            markersLayer.addLayer(pulse);
        }

        // C. Popup Content
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                    ${props.name}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                    <span style="font-size: 12px; color: ${color}; font-weight: 600; text-transform: uppercase;">
                        ${props.riskLevel} Risk
                    </span>
                </div>
                <div style="font-size: 11px; opacity: 0.8; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <span>Drainage:</span> <strong>${props.drainageCapacity}%</strong>
                    <span>Rainfall:</span> <strong>${props.rainfall || 0}mm</strong>
                </div>
            </div>
        `;

        // Check theme for popup style
        const isLight = document.body.classList.contains('light-mode');
        marker.bindPopup(popupContent, { className: isLight ? '' : 'dark-popup' });

        // Interactive Hover
        marker.on('mouseover', function() { this.openPopup(); this.setRadius(radius + 2); });
        marker.on('mouseout', function() { this.closePopup(); this.setRadius(radius); });
        marker.on('click', () => {
            map.flyTo([lat, lng], 14, { duration: 1.5 });
            // Populate the form if clicked
            const select = document.getElementById('wardSelect');
            if(select) select.value = props.id;
        });

        markersLayer.addLayer(marker);
    });
}

// =====================
// 5. UPDATE UI HELPERS
// =====================
function updateKPIs(summary, prediction) {
    const elHigh = document.getElementById('highRiskCount');
    const elMed = document.getElementById('medRiskCount');
    const elPred = document.getElementById('predictedCount');
    const elTime = document.getElementById('lastUpdated');

    if(elHigh) elHigh.innerText = summary.highRiskCount || 0;
    if(elMed) elMed.innerText = summary.mediumRiskCount || 0;
    if(elPred) elPred.innerText = prediction.predictedFloods || 0;
    if(elTime) elTime.innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function populateWardList(geoJsonData) {
    const listContainer = document.getElementById('wardList');
    if(!listContainer) return;
    
    listContainer.innerHTML = '';

    const sortedWards = geoJsonData.features.sort((a, b) => {
        const riskScore = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return riskScore[b.properties.riskLevel || 'Low'] - riskScore[a.properties.riskLevel || 'Low'];
    });

    sortedWards.forEach(ward => {
        const props = ward.properties;
        let color = "#22c55e";
        if (typeof Utils !== 'undefined') color = Utils.getRiskColor(props.riskLevel);
        
        const item = document.createElement('div');
        item.className = 'quick-stat-row';
        item.style.cursor = 'pointer';
        item.style.borderLeft = `3px solid ${color}`;
        item.style.paddingLeft = '8px';
        item.innerHTML = `
            <span style="font-weight:500; color: var(--text-main);">${props.name}</span>
            <span style="color:${color}; font-weight:600; font-size: 0.85rem;">${props.riskLevel}</span>
        `;

        item.addEventListener('click', () => {
            const lat = ward.geometry.coordinates[1];
            const lng = ward.geometry.coordinates[0];
            map.flyTo([lat, lng], 14);
            const select = document.getElementById('wardSelect');
            if(select) select.value = props.id;
        });

        listContainer.appendChild(item);
    });
}