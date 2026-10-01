
Classes detected:
{'1. Seedling & Plant': 0, '2. Wheat Flowers': 1, '3. Plant with Fruit': 2, '4. Fruit with Seeds': 3, '5. Wheat Fruits only': 4}

Number of images:
560

Images after removing class 5: 505
Downloading: "https://download.pytorch.org/models/mobilenet_v3_small-047dcff4.pth"
100.0%

Class counts:
0 19
1 63
2 185
3 238

Class weights:
tensor([6.6447, 2.0040, 0.6824, 0.5305], device='cuda:0')
Epoch [1/15] Loss: 0.9360 Train Acc: 66.09% Val Acc: 81.19%
Epoch [2/15] Loss: 0.4639 Train Acc: 82.92% Val Acc: 82.18%
Epoch [3/15] Loss: 0.3336 Train Acc: 85.40% Val Acc: 86.14%
Epoch [4/15] Loss: 0.3411 Train Acc: 88.37% Val Acc: 88.12%
Epoch [5/15] Loss: 0.2802 Train Acc: 88.12% Val Acc: 93.07%
Epoch [6/15] Loss: 0.3000 Train Acc: 89.11% Val Acc: 88.12%
Epoch [7/15] Loss: 0.3812 Train Acc: 86.63% Val Acc: 91.09%
Epoch [8/15] Loss: 0.3495 Train Acc: 89.60% Val Acc: 92.08%
Epoch [9/15] Loss: 0.4108 Train Acc: 86.14% Val Acc: 91.09%
Epoch [10/15] Loss: 0.2450 Train Acc: 89.11% Val Acc: 91.09%
Epoch [11/15] Loss: 0.2018 Train Acc: 91.83% Val Acc: 92.08%
Epoch [12/15] Loss: 0.2818 Train Acc: 88.61% Val Acc: 94.06%
Epoch [13/15] Loss: 0.2127 Train Acc: 92.57% Val Acc: 94.06%
Epoch [14/15] Loss: 0.2309 Train Acc: 91.09% Val Acc: 91.09%
Epoch [15/15] Loss: 0.2088 Train Acc: 91.83% Val Acc: 94.06%

Classification Report:
                  precision    recall  f1-score   support

Seedling & Plant       1.00      1.00      1.00         4
   Wheat Flowers       0.86      1.00      0.92        12
Plant with Fruit       1.00      0.84      0.91        37
Fruit with Seeds       0.92      1.00      0.96        48

        accuracy                           0.94       101
       macro avg       0.95      0.96      0.95       101
    weighted avg       0.95      0.94      0.94       101