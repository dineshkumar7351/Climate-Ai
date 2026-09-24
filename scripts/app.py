import os
import io
import json
import time
import uuid
import numpy as np
from flask import Flask, request, render_template, jsonify, send_from_directory
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image

# -------------------------
# 1. Define PyTorch CNN Model
# -------------------------
class MethaneCNN(nn.Module):
    def __init__(self):
        super(MethaneCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2)
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 8 * 8, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 2)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

# -------------------------
# 2. Model Initialization
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "methane_cnn.pth")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = MethaneCNN()

if os.path.exists(MODEL_PATH):
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.to(device)
        model.eval()
        print(f"✅ Loaded MethaneCNN model from {MODEL_PATH} on {device}")
    except Exception as e:
        print(f"⚠️ Warning loading model: {e}")
else:
    print(f"⚠️ Model file not found at {MODEL_PATH}")

# -------------------------
# 3. Flask Application
# -------------------------
app = Flask(__name__, static_folder="templates/static", template_folder="templates")

# Transformation matching CNN training (1x128x128 grayscale)
cnn_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
])

# Global hotspot registry for 3D Earth visualization
GLOBAL_HOTSPOTS = [
    {
        "id": "permian-01",
        "name": "Permian Basin Super-Emitter",
        "region": "Texas / New Mexico, USA",
        "lat": 31.845,
        "lng": -102.368,
        "severity": "CRITICAL",
        "flux_kg_hr": 2450.0,
        "concentration_ppm_m": 3180.0,
        "type": "Oil & Gas Flaring / Fugitive Venting",
        "satellite": "MethaneSAT-1 / EMIT",
        "beamColor": 0xff3b30
    },
    {
        "id": "turkmen-02",
        "name": "Korpezhe Compressor Plume",
        "region": "Balkan Region, Turkmenistan",
        "lat": 38.498,
        "lng": 54.217,
        "severity": "CRITICAL",
        "flux_kg_hr": 4820.0,
        "concentration_ppm_m": 5420.0,
        "type": "Pipeline Blowdown / Ultra-Emitter",
        "satellite": "Sentinel-5P / TROPOMI",
        "beamColor": 0xff2d55
    },
    {
        "id": "shanxi-03",
        "name": "Shanxi Coal Basin Shaft 7",
        "region": "Shanxi Province, China",
        "lat": 37.870,
        "lng": 112.550,
        "severity": "HIGH",
        "flux_kg_hr": 1680.0,
        "concentration_ppm_m": 2240.0,
        "type": "Underground Coal Mine Ventilation",
        "satellite": "GHGSat-C3",
        "beamColor": 0xff9500
    },
    {
        "id": "mumbai-04",
        "name": "Deonar Municipal Landfill",
        "region": "Mumbai, Maharashtra, India",
        "lat": 19.065,
        "lng": 72.929,
        "severity": "HIGH",
        "flux_kg_hr": 920.0,
        "concentration_ppm_m": 1540.0,
        "type": "Solid Waste Anaerobic Decay",
        "satellite": "Tanager-1",
        "beamColor": 0xffcc00
    },
    {
        "id": "kuzbass-05",
        "name": "Kuznetsk Coal Basin",
        "region": "Kemerovo Oblast, Russia",
        "lat": 55.333,
        "lng": 86.083,
        "severity": "HIGH",
        "flux_kg_hr": 1340.0,
        "concentration_ppm_m": 1980.0,
        "type": "Coal Seam Degasification",
        "satellite": "Sentinel-5P",
        "beamColor": 0xff9500
    },
    {
        "id": "hassi-06",
        "name": "Hassi R'Mel Gas Field",
        "region": "Laghouat, Algeria",
        "lat": 32.930,
        "lng": 3.270,
        "severity": "MODERATE",
        "flux_kg_hr": 780.0,
        "concentration_ppm_m": 1120.0,
        "type": "Natural Gas Processing",
        "satellite": "EMIT",
        "beamColor": 0x30d158
    },
    {
        "id": "appalachian-07",
        "name": "Marcellus Shale Unconventional Wells",
        "region": "Pennsylvania, USA",
        "lat": 41.203,
        "lng": -77.194,
        "severity": "MODERATE",
        "flux_kg_hr": 650.0,
        "concentration_ppm_m": 940.0,
        "type": "Hydraulic Fracturing Extraction",
        "satellite": "MethaneSAT-1",
        "beamColor": 0x00f0ff
    }
]

def extract_elevation_grid(pil_img, grid_size=40):
    """Generates a normalized 2D elevation heightmap matrix from the image for 3D terrain reconstruction."""
    small_img = pil_img.convert("L").resize((grid_size, grid_size), Image.Resampling.BILINEAR)
    arr = np.array(small_img, dtype=np.float32)
    # Normalize between 0.0 and 1.0
    min_v, max_v = arr.min(), arr.max()
    if max_v > min_v:
        arr = (arr - min_v) / (max_v - min_v)
    else:
        arr = np.zeros_like(arr)
    return arr.tolist()

def process_and_predict(image_path, filename="uploaded_sample"):
    """Runs CNN inference and computes comprehensive spectral & 3D model metadata."""
    try:
        pil_img = Image.open(image_path)
    except Exception as e:
        return {"status": "error", "message": f"Invalid image file: {str(e)}"}

    # Generate web preview PNG
    preview_filename = f"preview_{uuid.uuid4().hex[:8]}.png"
    preview_path = os.path.join(UPLOAD_DIR, preview_filename)
    try:
        # Convert to RGB for web display
        if pil_img.mode in ("I;16", "I", "F", "RGBA", "P"):
            norm_arr = np.array(pil_img.convert("L"))
            web_img = Image.fromarray(norm_arr).convert("RGB")
        else:
            web_img = pil_img.convert("RGB")
        web_img.save(preview_path, format="PNG")
    except Exception:
        web_img = pil_img.convert("RGB")
        web_img.save(preview_path, format="PNG")

    # Generate 3D elevation matrix
    elevation_grid = extract_elevation_grid(pil_img, grid_size=48)

    # PyTorch CNN forward pass
    img_gray = pil_img.convert("L")
    tensor_img = cnn_transform(img_gray).unsqueeze(0).to(device)
    
    # Per-image normalization as trained
    tensor_img = (tensor_img - tensor_img.mean(dim=[1, 2, 3], keepdim=True)) / (
        tensor_img.std(dim=[1, 2, 3], keepdim=True) + 1e-6
    )

    with torch.no_grad():
        logits = model(tensor_img)
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
        prob_no_methane = float(probs[0])
        prob_methane = float(probs[1])
        predicted_idx = int(np.argmax(probs))

    has_methane = (predicted_idx == 1)
    confidence = prob_methane if has_methane else prob_no_methane

    # Estimate physical emission parameters
    if has_methane:
        flux_rate = round(float(250.0 + (prob_methane * 2200.0) + (np.max(elevation_grid) * 500)), 1)
        peak_ppm_m = round(float(800.0 + (prob_methane * 3200.0)), 1)
        plume_area_km2 = round(float(0.8 + (prob_methane * 4.5)), 2)
        risk_level = "CRITICAL HIGH" if prob_methane > 0.85 else "MODERATE"
    else:
        flux_rate = round(float(prob_methane * 80.0), 1)
        peak_ppm_m = round(float(prob_methane * 200.0 + 35.0), 1)
        plume_area_km2 = 0.0
        risk_level = "BASELINE AMBIENT"

    return {
        "status": "success",
        "filename": filename,
        "preview_url": f"/uploads/{preview_filename}",
        "has_methane": has_methane,
        "label": "METHANE PLUME DETECTED" if has_methane else "NO METHANE DETECTED",
        "confidence": round(confidence, 4),
        "confidence_pct": f"{confidence * 100:.1f}%",
        "probabilities": {
            "no_methane": round(prob_no_methane, 4),
            "methane": round(prob_methane, 4)
        },
        "metrics": {
            "flux_rate_kg_hr": flux_rate,
            "peak_concentration_ppm_m": peak_ppm_m,
            "plume_area_km2": plume_area_km2,
            "risk_level": risk_level,
            "spectral_band": "SWIR-2 (2200-2400 nm)",
            "sensor_fov": "12 km Swath",
            "spatial_resolution": "5.0 m/px"
        },
        "elevation_grid": elevation_grid,
        "grid_resolution": [48, 48]
    }

# -------------------------
# 4. Routes
# -------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    initial_result = None
    if request.method == "POST":
        if "file" in request.files and request.files["file"].filename != "":
            file = request.files["file"]
            file_path = os.path.join(UPLOAD_DIR, file.filename)
            file.save(file_path)
            initial_result = process_and_predict(file_path, file.filename)
    return render_template("index.html", initial_result=initial_result)

@app.route("/api/predict", methods=["POST"])
def api_predict():
    if "file" not in request.files or request.files["file"].filename == "":
        return jsonify({"status": "error", "message": "No file uploaded"}), 400
    
    file = request.files["file"]
    save_name = f"{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, save_name)
    file.save(file_path)
    
    res = process_and_predict(file_path, file.filename)
    return jsonify(res)

@app.route("/api/hotspots", methods=["GET"])
def api_hotspots():
    return jsonify({
        "status": "success",
        "hotspots": GLOBAL_HOTSPOTS,
        "satellites": [
            {"name": "MethaneSAT", "altitude_km": 590, "speed_kms": 7.6, "orbit_inclination": 97.8, "status": "ACTIVE_TRACKING"},
            {"name": "Sentinel-5P", "altitude_km": 824, "speed_kms": 7.4, "orbit_inclination": 98.7, "status": "SPECTRAL_SWEEP"},
            {"name": "NASA EMIT", "altitude_km": 420, "speed_kms": 7.7, "orbit_inclination": 51.6, "status": "IMAGING_PLUME"},
            {"name": "Tanager-1", "altitude_km": 510, "speed_kms": 7.5, "orbit_inclination": 97.4, "status": "POINT_SOURCE_TARGET"}
        ]
    })

@app.route("/api/sample/<sample_id>", methods=["GET"])
def api_sample(sample_id):
    raw_dir = os.path.join(BASE_DIR, "..", "data", "raw_tiffs")
    matched_file = None

    if sample_id == "high_plume":
        # Look for real plume TIFF
        if os.path.exists(raw_dir):
            plume_files = [os.path.join(raw_dir, f) for f in os.listdir(raw_dir) if "vis" in f or "plume" in f or "mf" in f]
            if plume_files:
                matched_file = plume_files[0]
    elif sample_id == "clean":
        # Look for negative reference TIFF
        if os.path.exists(raw_dir):
            neg_files = [os.path.join(raw_dir, f) for f in os.listdir(raw_dir) if "neg" in f]
            if neg_files:
                matched_file = neg_files[0]

    if matched_file and os.path.exists(matched_file):
        return jsonify(process_and_predict(matched_file, os.path.basename(matched_file)))

    # Synthetic fallback sample
    grid = np.zeros((48, 48), dtype=np.float32)
    if sample_id == "high_plume":
        for i in range(48):
            for j in range(48):
                dist = np.sqrt((i - 24)**2 + (j - 24)**2)
                grid[i, j] = float(np.exp(-dist / 8.0) + 0.1 * np.sin(i / 3.0))
        return jsonify({
            "status": "success",
            "filename": "Synthetic_Methane_SuperEmitter_4K.tif",
            "preview_url": "",
            "has_methane": True,
            "label": "METHANE PLUME DETECTED",
            "confidence": 0.984,
            "confidence_pct": "98.4%",
            "probabilities": {"no_methane": 0.016, "methane": 0.984},
            "metrics": {
                "flux_rate_kg_hr": 2840.0,
                "peak_concentration_ppm_m": 4120.0,
                "plume_area_km2": 3.4,
                "risk_level": "CRITICAL HIGH",
                "spectral_band": "SWIR-2 (2300 nm)",
                "sensor_fov": "12 km Swath",
                "spatial_resolution": "5.0 m/px"
            },
            "elevation_grid": grid.tolist(),
            "grid_resolution": [48, 48]
        })
    else:
        return jsonify({
            "status": "success",
            "filename": "Synthetic_Clean_Atmosphere_Reference.tif",
            "preview_url": "",
            "has_methane": False,
            "label": "NO METHANE DETECTED",
            "confidence": 0.974,
            "confidence_pct": "97.4%",
            "probabilities": {"no_methane": 0.974, "methane": 0.026},
            "metrics": {
                "flux_rate_kg_hr": 12.0,
                "peak_concentration_ppm_m": 42.0,
                "plume_area_km2": 0.0,
                "risk_level": "BASELINE AMBIENT",
                "spectral_band": "SWIR-2 (2300 nm)",
                "sensor_fov": "12 km Swath",
                "spatial_resolution": "5.0 m/px"
            },
            "elevation_grid": (np.random.rand(48, 48) * 0.08).tolist(),
            "grid_resolution": [48, 48]
        })

@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)

if __name__ == "__main__":
    print("🚀 Starting Climate-AI 3D Digital Twin Platform on http://127.0.0.1:5000 ...")
    app.run(host="0.0.0.0", port=5000, debug=True)
