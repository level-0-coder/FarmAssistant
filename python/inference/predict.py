import torch
import torch.nn as nn

from torchvision import models, transforms
from PIL import Image


MODEL_PATH = "inference/wheat_stage_model.pth"

CLASS_NAMES = [
    "Seedling & Plant",
    "Wheat Flowers",
    "Plant with Fruit",
    "Fruit with Seeds"
]

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# Preprocessing
# ============================================================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# Model
# ============================================================

model = None

def load_model():

    global model

    if model is not None:
        return model

    model = models.mobilenet_v3_small(
        weights=None
    )

    num_features = model.classifier[-1].in_features

    model.classifier[-1] = nn.Linear(
        num_features,
        len(CLASS_NAMES)
    )

    model.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location=DEVICE
        )
    )

    model = model.to(DEVICE)
    model.eval()

    return model

# ============================================================
# Crop Stage Identification
# ============================================================

def identify_crop_stage(image_path):
    
    model = load_model()

    image = Image.open(
        image_path
    ).convert("RGB")

    image = transform(image)

    image = image.unsqueeze(0).to(DEVICE)

    with torch.no_grad():

        output = model(image)

        probabilities = torch.softmax(
            output,
            dim=1
        )[0]

        predicted_index = torch.argmax(
            probabilities
        ).item()

    predicted_class = CLASS_NAMES[
        predicted_index
    ]

    confidence = probabilities[
        predicted_index
    ].item()

    return predicted_class, confidence


# ============================================================
# Main - Testing
# ============================================================

if __name__ == "__main__":

    image_path = "dataset/4. Fruit with Seeds/Fruit with Seeds (4).jpg"

    crop_stage, confidence = (
        identify_crop_stage(image_path)
    )

    print()
    print(
        f"Prediction: {crop_stage}"
    )

    print(
        f"Confidence: "
        f"{confidence * 100:.2f}%"
    )