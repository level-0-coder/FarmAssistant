import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

# load_dotenv()
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

client = MongoClient(os.environ["MONGODB_URI"])
db = client[os.environ["DATABASE_NAME"]]

users_collection = db["users"]
user_data_collection = db["user_data"]

# sensors
sensor_products_collection = db["sensor_products"]
units_collection = db["units"]
sensor_readings_collection = db["sensor_readings"]

# analytics
analytics_data_collection = db["analytics_data"]
analytics_data_collection.create_index(
    [("farm_id", 1), ("timestamp", -1)]
)