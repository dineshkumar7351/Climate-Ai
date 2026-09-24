// 3D Plume Topography, Elevation Surface Model & Particle Dispersion Flow

function buildPlumeTerrainMesh() {
  const res = 48;
  const size = 60;
  const geometry = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
  geometry.rotateX(-Math.PI / 2);

  const count = geometry.attributes.position.count;
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.1,
    vertexColors: true,
    wireframe: false,
    side: THREE.DoubleSide
  });

  plumeMesh = new THREE.Mesh(geometry, material);
  plumeTerrainGroup.add(plumeMesh);

  // Base Grid Baseplate
  const gridHelper = new THREE.GridHelper(size + 10, 20, 0x00f0ff, 0x1c2a3a);
  gridHelper.position.y = -0.2;
  plumeTerrainGroup.add(gridHelper);

  // 3D Plume Particle Flow Simulation
  const particleCount = 600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(particleCount * 3);
  const pCol = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * size;
    pPos[i * 3 + 1] = Math.random() * 20;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * size;

    pCol[i * 3] = 0.0;
    pCol[i * 3 + 1] = 0.9;
    pCol[i * 3 + 2] = 1.0;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

  const pMat = new THREE.PointsMaterial({
    size: 1.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });

  plumeParticles = new THREE.Points(pGeo, pMat);
  plumeTerrainGroup.add(plumeParticles);
}

function update3DPlumeTerrain(grid, scale = heightScale, colormap = currentColormap) {
  if (!grid || !plumeMesh) return;
  currentElevationGrid = grid;

  const posAttr = plumeMesh.geometry.attributes.position;
  const colAttr = plumeMesh.geometry.attributes.color;
  const res = grid.length;

  let idx = 0;
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const val = grid[i][j];
      const y = val * scale;
      posAttr.setY(idx, y);

      const [r, g, b] = getColorFromPalette(val, colormap);
      colAttr.setXYZ(idx, r, g, b);
      idx++;
    }
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  plumeMesh.geometry.computeVertexNormals();
}
