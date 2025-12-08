import os
from flask import Flask, request, render_template
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image

# -------------------------
# 1. Define CNN model (same as training)
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
            nn.Linear(128 * 8 * 8, 256),  # from training script
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 2)  # Binary classification
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

# -------------------------
# 2. Load trained model
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "methane_cnn.pth")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = MethaneCNN()
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()

# -------------------------
# 3. Flask App
# -------------------------
app = Flask(__name__)

# Preprocessing (match training)
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
])

def predict_image(image_path):
    image = Image.open(image_path).convert("L")
    image = transform(image).unsqueeze(0).to(device)
    # normalize per image
    image = (image - image.mean(dim=[1, 2, 3], keepdim=True)) / (
        image.std(dim=[1, 2, 3], keepdim=True) + 1e-6
    )
    with torch.no_grad():
        outputs = model(image)
        _, predicted = torch.max(outputs, 1)
        return "✅ Methane Detected" if predicted.item() == 1 else "❌ No Methane"

# -------------------------
# 4. Routes
# -------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    if request.method == "POST":
        if "file" not in request.files:
            return render_template("index.html", result="No file uploaded")
        file = request.files["file"]
        if file.filename == "":
            return render_template("index.html", result="No file selected")

        upload_dir = os.path.join(BASE_DIR, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        file.save(file_path)

        result = predict_image(file_path)

    return render_template("index.html", result=result)

if __name__ == "__main__":
    app.run(debug=True)
