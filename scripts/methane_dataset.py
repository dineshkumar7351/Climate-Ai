import os
import torch
from torch.utils.data import Dataset
import pandas as pd
import rasterio
import numpy as np
from torchvision import transforms

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
        with rasterio.open(tiff_path) as src:
            img = src.read(1).astype(np.float32)  # ensure float

        # Handle NaNs/Infs
        img = np.nan_to_num(img, nan=0.0, posinf=255.0, neginf=0.0)

        # Normalize to [0,1]
        img /= 255.0

        # Convert to PyTorch tensor (C x H x W)
        img = torch.tensor(img, dtype=torch.float32).unsqueeze(0)

        # Convert to PIL for transforms that expect images
        if self.transform:
            img = transforms.ToPILImage()(img)
            img = self.transform(img)

        return img, label
