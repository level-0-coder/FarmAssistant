import os
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms, models

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

import numpy as np


# --------------------------------------------------
# Configuration
# --------------------------------------------------

DATASET_DIR = Path("dataset")

BATCH_SIZE = 16
NUM_EPOCHS = 15
LEARNING_RATE = 1e-3

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Using device:", DEVICE)


# --------------------------------------------------
# Transformations
# --------------------------------------------------

train_transform = transforms.Compose([
    transforms.Resize((224, 224)),

    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


val_transform = transforms.Compose([
    transforms.Resize((224, 224)),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# --------------------------------------------------
# Load dataset
# --------------------------------------------------

full_dataset = datasets.ImageFolder(
    DATASET_DIR,
    transform=train_transform
)

print("\nClasses detected:")
print(full_dataset.class_to_idx)

print("\nNumber of images:")
print(len(full_dataset))


# --------------------------------------------------
# Remove class 5
# --------------------------------------------------

# ImageFolder assigns classes alphabetically.
# We explicitly keep only the first four folders.

keep_classes = {
    "1. Seedling & Plant",
    "2. Wheat Flowers",
    "3. Plant with Fruit",
    "4. Fruit with Seeds"
}

indices = [
    i for i, (_, class_idx) in enumerate(full_dataset.samples)
    if full_dataset.classes[class_idx] in keep_classes
]

print("\nImages after removing class 5:", len(indices))


# --------------------------------------------------
# Extract labels
# --------------------------------------------------

labels = np.array([
    full_dataset.samples[i][1]
    for i in indices
])


# --------------------------------------------------
# Stratified train/validation split
# --------------------------------------------------

train_indices, val_indices = train_test_split(
    indices,
    test_size=0.2,
    stratify=labels,
    random_state=42
)


# --------------------------------------------------
# Create datasets
# --------------------------------------------------

train_dataset = Subset(full_dataset, train_indices)

# Validation dataset should NOT use augmentation.
val_full_dataset = datasets.ImageFolder(
    DATASET_DIR,
    transform=val_transform
)

val_dataset = Subset(
    val_full_dataset,
    val_indices
)


train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False
)


# --------------------------------------------------
# Model
# --------------------------------------------------

weights = models.MobileNet_V3_Small_Weights.DEFAULT

model = models.mobilenet_v3_small(
    weights=weights
)

# Freeze pretrained layers
for param in model.features.parameters():
    param.requires_grad = False


# Replace classifier
num_features = model.classifier[-1].in_features

model.classifier[-1] = nn.Linear(
    num_features,
    4
)

model = model.to(DEVICE)


# --------------------------------------------------
# Class weights
# --------------------------------------------------

class_counts = np.bincount(labels)

class_weights = len(labels) / (
    len(class_counts) * class_counts
)

class_weights = torch.tensor(
    class_weights,
    dtype=torch.float32
).to(DEVICE)

print("\nClass counts:")
for i, count in enumerate(class_counts):
    print(i, count)

print("\nClass weights:")
print(class_weights)


# --------------------------------------------------
# Loss and optimizer
# --------------------------------------------------

criterion = nn.CrossEntropyLoss(
    weight=class_weights
)

optimizer = torch.optim.Adam(
    model.classifier.parameters(),
    lr=LEARNING_RATE
)


# --------------------------------------------------
# Training
# --------------------------------------------------

for epoch in range(NUM_EPOCHS):

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels_batch in train_loader:

        images = images.to(DEVICE)
        labels_batch = labels_batch.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(
            outputs,
            labels_batch
        )

        loss.backward()
        optimizer.step()

        running_loss += loss.item()

        _, predicted = torch.max(
            outputs,
            1
        )

        total += labels_batch.size(0)

        correct += (
            predicted == labels_batch
        ).sum().item()

    train_accuracy = 100 * correct / total


    # --------------------------------------------------
    # Validation
    # --------------------------------------------------

    model.eval()

    val_correct = 0
    val_total = 0

    with torch.no_grad():

        for images, labels_batch in val_loader:

            images = images.to(DEVICE)
            labels_batch = labels_batch.to(DEVICE)

            outputs = model(images)

            _, predicted = torch.max(
                outputs,
                1
            )

            val_total += labels_batch.size(0)

            val_correct += (
                predicted == labels_batch
            ).sum().item()

    val_accuracy = 100 * val_correct / val_total


    print(
        f"Epoch [{epoch + 1}/{NUM_EPOCHS}] "
        f"Loss: {running_loss / len(train_loader):.4f} "
        f"Train Acc: {train_accuracy:.2f}% "
        f"Val Acc: {val_accuracy:.2f}%"
    )


# --------------------------------------------------
# Final evaluation
# --------------------------------------------------

model.eval()

all_predictions = []
all_labels = []

with torch.no_grad():

    for images, labels_batch in val_loader:

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
            labels_batch.numpy()
        )


print("\nClassification Report:")

print(
    classification_report(
        all_labels,
        all_predictions,
        labels=[0, 1, 2, 3],
        target_names=[
            "Seedling & Plant",
            "Wheat Flowers",
            "Plant with Fruit",
            "Fruit with Seeds"
        ],
        zero_division=0
    )
)


# --------------------------------------------------
# Save model
# --------------------------------------------------

torch.save(
    model.state_dict(),
    "wheat_stage_model.pth"
)

print("\nModel saved as wheat_stage_model.pth")