#!/usr/bin/env python3
"""
scripts/train_random_forest.py
==============================

Real scikit-learn + joblib Random Forest training script for Yathin Meteora.

Trains a RandomForestClassifier on synthetic weather data (same labeling rules as
the JS port in server/lib/random-forest.js), saves the model to disk via joblib,
and writes a metadata JSON file consumed by /api/ml/metrics.

Algorithm
---------
- Classifier: sklearn.ensemble.RandomForestClassifier
- n_estimators = 100, max_depth = 8, random_state = 42
- Features (6): temperature, humidity, windSpeed, pressure, cloudCover, visibility
- Classes (6): Sunny, Cloudy, Rainy, Stormy, Foggy, Snowy
- 80/20 train/test split

Usage
-----
    python scripts/train_random_forest.py

Optionally override params via env vars:
    WA_N_ESTIMATORS=200 WA_MAX_DEPTH=10 WA_SAMPLES=5000 python scripts/train_random_forest.py
"""

from __future__ import annotations
import json, os
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report, precision_recall_fscore_support
import joblib

N_ESTIMATORS = int(os.environ.get("WA_N_ESTIMATORS", "100"))
MAX_DEPTH = int(os.environ.get("WA_MAX_DEPTH", "8"))
N_SAMPLES = int(os.environ.get("WA_SAMPLES", "2000"))
SEED = 42

FEATURE_NAMES = ["temperature", "humidity", "windSpeed", "pressure", "cloudCover", "visibility"]
CLASS_NAMES = ["Sunny", "Cloudy", "Rainy", "Stormy", "Foggy", "Snowy"]

OUT_DIR = Path(__file__).resolve().parent
MODEL_PATH = OUT_DIR / "weather_rf_model.joblib"
META_PATH = OUT_DIR / "model-metadata.json"


def generate_training_data(n: int = N_SAMPLES, seed: int = SEED):
    rng = np.random.default_rng(seed)
    temperature = rng.uniform(-5, 40, n).round(1)
    humidity = rng.integers(0, 101, n)
    wind_speed = rng.uniform(1, 51, n).round(1)
    pressure = rng.uniform(990, 1030, n).round(1)
    cloud_cover = rng.integers(0, 101, n)
    visibility = rng.uniform(0.5, 20.5, n).round(1)
    X = np.column_stack([temperature, humidity, wind_speed, pressure, cloud_cover, visibility])
    y = np.empty(n, dtype=object)
    # Clear, non-overlapping rules (checked in priority order)
    snow = (temperature < 2) & (humidity > 70)
    fog = (visibility < 3) & ~snow
    storm = (pressure < 1000) & (wind_speed > 25) & ~snow & ~fog
    rain = (humidity > 80) & (cloud_cover > 70) & ~snow & ~fog & ~storm
    # Cloudy: cloud > 30 but NOT rain (humidity guard prevents overlap)
    cloudy = (cloud_cover >= 30) & ~snow & ~fog & ~storm & ~rain
    y[snow] = "Snowy"; y[fog] = "Foggy"; y[storm] = "Stormy"; y[rain] = "Rainy"; y[cloudy] = "Cloudy"
    y[~(snow | fog | storm | rain | cloudy)] = "Sunny"
    return X, y


def main():
    print("=" * 60)
    print("Yathin Meteora — scikit-learn Random Forest training")
    print("=" * 60)
    print(f"n_estimators : {N_ESTIMATORS}")
    print(f"max_depth    : {MAX_DEPTH}")
    print(f"n_samples    : {N_SAMPLES}")
    print(f"seed         : {SEED}")
    print()
    X, y = generate_training_data(N_SAMPLES, SEED)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED, stratify=y)
    print(f"Train samples: {len(X_train)}")
    print(f"Test samples : {len(X_test)}")
    print()

    clf = RandomForestClassifier(n_estimators=N_ESTIMATORS, max_depth=MAX_DEPTH, random_state=SEED, n_jobs=-1)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy     : {accuracy:.4f}")
    print()

    cm = confusion_matrix(y_test, y_pred, labels=CLASS_NAMES)
    print("Confusion matrix (rows=true, cols=pred), labels =", CLASS_NAMES)
    print(cm)
    print()
    print("Classification report:")
    print(classification_report(y_test, y_pred, labels=CLASS_NAMES, zero_division=0))

    precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred, labels=CLASS_NAMES, zero_division=0)
    per_class = {
        CLASS_NAMES[i]: {
            "precision": float(precision[i]), "recall": float(recall[i]),
            "f1": float(f1[i]), "support": int(support[i]),
        } for i in range(len(CLASS_NAMES))
    }
    importances = clf.feature_importances_
    feature_importance = [
        {"feature": FEATURE_NAMES[i], "importance": float(round(importances[i], 4))}
        for i in range(len(FEATURE_NAMES))
    ]

    metadata = {
        "accuracy": float(round(accuracy, 4)),
        "confusionMatrix": cm.tolist(),
        "perClass": per_class,
        "featureImportance": feature_importance,
        "trainingSamples": int(len(X_train)),
        "testSamples": int(len(X_test)),
        "nEstimators": N_ESTIMATORS,
        "maxDepth": MAX_DEPTH,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
    }

    joblib.dump(clf, MODEL_PATH)
    print(f"Saved model -> {MODEL_PATH}")
    with open(META_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata -> {META_PATH}")
    print()
    print("Feature importance:")
    for fi in feature_importance:
        print(f"  {fi['feature']:<12} {fi['importance']:.4f}")
    print()
    print("Done.")


if __name__ == "__main__":
    main()
