// Global Variables
let scene, camera, renderer, earth, clouds;
let alertMarkers = [];
let isGlobeInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeGlobe();
    initializeCharts();
    initializeEventListeners();
    generateDummyData();
});

// Navigation Functions
function initializeNavigation() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            // Hide mobile menu after click
            mobileMenu.classList.add('hidden');
        });
    });
}

// 3D Globe Initialization
function initializeGlobe() {
    const container = document.getElementById('globe-container');
    const canvas = document.getElementById('globe-canvas');
    
    if (!container || !canvas) return;
    
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000011);
    
    // Earth geometry and material
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    
    // Create earth texture (placeholder - using a procedural texture)
    const earthTexture = createEarthTexture();
    const earthMaterial = new THREE.MeshPhongMaterial({ 
        map: earthTexture,
        shininess: 0.8
    });
    
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    
    // Clouds
    const cloudsGeometry = new THREE.SphereGeometry(2.02, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: createCloudsTexture(),
        transparent: true,
        opacity: 0.3
    });
    clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    scene.add(clouds);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-1, 0, 1);
    scene.add(directionalLight);
    
    // Camera position
    camera.position.z = 5;
    
    // Add disaster markers
    addDisasterMarkers();
    
    // Mouse controls
    let isMouseDown = false;
    let mouseX = 0, mouseY = 0;
    
    canvas.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            earth.rotation.y += deltaX * 0.01;
            earth.rotation.x += deltaY * 0.01;
            clouds.rotation.y += deltaX * 0.01;
            clouds.rotation.x += deltaY * 0.01;
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(3, Math.min(10, camera.position.z));
    });
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
    isGlobeInitialized = true;
}

// Create procedural Earth texture
function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create a simple earth-like texture
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(0.3, '#2E7D32');
    gradient.addColorStop(0.6, '#8BC34A');
    gradient.addColorStop(0.8, '#FFC107');
    gradient.addColorStop(1, '#F44336');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 128);
    
    // Add some noise for landmasses
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 128;
        const size = Math.random() * 3;
        
        ctx.fillStyle = Math.random() > 0.5 ? '#2E7D32' : '#1976D2';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create procedural clouds texture
function createCloudsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Generate cloud patterns
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 128;
        const radius = Math.random() * 20 + 5;
        
        ctx.globalAlpha = Math.random() * 0.5 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Add disaster markers to the globe
function addDisasterMarkers() {
    const disasters = [
        { lat: 34.0522, lon: -118.2437, type: 'wildfire', severity: 'critical' },
        { lat: -1.2921, lon: 36.8219, type: 'drought', severity: 'warning' },
        { lat: 28.7041, lon: 77.1025, type: 'flood', severity: 'normal' },
        { lat: -15.7975, lon: -47.8919, type: 'drought', severity: 'warning' },
        { lat: 51.5074, lon: -0.1278, type: 'normal', severity: 'normal' }
    ];
    
    disasters.forEach(disaster => {
        const marker = createDisasterMarker(disaster);
        scene.add(marker);
        alertMarkers.push(marker);
    });
}

// Create individual disaster markers
function createDisasterMarker(disaster) {
    // Convert lat/lon to 3D coordinates
    const phi = (90 - disaster.lat) * (Math.PI / 180);
    const theta = (disaster.lon + 180) * (Math.PI / 180);
    
    const x = -2.1 * Math.sin(phi) * Math.cos(theta);
    const y = 2.1 * Math.cos(phi);
    const z = 2.1 * Math.sin(phi) * Math.sin(theta);
    
    // Create marker geometry
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    let material;
    
    switch (disaster.severity) {
        case 'critical':
            material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            break;
        case 'warning':
            material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
            break;
        default:
            material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    }
    
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(x, y, z);
    marker.userData = disaster;
    
    return marker;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (earth && clouds) {
        // Rotate earth slowly
        earth.rotation.y += 0.002;
        clouds.rotation.y += 0.0015;
        
        // Animate markers
        alertMarkers.forEach(marker => {
            marker.scale.setScalar(1 + 0.3 * Math.sin(Date.now() * 0.005));
        });
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('globe-container');
    if (!container || !camera || !renderer) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Initialize Charts
function initializeCharts() {
    // Historical Trends Chart
    const trendsCtx = document.getElementById('trendsChart');
    if (trendsCtx) {
        new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Crop Health Index',
                    data: [75, 78, 82, 79, 85, 88],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Disaster Risk Level',
                    data: [45, 52, 38, 65, 42, 35],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ffffff' },
                        grid: { color: '#374151' }
                    },
                    y: {
                        ticks: { color: '#ffffff' },
                        grid: { color: '#374151' }
                    }
                }
            }
        });
    }
    
    // Alerts Distribution Chart
    const alertsCtx = document.getElementById('alertsChart');
    if (alertsCtx) {
        new Chart(alertsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'Warning', 'Normal'],
                datasets: [{
                    data: [3, 7, 124],
                    backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
                    borderWidth: 2,
                    borderColor: '#1F2937'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter logic here (placeholder)
            const filter = this.dataset.filter;
            filterDisasters(filter);
        });
    });
    
    // Modal functionality
    const modal = document.getElementById('impact-modal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Filter disasters on globe
function filterDisasters(filter) {
    alertMarkers.forEach(marker => {
        if (filter === 'all' || marker.userData.type === filter) {
            marker.visible = true;
        } else {
            marker.visible = false;
        }
    });
}

// Generate and update dummy data
function generateDummyData() {
    // Update alert counts
    updateAlertCounts();
    
    // Simulate real-time updates
    setInterval(() => {
        updateAlertCounts();
        updateRiskMetrics();
    }, 5000);
}

function updateAlertCounts() {
    const critical = Math.floor(Math.random() * 5) + 1;
    const warning = Math.floor(Math.random() * 10) + 5;
    const normal = Math.floor(Math.random() * 50) + 100;
    
    document.getElementById('critical-count').textContent = critical;
    document.getElementById('warning-count').textContent = warning;
    document.getElementById('normal-count').textContent = normal;
}

function updateRiskMetrics() {
    const cropRisk = Math.floor(Math.random() * 40) + 10;
    const waterStress = Math.floor(Math.random() * 60) + 20;
    const disasterRisk = Math.floor(Math.random() * 80) + 10;
    
    // Update progress bars with animation
    setTimeout(() => {
        document.querySelector('.progress-fill').style.width = cropRisk + '%';
    }, 100);
    
    setTimeout(() => {
        document.querySelectorAll('.progress-fill')[1].style.width = waterStress + '%';
    }, 200);
    
    setTimeout(() => {
        document.querySelectorAll('.progress-fill')[2].style.width = disasterRisk + '%';
    }, 300);
}

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function simulateSMSAlert() {
    const simulationArea = document.getElementById('simulation-area');
    
    simulationArea.innerHTML = `
        <div class="text-center animate-fade-in">
            <div class="bg-red-500 text-white p-4 rounded-lg mb-4 animate-pulse">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <h3 class="font-bold">CRITICAL ALERT SENT</h3>
                <p class="text-sm">SMS dispatched to 1,247 farmers in affected region</p>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg text-left text-sm">
                <div class="text-green-400 mb-2">📱 SMS Alert:</div>
                <div class="text-white">
                    "⚠️ DROUGHT WARNING: Severe water stress detected in your region. 
                    Implement conservation measures immediately. 
                    Check AgroSat dashboard for detailed guidance."
                </div>
            </div>
        </div>
    `;
    
    // Reset after 5 seconds
    setTimeout(() => {
        simulationArea.innerHTML = `
            <div class="text-center">
                <i class="fas fa-satellite text-4xl text-blue-400 mb-4 animate-pulse"></i>
                <p class="text-gray-300">Click 'Simulate SMS Alert' to see live demo</p>
            </div>
        `;
    }, 5000);
}

function showImpactModal() {
    document.getElementById('impact-modal').style.display = 'block';
}

// Error handling for Three.js
window.addEventListener('error', function(e) {
    if (e.message.includes('three') || e.message.includes('WebGL')) {
        console.warn('WebGL/Three.js not supported, falling back to 2D visualization');
        // Fallback to 2D map or static image
        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            globeContainer.innerHTML = `
                <div class="flex items-center justify-center h-full bg-gray-800 rounded-lg">
                    <div class="text-center">
                        <i class="fas fa-globe text-6xl text-blue-400 mb-4"></i>
                        <p class="text-gray-300">3D Globe (WebGL not supported)</p>
                        <p class="text-sm text-gray-500">Showing static visualization</p>
                    </div>
                </div>
            `;
        }
    }
});

// Performance monitoring
console.log('AgroSat Monitor Frontend Loaded Successfully');
