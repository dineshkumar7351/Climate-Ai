// Colormap Palettes for 3D Plume Topography and Spectral Intensity
const COLORMAPS = {
  plasma: [
    [0.0, [13, 8, 135]],
    [0.25, [126, 3, 168]],
    [0.5, [204, 71, 120]],
    [0.75, [248, 149, 64]],
    [1.0, [240, 249, 33]]
  ],
  turbo: [
    [0.0, [48, 18, 59]],
    [0.25, [40, 188, 235]],
    [0.5, [164, 252, 60]],
    [0.75, [251, 126, 33]],
    [1.0, [122, 4, 3]]
  ],
  cyber: [
    [0.0, [6, 9, 19]],
    [0.3, [0, 240, 255]],
    [0.7, [16, 185, 129]],
    [1.0, [255, 0, 128]]
  ],
  infrared: [
    [0.0, [10, 10, 20]],
    [0.4, [60, 80, 150]],
    [0.8, [220, 100, 50]],
    [1.0, [255, 255, 220]]
  ]
};

function getColorFromPalette(val, paletteName) {
  const palette = COLORMAPS[paletteName] || COLORMAPS.plasma;
  val = Math.max(0, Math.min(1, val));

  for (let i = 0; i < palette.length - 1; i++) {
    const [p1, c1] = palette[i];
    const [p2, c2] = palette[i + 1];
    if (val >= p1 && val <= p2) {
      const t = (val - p1) / (p2 - p1);
      return [
        (c1[0] + t * (c2[0] - c1[0])) / 255,
        (c1[1] + t * (c2[1] - c1[1])) / 255,
        (c1[2] + t * (c2[2] - c1[2])) / 255
      ];
    }
  }
  return [1, 1, 1];
}
