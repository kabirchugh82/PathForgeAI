#!/usr/bin/env python3
"""
PathForge AI - Career Transition Readiness Training Pipeline
===========================================================
Trains a scikit-learn RandomForestClassifier on the Competency-Based
Proxy-Labeled Career Transition Dataset using a non-leaking GroupShuffleSplit.

DISCLOSURE:
- The readiness_label is a proxy label generated via multi-factor competency rules.
- Real-world predictive validity has NOT been established.
- The model learns the PathForge proxy benchmark, not actual employment outcomes.
"""

import hashlib
import json
import os
import sys
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder

RANDOM_SEED = 42
MODEL_VERSION = "v1.0.0"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "career_transitions_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_ARTIFACT_PATH = os.path.join(MODELS_DIR, "career_transition_model.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")
FEATURE_SCHEMA_PATH = os.path.join(MODELS_DIR, "feature_schema.json")


def compute_file_hash(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def run_pipeline():
    print("=" * 60)
    print("PATHFORGE AI - REPRODUCIBLE ML TRAINING PIPELINE")
    print(f"Model: RandomForestClassifier | Version: {MODEL_VERSION}")
    print("=" * 60)

    # 1. Dataset Loading & Validation
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}. Run ml/dataset/generate_dataset.py first.")

    dataset_hash = compute_file_hash(DATASET_PATH)
    df = pd.read_csv(DATASET_PATH)
    total_rows = len(df)
    print(f"\n[1/7] Loaded Dataset:")
    print(f"      Rows:         {total_rows}")
    print(f"      Columns:      {len(df.columns)}")
    print(f"      SHA-256 Hash: {dataset_hash[:16]}...{dataset_hash[-8:]}")

    assert total_rows == 1800, f"Expected 1800 rows, found {total_rows}"
    assert df.isnull().sum().sum() == 0, "Dataset contains null values!"

    # 2. Encode Target Role & Label
    role_encoder = LabelEncoder()
    df["target_role_encoded"] = role_encoder.fit_transform(df["target_role"])

    target_role_mapping = {
        role: int(idx) for role, idx in zip(role_encoder.classes_, range(len(role_encoder.classes_)))
    }

    class_names = ["low", "moderate", "high"]
    label_encoder = LabelEncoder()
    label_encoder.fit(class_names)
    df["label_encoded"] = label_encoder.transform(df["readiness_label"])

    feature_cols = [
        "skill_match_score",
        "market_demand_score",
        "ai_exposure_score",
        "transferability_score",
        "skill_breadth_score",
        "emerging_skill_alignment",
        "skill_gap_score",
        "experience_years",
        "target_role_experience_requirement",
        "experience_gap",
        "number_of_matching_skills",
        "number_of_missing_skills",
        "transition_effort_score",
        "target_role_encoded",
    ]

    print(f"\n[2/7] Feature Matrix:")
    print(f"      Features: {len(feature_cols)}")
    print(f"      Classes:  {list(label_encoder.classes_)}")

    # Class distribution
    class_dist = df["readiness_label"].value_counts().to_dict()
    print(f"      Class Distribution: {class_dist}")

    # 3. Non-Leaking Grouped Train/Test Split
    # Group on archetype_id so no synthetic candidate persona leaks across train/test
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=RANDOM_SEED)
    train_idx, test_idx = next(gss.split(df, groups=df["archetype_id"]))

    train_df = df.iloc[train_idx]
    test_df = df.iloc[test_idx]

    train_archetypes = set(train_df["archetype_id"])
    test_archetypes = set(test_df["archetype_id"])
    overlap_archetypes = train_archetypes & test_archetypes

    print(f"\n[3/7] Grouped Train/Test Split (Group: archetype_id):")
    print(f"      Train Set:        {len(train_df)} rows ({len(train_archetypes)} archetypes)")
    print(f"      Held-Out Test Set:{len(test_df)} rows ({len(test_archetypes)} archetypes)")
    print(f"      Archetype Leak:   {len(overlap_archetypes)} (strictly 0)")
    assert len(overlap_archetypes) == 0, f"DATA LEAKAGE DETECTED! Overlapping archetypes: {overlap_archetypes}"

    X_train = train_df[feature_cols]
    y_train = train_df["label_encoded"]
    X_test = test_df[feature_cols]
    y_test = test_df["label_encoded"]

    # 4. Model Instantiation & Training
    print(f"\n[4/7] Training RandomForestClassifier...")
    rf_params = {
        "n_estimators": 100,
        "max_depth": 6,
        "min_samples_split": 5,
        "min_samples_leaf": 2,
        "random_state": RANDOM_SEED,
        "class_weight": "balanced",
        "n_jobs": -1,
    }

    model = RandomForestClassifier(**rf_params)
    model.fit(X_train, y_train)
    print("      Model training complete.")

    # 5. Held-Out Test Evaluation
    print(f"\n[5/7] Evaluating Held-Out Test Set (Unseen Archetypes):")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    prec_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    try:
        roc_auc = float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="macro"))
    except Exception as e:
        roc_auc = None

    cm = confusion_matrix(y_test, y_pred).tolist()

    print(f"      Test Accuracy:    {acc * 100:.2f}%")
    print(f"      Macro Precision:  {prec_macro * 100:.2f}%")
    print(f"      Macro Recall:     {rec_macro * 100:.2f}%")
    print(f"      Macro F1 Score:   {f1_macro * 100:.2f}%")
    print(f"      Weighted F1:      {f1_weighted * 100:.2f}%")
    if roc_auc is not None:
        print(f"      Multi-class ROC-AUC: {roc_auc:.4f}")

    print("\n      Confusion Matrix (Rows: Actual, Cols: Predicted):")
    labels_order = list(label_encoder.classes_)
    print(f"      Order: {labels_order}")
    for idx, row in enumerate(cm):
        print(f"      {labels_order[idx]:<10}: {row}")

    print("\n      Detailed Classification Report:")
    report_dict = classification_report(
        y_test, y_pred, target_names=labels_order, output_dict=True, zero_division=0
    )
    for cls_name in labels_order:
        cr = report_dict[cls_name]
        print(f"        {cls_name.upper():<10} -> P: {cr['precision']:.3f}, R: {cr['recall']:.3f}, F1: {cr['f1-score']:.3f}, N: {int(cr['support'])}")

    # 6. Feature Importance Extraction
    importances = model.feature_importances_
    feature_imp_list = []
    for col, imp in zip(feature_cols, importances):
        feature_imp_list.append({"feature": col, "importance": round(float(imp), 4)})
    feature_imp_list.sort(key=lambda x: -x["importance"])

    print(f"\n[6/7] Top Model Influential Features:")
    for item in feature_imp_list[:6]:
        print(f"      - {item['feature']:<34}: {item['importance'] * 100:>5.2f}%")

    # 7. Model Serialization & Metadata Export
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Save model artifact
    joblib.dump(model, MODEL_ARTIFACT_PATH)
    print(f"\n[7/7] Exported Artifacts:")
    print(f"      Model Artifact:  {MODEL_ARTIFACT_PATH}")

    # Feature schema
    feature_schema = {
        "model_version": MODEL_VERSION,
        "feature_count": len(feature_cols),
        "features": feature_cols,
        "target_roles": target_role_mapping,
        "class_labels": {int(idx): name for idx, name in enumerate(label_encoder.classes_)},
        "readiness_score_formula": "0.15 * P(low) + 0.55 * P(moderate) + 0.90 * P(high)"
    }
    with open(FEATURE_SCHEMA_PATH, "w", encoding="utf-8") as f:
        json.dump(feature_schema, f, indent=2)
    print(f"      Feature Schema:  {FEATURE_SCHEMA_PATH}")

    # Metadata & Evaluation report
    metadata = {
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestClassifier",
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 6,
            "min_samples_split": 5,
            "min_samples_leaf": 2,
            "random_state": 42,
            "class_weight": "balanced"
        },
        "dataset_metadata": {
            "dataset_type": "Proxy-labeled synthetic benchmark",
            "dataset_filename": "career_transitions_dataset.csv",
            "dataset_sha256": dataset_hash,
            "total_rows": total_rows,
            "train_rows": len(train_df),
            "test_rows": len(test_df),
            "train_archetypes_count": len(train_archetypes),
            "test_archetypes_count": len(test_archetypes),
            "split_method": "GroupShuffleSplit(grouped_by='archetype_id', test_size=0.20, random_state=42)"
        },
        "evaluation_metrics": {
            "test_accuracy": round(acc, 4),
            "test_precision_macro": round(prec_macro, 4),
            "test_recall_macro": round(rec_macro, 4),
            "test_f1_macro": round(f1_macro, 4),
            "test_f1_weighted": round(f1_weighted, 4),
            "test_roc_auc_ovr_macro": round(roc_auc, 4) if roc_auc is not None else None,
            "confusion_matrix": cm,
            "class_labels": labels_order,
            "classification_report": report_dict
        },
        "feature_importances": feature_imp_list,
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "disclaimer": "Offline benchmark performance on proxy-labeled synthetic data. Real-world predictive validity has not been established; this model does not predict actual hiring success."
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"      Model Metadata:  {METADATA_PATH}")

    print("\n" + "=" * 60)
    print("PIPELINE EXECUTION COMPLETED SUCCESSFULLY")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_pipeline()
