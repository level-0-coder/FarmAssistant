import torch
import torch.nn as nn
from torchvision import models, transforms
from torchvision.datasets import ImageFolder
from torch.utils.data import DataLoader, Subset
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report
from PIL import Image
import matplotlib.pyplot as plt


# -----------------------------
# Configuration
# -----------------------------

DATASET_DIR = "dataset"
MODEL_PATH = "wheat_stage_model.pth"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CLASS_NAMES = [
    "Seedling & Plant",
    "Wheat Flowers",
    "Plant with Fruit",
    "Fruit with Seeds"
]


# -----------------------------
# Same preprocessing as training
# -----------------------------

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# -----------------------------
# Recreate model
# -----------------------------

model = models.mobilenet_v3_small(
    weights=None
)

num_features = model.classifier[-1].in_features

model.classifier[-1] = nn.Linear(
    num_features,
    4
)

model.load_state_dict(
    torch.load(MODEL_PATH, map_location=DEVICE)
)

model = model.to(DEVICE)
model.eval()


# -----------------------------
# Validation dataset
# -----------------------------

dataset = ImageFolder(
    DATASET_DIR,
    transform=transform
)

keep_classes = {
    "1. Seedling & Plant",
    "2. Wheat Flowers",
    "3. Plant with Fruit",
    "4. Fruit with Seeds"
}

indices = [
    i for i, (_, label) in enumerate(dataset.samples)
    if dataset.classes[label] in keep_classes
]

labels = [
    dataset.samples[i][1]
    for i in indices
]

# Stratified split - same as training
train_indices, val_indices = train_test_split(
    indices,
    test_size=0.2,
    stratify=labels,
    random_state=42
)

val_dataset = Subset(dataset, val_indices)

val_loader = DataLoader(
    val_dataset,
    batch_size=16,
    shuffle=False
)


# -----------------------------
# Generate predictions
# -----------------------------

all_predictions = []
all_labels = []

with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(DEVICE)

        outputs = model(images)

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        all_predictions.extend(
            predictions.cpu().numpy()
        )

        all_labels.extend(
            labels.numpy()
        )


# -----------------------------
# Confusion Matrix
# -----------------------------

cm = confusion_matrix(
    all_labels,
    all_predictions,
    labels=[0, 1, 2, 3]
)

print("Confusion Matrix:")
print(cm)


disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=CLASS_NAMES
)

disp.plot(
    xticks_rotation=45
)

plt.title("Wheat Growth Stage Confusion Matrix")
plt.tight_layout()
plt.show()


# -----------------------------
# Classification Report
# -----------------------------

print("\nClassification Report:")

print(
    classification_report(
        all_labels,
        all_predictions,
        target_names=CLASS_NAMES
    )
)