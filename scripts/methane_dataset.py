import os
# pyrefly: ignore [missing-import]
from torch.utils.data import Dataset
import pandas as pd
# pyrefly: ignore [missing-import]
from PIL import Image
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from torchvision import transforms

try:
    # pyrefly: ignore [missing-import]
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

class MethaneDataset(Dataset):
    """
    PyTorch Dataset for Methane Detection from single-band TIFF images.

    Args:
        csv_file (str): Path to CSV file containing filenames and labels.
        root_dir (str): Root directory containing TIFF images.
        transform (callable, optional): Optional transform to apply on images.
    """
    def __init__(self, csv_file, root_dir, transform=None):
        self.data = pd.read_csv(csv_file)
        self.root_dir = root_dir
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        # Get TIFF filename and full path
        tiff_file = self.data.iloc[idx]["filename"]
        tiff_path = os.path.join(self.root_dir, tiff_file)

        # Get label
        label = int(self.data.iloc[idx]["methane_detected"])

        # Read single-band TIFF
        img = None
        if HAS_RASTERIO:
            try:
                with rasterio.open(tiff_path) as src:
                    img = src.read(1).astype(np.float32)
            except Exception:
                img = None

        if img is None:
            try:
                pil = Image.open(tiff_path)
                img = np.array(pil.convert("F"), dtype=np.float32)
            except Exception:
                img = np.zeros((128, 128), dtype=np.float32)

        # Handle multi-band arrays if present
        if img.ndim == 3:
            img = img[:, :, 0]

        # Handle NaNs/Infs
        img = np.nan_to_num(img, nan=0.0, posinf=255.0, neginf=0.0)

        # Normalize to [0, 255] uint8 for standard PIL transformations
        min_v, max_v = img.min(), img.max()
        if max_v > min_v:
            img = ((img - min_v) / (max_v - min_v) * 255.0).astype(np.uint8)
        else:
            img = np.zeros_like(img, dtype=np.uint8)

        pil_img = Image.fromarray(img)

        # Apply transforms
        if self.transform:
            img_tensor = self.transform(pil_img)
        else:
            img_tensor = transforms.ToTensor()(pil_img)

        return img_tensor, label
