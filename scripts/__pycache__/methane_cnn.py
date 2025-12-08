import os
import torch
import rasterio
import torchvision.transforms as transforms
import pandas as pd
from models.methane_cnn import MethaneCNN

RAW_DIR = "../data/raw_tiffs"
MODEL_PATH = "../models/methane_model.pth"
OUTPUT_CSV = "../data/output/predictions.csv"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = MethaneCNN().to(device)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()

# Define simple transform (resize + to tensor)
transform = transforms.Compose([
    transforms.ToTensor(),           # converts to [0,1]
])

results = []

for file in os.listdir(RAW_DIR):
    if file.endswith(".tif"):
        filepath = os.path.join(RAW_DIR, file)
        with rasterio.open(filepath) as src:
            img = src.read(1)  # single band
        img = torch.tensor(img, dtype=torch.float32).unsqueeze(0).unsqueeze(0)  # [1,1,H,W]
        img = img / img.max()  # normalize

        img = img.to(device)
        with torch.no_grad():
            outputs = model(img)
            probs = torch.softmax(outputs, dim=1)
            pred_class = torch.argmax(probs, dim=1).item()
            pred_label = "Methane" if pred_class==1 else "No Methane"

        results.append({
            "filename": file,
            "prediction": pred_label,
            "prob_no_methane": probs[0][0].item(),
            "prob_methane": probs[0][1].item()
        })

df = pd.DataFrame(results)
os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
df.to_csv(OUTPUT_CSV, index=False)
print(f"Predictions saved to {OUTPUT_CSV}")
