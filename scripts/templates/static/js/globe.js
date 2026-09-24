// 3D Global Earth, Atmosphere, Satellites Constellation & Emission Beams

// High-Resolution Procedural Earth Textures
function generateProceduralEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Deep Ocean Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#0a192f');
  oceanGrad.addColorStop(0.5, '#041124');
  oceanGrad.addColorStop(1, '#0a192f');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stylized Cyber Grid Lines & Continents Outline
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw Landmasses (Procedural Blobs approximating Earth Geography)
  ctx.fillStyle = '#0f2b3e';
  const continents = [
    // North America
    { x: 450, y: 320, r: 160 }, { x: 550, y: 350, r: 120 }, { x: 380, y: 220, r: 130 },
    // South America
    { x: 620, y: 650, r: 140 }, { x: 600, y: 750, r: 90 },
    // Eurasia
    { x: 1200, y: 300, r: 240 }, { x: 1450, y: 340, r: 200 }, { x: 1000, y: 280, r: 140 }, { x: 1350, y: 480, r: 130 },
    // Africa
    { x: 1050, y: 550, r: 170 }, { x: 1100, y: 680, r: 110 },
    // Australia
    { x: 1680, y: 720, r: 110 }
  ];

  continents.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // City Lights / Hotspot Nodes (Glowing Gold & Cyan Points)
  for (let i = 0; i < 400; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    ctx.fillStyle = Math.random() > 0.3 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(255, 200, 50, 0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.random() * 2 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Earth Globe Construction
function buildEarthGlobe() {
  const geometry = new THREE.SphereGeometry(40, 64, 64);
  const texture = generateProceduralEarthTexture();
  
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.6,
    metalness: 0.25,
    bumpScale: 0.08
  });

  earthMesh = new THREE.Mesh(geometry, material);
  scene.add(earthMesh);

  // Subtle Outer Cloud / Data Layer
  const cloudGeo = new THREE.SphereGeometry(40.6, 64, 64);
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 1024; cloudCanvas.height = 512;
  const cctx = cloudCanvas.getContext('2d');
  for (let i = 0; i < 60; i++) {
    cctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
    cctx.beginPath();
    cctx.arc(Math.random()*1024, Math.random()*512, Math.random()*120+40, 0, Math.PI*2);
    cctx.fill();
  }
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
  earthMesh.add(cloudsMesh);
}

// Atmospheric Corona Shader
function buildAtmosphereCorona() {
  const atmoGeo = new THREE.SphereGeometry(43.5, 64, 64);
  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.8);
        gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 1.8;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });

  atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
  scene.add(atmosphereMesh);
}

// Starfield Universe
function buildStarfield() {
  const starGeo = new THREE.BufferGeometry();
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 1200;
    positions[i + 1] = (Math.random() - 0.5) * 1200;
    positions[i + 2] = (Math.random() - 0.5) * 1200;

    colors[i] = 0.5 + Math.random() * 0.5;
    colors[i + 1] = 0.8 + Math.random() * 0.2;
    colors[i + 2] = 1.0;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });

  starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);
}

// Orbiting Satellites Constellation
function setupSatellites(satList) {
  satellitesGroup.clear();

  satList.forEach((sat, idx) => {
    const satHolder = new THREE.Group();
    const orbitRadius = 40 + (sat.altitude_km / 100) * 2.2;
    const orbitAngle = (idx * Math.PI * 2) / satList.length;

    // Satellite 3D Body (Gold Cubesat + Solar Wings)
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);

    // Solar Panels
    const panelGeo = new THREE.BoxGeometry(3.6, 0.1, 0.8);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0055aa, metalness: 0.8, roughness: 0.3 });
    const panels = new THREE.Mesh(panelGeo, panelMat);
    body.add(panels);

    // Sensor Laser Scanning Frustum Cone
    const coneGeo = new THREE.ConeGeometry(4.5, orbitRadius - 40, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = -(orbitRadius - 40) / 2;
    cone.rotation.x = Math.PI;
    body.add(cone);

    satHolder.position.x = Math.cos(orbitAngle) * orbitRadius;
    satHolder.position.z = Math.sin(orbitAngle) * orbitRadius;
    satHolder.position.y = Math.sin(orbitAngle * 2) * 12;
    satHolder.lookAt(0, 0, 0);

    satHolder.userData = {
      radius: orbitRadius,
      speed: (sat.speed_kms || 7.5) * 0.0003,
      angle: orbitAngle,
      inclination: (sat.orbit_inclination || 98) * (Math.PI / 180),
      name: sat.name
    };

    // Orbit Trajectory Ring
    const ringGeo = new THREE.RingGeometry(orbitRadius - 0.1, orbitRadius + 0.1, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + (sat.orbit_inclination * 0.005);
    satellitesGroup.add(ring);

    satHolder.add(body);
    satellitesGroup.add(satHolder);
  });
}

// Convert Lat/Lng into 3D Sphere Cartesian Vector
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Global Hotspots 3D Emission Beams
function setupEmissionBeams(hotspots) {
  beamsGroup.clear();

  hotspots.forEach(hp => {
    const pos = latLngToVector3(hp.lat, hp.lng, 40);
    const beamHeight = 8 + (hp.flux_kg_hr / 350);

    // Volumetric Cylinder Beam
    const cylGeo = new THREE.CylinderGeometry(0.4, 1.2, beamHeight, 16);
    cylGeo.translate(0, beamHeight / 2, 0);
    cylGeo.rotateX(Math.PI / 2);

    const cylMat = new THREE.MeshBasicMaterial({
      color: hp.beamColor || 0xff3b30,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const beam = new THREE.Mesh(cylGeo, cylMat);
    beam.position.copy(pos);
    beam.lookAt(0, 0, 0);
    beam.rotateY(Math.PI);

    // Base Pulse Ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.6, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: hp.beamColor || 0xff3b30,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos.clone().multiplyScalar(1.01));
    ring.lookAt(0, 0, 0);

    beam.userData = hp;
    beamsGroup.add(beam);
    beamsGroup.add(ring);
  });
}
