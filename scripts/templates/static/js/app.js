// Climate-AI 3D Digital Twin — Main Application Controller

// Global Application State
let scene, camera, renderer, controls;
let earthMesh, atmosphereMesh, starfield, cloudsMesh;
let satellitesGroup, beamsGroup, particlesGroup;
let plumeTerrainGroup, plumeMesh, plumeParticles;

let currentMode = 'globe'; // 'globe' | 'plume'
let autoRotate = true;
let currentElevationGrid = null;
let currentPrediction = null;
let activeHotspots = [];
let currentColormap = 'plasma';
let wireframeActive = false;
let particlesActive = true;
let heightScale = 18;
let clock = new THREE.Clock();

// -----------------------------------------------------------------
// 1. Lifecycle & Three.js 3D Engine Initialization
// -----------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  init3DEngine();
  initUI();
  fetchHotspots();
  drawSpectralChart(false);
  animate();
});

function init3DEngine() {
  const container = document.getElementById('canvas-container');
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060913, 0.0006);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 30, 130);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 25;
  controls.maxDistance = 450;
  controls.rotateSpeed = 0.8;

  // Lights
  const ambientLight = new THREE.AmbientLight(0x223355, 1.2);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.set(150, 80, 100);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
  rimLight.position.set(-150, -50, -100);
  scene.add(rimLight);

  // Groups
  satellitesGroup = new THREE.Group();
  beamsGroup = new THREE.Group();
  plumeTerrainGroup = new THREE.Group();
  plumeTerrainGroup.visible = false;

  scene.add(satellitesGroup);
  scene.add(beamsGroup);
  scene.add(plumeTerrainGroup);

  // Build 3D Entities
  buildStarfield();
  buildEarthGlobe();
  buildAtmosphereCorona();
  buildPlumeTerrainMesh();

  // Window Resize Listener
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -----------------------------------------------------------------
// 2. UI Interactions & Mode Switching
// -----------------------------------------------------------------
function switchViewMode(mode) {
  currentMode = mode;
  document.getElementById('btnModeGlobe').classList.toggle('active', mode === 'globe');
  document.getElementById('btnModePlume').classList.toggle('active', mode === 'plume');
  document.getElementById('plumeToolbar').style.display = mode === 'plume' ? 'flex' : 'none';

  if (mode === 'plume') {
    // Hide Globe entities, show Plume terrain
    earthMesh.visible = false;
    atmosphereMesh.visible = false;
    satellitesGroup.visible = false;
    beamsGroup.visible = false;
    plumeTerrainGroup.visible = true;

    new TWEEN.Tween(camera.position)
      .to({ x: 0, y: 35, z: 65 }, 1200)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
    controls.target.set(0, 10, 0);

    document.getElementById('hudTarget').textContent = '3D PLUME TOPOGRAPHY MESH';
  } else {
    // Return to Global Orbit
    earthMesh.visible = true;
    atmosphereMesh.visible = true;
    satellitesGroup.visible = true;
    beamsGroup.visible = true;
    plumeTerrainGroup.visible = false;

    new TWEEN.Tween(camera.position)
      .to({ x: 0, y: 30, z: 130 }, 1200)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
    controls.target.set(0, 0, 0);

    document.getElementById('hudTarget').textContent = 'GLOBAL SATELLITE SURVEY';
  }
}

function inspectIn3D() {
  switchViewMode('plume');
}

function toggleAutoRotation(val) { autoRotate = val; }
function toggleAtmosphere(val) { atmosphereMesh.visible = val; }
function toggleSatellites(val) { satellitesGroup.visible = val; }
function toggleEmissionBeams(val) { beamsGroup.visible = val; }

function updatePlumeHeightScale(val) {
  heightScale = parseFloat(val);
  if (currentElevationGrid) update3DPlumeTerrain(currentElevationGrid, heightScale, currentColormap);
}

function updateColormap(val) {
  currentColormap = val;
  if (currentElevationGrid) update3DPlumeTerrain(currentElevationGrid, heightScale, currentColormap);
}

function togglePlumeWireframe(val) {
  wireframeActive = val;
  plumeMesh.material.wireframe = val;
}

function togglePlumeParticles() {
  particlesActive = !particlesActive;
  plumeParticles.visible = particlesActive;
  document.getElementById('btnParticles').classList.toggle('active', particlesActive);
}

function reset3DCamera() {
  if (currentMode === 'globe') {
    new TWEEN.Tween(camera.position).to({ x: 0, y: 30, z: 130 }, 1000).easing(TWEEN.Easing.Cubic.Out).start();
    controls.target.set(0, 0, 0);
  } else {
    new TWEEN.Tween(camera.position).to({ x: 0, y: 35, z: 65 }, 1000).easing(TWEEN.Easing.Cubic.Out).start();
    controls.target.set(0, 10, 0);
  }
}

// Fly Camera to Lat / Lng Hotspot on 3D Globe
function flyToHotspot(hp) {
  switchViewMode('globe');
  const targetPos = latLngToVector3(hp.lat, hp.lng, 75);
  
  new TWEEN.Tween(camera.position)
    .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 1400)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();

  controls.target.set(0, 0, 0);
  document.getElementById('hudTarget').textContent = hp.name.toUpperCase();

  // Show Reticle Pulse
  const reticle = document.getElementById('targetReticle');
  reticle.classList.add('active');
  setTimeout(() => reticle.classList.remove('active'), 2500);
}

// -----------------------------------------------------------------
// 3. Data Fetching & AI Inference Handlers
// -----------------------------------------------------------------
async function fetchHotspots() {
  try {
    const res = await fetch('/api/hotspots');
    const data = await res.json();
    if (data.status === 'success') {
      activeHotspots = data.hotspots;
      setupSatellites(data.satellites);
      setupEmissionBeams(data.hotspots);
      renderHotspotsList(data.hotspots);
      document.getElementById('activeSatsCount').textContent = `${data.satellites.length} SATELLITES TRACKING`;
    }
  } catch (err) {
    console.error('Error fetching hotspots:', err);
  }
}

function renderHotspotsList(hotspots) {
  const container = document.getElementById('hotspotsList');
  if (!container) return;
  container.innerHTML = '';

  hotspots.forEach(hp => {
    const div = document.createElement('div');
    div.className = 'hotspot-item';
    div.onclick = () => flyToHotspot(hp);
    div.innerHTML = `
      <div class="hotspot-info">
        <div class="hotspot-name">${hp.name}</div>
        <div class="hotspot-region">${hp.region} • ${hp.flux_kg_hr} kg/h</div>
      </div>
      <span class="hotspot-badge ${hp.severity}">${hp.severity}</span>
    `;
    container.appendChild(div);
  });
}

// File Upload Handling
async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  showLoading(true, 'ANALYZING SPECTRAL ABSORPTION BANDS...');
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/predict', { method: 'POST', body: formData });
    const data = await res.json();
    showLoading(false);
    if (data.status === 'success') {
      applyPredictionResult(data);
    } else {
      alert('Error processing file: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    showLoading(false);
    alert('Server connection error during AI inference');
  }
}

async function loadSamplePreset(sampleId) {
  showLoading(true, 'DOWNLINKING SATELLITE TILES...');
  try {
    const res = await fetch(`/api/sample/${sampleId}`);
    const data = await res.json();
    showLoading(false);
    if (data.status === 'success') {
      applyPredictionResult(data);
    }
  } catch (err) {
    showLoading(false);
    console.error('Error loading sample:', err);
  }
}

function applyPredictionResult(data) {
  currentPrediction = data;
  const card = document.getElementById('resultCard');
  card.style.display = 'flex';

  const banner = document.getElementById('verdictBanner');
  const text = document.getElementById('verdictText');
  const icon = document.getElementById('verdictIcon');
  const fill = document.getElementById('confFill');

  if (data.has_methane) {
    banner.className = 'verdict-banner methane';
    text.textContent = '🚨 ' + data.label;
    icon.textContent = 'CRITICAL';
    fill.className = 'conf-fill methane';
    fill.style.width = data.confidence_pct;
    document.getElementById('metricRisk').style.color = 'var(--crimson-alert)';
    document.getElementById('metricRisk').textContent = data.metrics.risk_level;
  } else {
    banner.className = 'verdict-banner no-methane';
    text.textContent = '🌿 ' + data.label;
    icon.textContent = 'CLEAN';
    fill.className = 'conf-fill';
    fill.style.width = data.confidence_pct;
    document.getElementById('metricRisk').style.color = 'var(--emerald-green)';
    document.getElementById('metricRisk').textContent = 'AMBIENT';
  }

  document.getElementById('confValueText').textContent = data.confidence_pct;
  document.getElementById('metricFlux').innerHTML = `${data.metrics.flux_rate_kg_hr} <span class="metric-unit">kg/h</span>`;
  document.getElementById('metricPeak').innerHTML = `${data.metrics.peak_concentration_ppm_m} <span class="metric-unit">ppm·m</span>`;
  document.getElementById('metricArea').innerHTML = `${data.metrics.plume_area_km2} <span class="metric-unit">km²</span>`;

  // Update 3D Topography Elevation Matrix
  if (data.elevation_grid) {
    update3DPlumeTerrain(data.elevation_grid);
  }

  // Draw Spectral Absorption Graph
  drawSpectralChart(data.has_methane);
}

function showLoading(show, text = 'ANALYZING SPECTRAL DATA...') {
  const el = document.getElementById('loadingScanner');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  if (text) document.getElementById('loadingStatusText').textContent = text;
}

// UI Clock & Listeners Initialization
function initUI() {
  // Clock Updater
  setInterval(() => {
    const now = new Date();
    const utcEl = document.getElementById('utcClock');
    if (utcEl) utcEl.textContent = 'UTC ' + now.toUTCString().split(' ')[4];
  }, 1000);

  // Drag & drop dropzone listeners
  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        document.getElementById('fileInput').files = e.dataTransfer.files;
        handleFileSelect({ target: { files: e.dataTransfer.files } });
      }
    });
  }
}

// -----------------------------------------------------------------
// 4. Main Render & Animation Loop
// -----------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Globe Mode Animations
  if (currentMode === 'globe') {
    if (autoRotate && earthMesh) {
      earthMesh.rotation.y += 0.0012;
      if (cloudsMesh) cloudsMesh.rotation.y += 0.0016;
    }

    // Animate Orbiting Satellites
    if (satellitesGroup) {
      satellitesGroup.children.forEach(satHolder => {
        if (satHolder.userData && satHolder.userData.radius) {
          satHolder.userData.angle += satHolder.userData.speed;
          const r = satHolder.userData.radius;
          const a = satHolder.userData.angle;
          satHolder.position.x = Math.cos(a) * r;
          satHolder.position.z = Math.sin(a) * r;
          satHolder.position.y = Math.sin(a * 2) * 12;
          satHolder.lookAt(0, 0, 0);
        }
      });
    }

    // Pulsing Beam Waves
    if (beamsGroup) {
      beamsGroup.children.forEach((mesh, idx) => {
        if (mesh.geometry instanceof THREE.RingGeometry) {
          const scale = 1.0 + 0.3 * Math.sin(time * 3 + idx);
          mesh.scale.set(scale, scale, 1);
        }
      });
    }
  }

  // Plume Terrain Particle Dispersion Simulation
  if (currentMode === 'plume' && plumeParticles && particlesActive) {
    const positions = plumeParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += Math.sin(time + i) * 0.08 + 0.05; // Wind drift X
      positions[i + 1] += 0.04; // Rising thermal plume Y
      positions[i + 2] += Math.cos(time + i) * 0.04; // Wind drift Z

      if (positions[i + 1] > 25) {
        positions[i + 1] = 0;
        positions[i] = (Math.random() - 0.5) * 30;
        positions[i + 2] = (Math.random() - 0.5) * 30;
      }
    }
    plumeParticles.geometry.attributes.position.needsUpdate = true;
  }

  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}
