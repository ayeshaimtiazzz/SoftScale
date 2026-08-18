import random

import pandas as pd

from .feature_extractor import (
    calculate_hours,
    detect_domain,
    estimate_complexity,
    extract_features,
)
from .paths import DATASET_CSV
from .pricing_engine import estimate_price

feature_list = [
    "login",
    "dashboard",
    "ai chatbot",
    "api integration",
    "payment integration",
    "admin panel",
    "database setup",
]

descriptions = [
    "Build a web app with {}",
    "Create a system including {}",
    "Develop a platform with {}",
    "Need a project with {}",
]


def generate_random_project():
    num_features = random.randint(1, 4)
    selected = random.sample(feature_list, num_features)
    desc_template = random.choice(descriptions)
    description = desc_template.format(", ".join(selected))
    region = random.choice(["pakistan", "india", "usa"])
    experience = random.choice(["beginner", "intermediate", "expert"])
    features = extract_features(description)
    domains = detect_domain(features)
    complexity = estimate_complexity(features)
    hours = calculate_hours(features)
    pricing = estimate_price(features, domains, hours, complexity, region, experience)
    avg_price = (pricing["min_price"] + pricing["max_price"]) // 2
    return {
        "features": ";".join(features),
        "complexity": complexity,
        "hours": hours,
        "domain": ",".join(domains),
        "price": avg_price,
    }


def generate_dataset(n: int = 200):
    data = [generate_random_project() for _ in range(n)]
    df = pd.DataFrame(data)
    DATASET_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATASET_CSV, index=False)
    print(f"Dataset written: {DATASET_CSV} ({n} rows)")


if __name__ == "__main__":
    generate_dataset(350)
