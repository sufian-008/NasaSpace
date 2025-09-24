// Global variables
let scene, camera, renderer, earth, clouds;
let alertMarkers = [];
let eonetEvents = [];
let trendsChart, alertsChart;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation();
    initializeGlobe();
    initializeCharts();
    await fetchEONETAlerts();
    setInterval(updateRiskMetrics, 5000); // Risk metrics update
    setInterval(fetchEONETAlerts, 60000); // Refresh EONET alerts every minute
});

// Navigation
function initializeNavigation() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) target.scrollIntoView({behavior:'smooth'});
            mobileMenu.classList.add('hidden');
        });
    });
}

// Initialize 3D Globe
function initializeGlobe() {
    const canvas = document.getElementById('globe-canvas');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth/canvas.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000011);

    // Earth
    const earthGeo = new THREE.SphereGeometry(2, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg')
    });
    earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Clouds
    const cloudsGeo = new THREE.SphereGeometry(2.02, 64, 64);
    const cloudsMat = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/ayushjain1609/3D-globe/master/clouds.png'),
        transparent:true, opacity:0.3
    });
    clouds = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(clouds);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040,0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff,0.8);
    dirLight.position.set(-1,0,1);
    scene.add(ambientLight, dirLight);

    camera.position.z = 5;

    // Mouse control
    let isDown=false, prevX=0, prevY=0;
    canvas.addEventListener('mousedown', e=>{isDown=true; prevX=e.clientX; prevY=e.clientY;});
    canvas.addEventListener('mousemove', e=>{
        if(!isDown) return;
        const dx=e.clientX-prevX, dy=e.clientY-prevY;
        earth.rotation.y += dx*0.01; earth.rotation.x += dy*0.01;
        clouds.rotation.y += dx*0.01; clouds.rotation.x += dy*0.01;
        prevX=e.clientX; prevY=e.clientY;
    });
    canvas.addEventListener('mouseup', ()=>isDown=false);
    canvas.addEventListener('wheel', e=>{
        e.preventDefault();
        camera.position.z += e.deltaY*0.01;
        camera.position.z = Math.max(2, Math.min(15, camera.position.z));
    });

    window.addEventListener('resize', ()=>{
        camera.aspect = canvas.clientWidth/canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    animate();
}

// Animate Globe
function animate(){
    requestAnimationFrame(animate);
    if(earth && clouds){
        earth.rotation.y += 0.001;
        clouds.rotation.y += 0.0008;
        alertMarkers.forEach(m => m.scale.setScalar(1+0.3*Math.sin(Date.now()*0.005)));
    }
    renderer.render(scene,camera);
}

// Fetch NASA EONET Alerts
async function fetchEONETAlerts(){
    try{
        const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events');
        const data = await res.json();
        eonetEvents = data.events;

        // Remove previous markers
        alertMarkers.forEach(m=>scene.remove(m));
        alertMarkers=[];

        let critical=0, warning=0, normal=0;
        eonetEvents.forEach(ev=>{
            if(!ev.geometry || ev.geometry.length===0) return;
            const coords = ev.geometry[0].coordinates;
            const type = ev.categories[0].title.toLowerCase();
            let severity='normal';
            if(type.includes('fire')) severity='critical';
            else if(type.includes('storm')||type.includes('flood')) severity='warning';

            if(severity==='critical') critical++;
            if(severity==='warning') warning++;
            if(severity==='normal') normal++;

            // Marker
            const markerGeo = new THREE.SphereGeometry(0.05,8,8);
            let color=0x00ff00;
            if(severity==='critical') color=0xff0000;
            else if(severity==='warning') color=0xffff00;
            const markerMat = new THREE.MeshBasicMaterial({color});
            const marker = new THREE.Mesh(markerGeo, markerMat);

            // Lat/Lon -> XYZ
            const lon = coords[0]*Math.PI/180;
            const lat = coords[1]*Math.PI/180;
            const radius = 2;
            marker.position.set(
                radius*Math.cos(lat)*Math.cos(lon),
                radius*Math.sin(lat),
                -radius*Math.cos(lat)*Math.sin(lon)
            );
            scene.add(marker);
            alertMarkers.push(marker);
        });

        document.getElementById('critical-count').textContent=critical;
        document.getElementById('warning-count').textContent=warning;
        document.getElementById('normal-count').textContent=normal;

        updateCharts(critical,warning,normal);
    }catch(err){console.error(err);}
}

// Initialize Charts
function initializeCharts(){
    const ctxAlerts = document.getElementById('alertsChart').getContext('2d');
    const ctxTrends = document.getElementById('trendsChart').getContext('2d');

    alertsChart = new Chart(ctxAlerts,{
        type:'doughnut',
        data:{
            labels:['Critical','Warning','Normal'],
            datasets:[{data:[0,0,0], backgroundColor:['#f87171','#facc15','#4ade80']}]
        }
    });

    trendsChart = new Chart(ctxTrends,{
        type:'line',
        data:{
            labels:['Jan','Feb','Mar','Apr','May','Jun'],
            datasets:[{
                label:'Disasters',
                data:[12,19,8,15,20,13],
                borderColor:'rgba(75,192,192,1)',
                fill:false
            }]
        }
    });
}

// Update Charts dynamically
function updateCharts(critical, warning, normal){
    alertsChart.data.datasets[0].data=[critical,warning,normal];
    alertsChart.update();
}

async function fetchEONETAlerts() {
    try {
        const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events');
        const data = await res.json();
        eonetEvents = data.events;

        // Clear previous markers and alert list
        alertMarkers.forEach(m => scene.remove(m));
        alertMarkers = [];
        const alertsList = document.getElementById('alerts-list');
        alertsList.innerHTML = '';

        let critical = 0, warning = 0, normal = 0;

        eonetEvents.forEach(ev => {
            if (!ev.geometry || ev.geometry.length === 0) return;

            const coords = ev.geometry[0].coordinates;
            const type = ev.categories[0].title.toLowerCase();
            let severity = 'normal';
            if (type.includes('fire')) severity = 'critical';
            else if (type.includes('storm') || type.includes('flood')) severity = 'warning';

            // Count severity
            if (severity === 'critical') critical++;
            else if (severity === 'warning') warning++;
            else normal++;

            // Create marker for globe
            const markerGeo = new THREE.SphereGeometry(0.05, 8, 8);
            let color = 0x00ff00;
            if (severity === 'critical') color = 0xff0000;
            else if (severity === 'warning') color = 0xffff00;
            const markerMat = new THREE.MeshBasicMaterial({ color });
            const marker = new THREE.Mesh(markerGeo, markerMat);

            // Lat/Lon -> XYZ
            const lon = coords[0] * Math.PI / 180;
            const lat = coords[1] * Math.PI / 180;
            const radius = 2;
            marker.position.set(
                radius * Math.cos(lat) * Math.cos(lon),
                radius * Math.sin(lat),
                -radius * Math.cos(lat) * Math.sin(lon)
            );
            scene.add(marker);
            alertMarkers.push(marker);

            // Populate alerts list in HTML
            const alertItem = document.createElement('div');
            alertItem.classList.add('alert-item', 'p-2', 'rounded', 'bg-gray-700', 'flex', 'justify-between', 'items-center');
            alertItem.innerHTML = `
                <span>${ev.title}</span>
                <span class="${severity === 'critical' ? 'text-red-400' : severity === 'warning' ? 'text-yellow-400' : 'text-green-400'} font-bold">${severity.toUpperCase()}</span>
            `;
            alertsList.appendChild(alertItem);
        });

        // Update risk metrics counts
        document.getElementById('critical-count').textContent = critical;
        document.getElementById('warning-count').textContent = warning;
        document.getElementById('normal-count').textContent = normal;

        // Update charts
        updateCharts(critical, warning, normal);

    } catch (err) {
        console.error(err);
    }
}


// Risk Metrics Random Update (Progress bar + Percentage)
function updateRiskMetrics(){
    const crop = Math.floor(Math.random()*101);
    const water = Math.floor(Math.random()*101);
    const disaster = Math.floor(Math.random()*101);

    document.getElementById('crop-health-fill').style.width = crop + '%';
    document.getElementById('water-fill').style.width = water + '%';
    document.getElementById('disaster-fill').style.width = disaster + '%';

    document.getElementById('crop-health-risk').textContent = crop + '%';
    document.getElementById('water-stress').textContent = water + '%';
    document.getElementById('disaster-risk').textContent = disaster + '%';
}

// Simulate SMS Alert
function simulateSMSAlert(){
    const area = document.getElementById('simulation-area');
    area.innerHTML = `<div class="text-center text-green-400"><i class="fas fa-sms text-3xl mb-2"></i><p>SMS Alert Sent to Farmers!</p></div>`;
    setTimeout(()=>{
        area.innerHTML = `<div class="text-center"><i class="fas fa-satellite text-4xl text-blue-400 mb-4 animate-pulse"></i><p class="text-gray-300">Click 'Simulate SMS Alert' to see live demo</p></div>`;
    },3000);
}

// Impact Modal
function showImpactModal(){
    const modal = document.getElementById('impact-modal');
    modal.style.display='flex';
}
document.querySelector('#impact-modal .close').addEventListener('click',()=>{document.getElementById('impact-modal').style.display='none';});
window.addEventListener('click', e=>{if(e.target.id==='impact-modal'){document.getElementById('impact-modal').style.display='none';}});
