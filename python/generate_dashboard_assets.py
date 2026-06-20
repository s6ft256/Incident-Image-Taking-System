#!/usr/bin/env python3

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import pandas as pd

# Matplotlib backend for headless environments
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


@dataclass
class ModelMetrics:
    enabled: bool
    model: str
    target: str
    rows: int
    accuracy: Optional[float] = None


def _safe_mkdir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _write_json(path: str, data: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _plot_bar(series: pd.Series, title: str, out_path: str, top_n: int = 10) -> None:
    s = series.dropna()
    s = s.astype(str)
    counts = s.value_counts().head(top_n)

    plt.figure(figsize=(10, 5))
    counts.sort_values().plot(kind="barh")
    plt.title(title)
    plt.xlabel("Count")
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()


def _plot_incidents_over_time(df: pd.DataFrame, date_col: str, out_path: str) -> None:
    if date_col not in df.columns:
        return

    dates = pd.to_datetime(df[date_col], errors="coerce")
    dates = dates.dropna().dt.date
    if dates.empty:
        return

    counts = dates.value_counts().sort_index()

    plt.figure(figsize=(10, 4))
    plt.plot(list(counts.index), list(counts.values))
    plt.title("Incidents over time")
    plt.xlabel("Date")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()


def _compute_open_closed_observations(observations: pd.DataFrame) -> Tuple[int, int, int]:
    total = int(len(observations))
    action_col = next((col for col in ["Action Taken", "Action taken"] if col in observations.columns), None)
    if not action_col:
        return total, 0, total

    action = observations[action_col].fillna("").astype(str)
    closed = int((action.str.strip().str.len() > 0).sum())
    open_ = total - closed
    return total, open_, closed


def _train_simple_incident_model(incidents: pd.DataFrame) -> ModelMetrics:
    # Goal: demonstrate sklearn usage without assuming a rigid schema.
    # We try to predict a binary "high risk" flag from whatever columns exist.
    possible_sev_cols = ["Severity", "severityScore", "Severity Score"]
    possible_like_cols = ["Likelihood", "likelihoodScore", "Likelihood Score"]

    sev_col = next((c for c in possible_sev_cols if c in incidents.columns), None)
    like_col = next((c for c in possible_like_cols if c in incidents.columns), None)

    if sev_col is None and like_col is None:
        return ModelMetrics(enabled=False, model="LogisticRegression", target="high_risk", rows=int(len(incidents)))

    df = incidents.copy()

    def to_num(col: str) -> pd.Series:
        return pd.to_numeric(df[col], errors="coerce")

    sev = to_num(sev_col) if sev_col else pd.Series([None] * len(df))
    like = to_num(like_col) if like_col else pd.Series([None] * len(df))

    # Define target: high risk if either score is high.
    y = ((sev.fillna(0) >= 7) | (like.fillna(0) >= 7)).astype(int)

    # If target is constant, skip.
    if y.nunique() < 2:
        return ModelMetrics(enabled=False, model="LogisticRegression", target="high_risk", rows=int(len(df)))

    feature_cols = []
    if sev_col:
        feature_cols.append(sev_col)
    if like_col and like_col not in feature_cols:
        feature_cols.append(like_col)

    # Add a few common categorical columns if present.
    for c in ["Category", "Department", "Site / Project", "Location"]:
        if c in df.columns and c not in feature_cols:
            feature_cols.append(c)

    X = df[feature_cols]

    numeric_features = [c for c in feature_cols if c in {sev_col, like_col}]
    categorical_features = [c for c in feature_cols if c not in numeric_features]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))]),
                numeric_features,
            ),
            (
                "cat",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]),
                categorical_features,
            ),
        ],
        remainder="drop",
    )

    clf = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", LogisticRegression(max_iter=1000)),
        ]
    )

    # Train/test split (small datasets still ok; we just report a simple accuracy).
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    clf.fit(X_train, y_train)
    acc = float(clf.score(X_test, y_test))

    return ModelMetrics(enabled=True, model="LogisticRegression", target="high_risk", rows=int(len(df)), accuracy=acc)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate static dashboard analytics assets (JSON + charts).")
    parser.add_argument("--observations", default="data/observations.csv", help="Path to observations CSV")
    parser.add_argument("--incidents", default="data/incidents.csv", help="Path to incidents CSV")
    parser.add_argument("--outdir", default="public/dashboard-assets", help="Output directory under the web app")

    args = parser.parse_args()
    outdir = args.outdir
    _safe_mkdir(outdir)

    summary: Dict[str, Any] = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "sources": {
            "observations": args.observations,
            "incidents": args.incidents,
        },
        "observations": {},
        "incidents": {},
        "model": {},
        "assets": {},
    }

    # Load observations
    obs_df: Optional[pd.DataFrame] = None
    if os.path.exists(args.observations):
        obs_df = pd.read_csv(args.observations)
        total, open_, closed = _compute_open_closed_observations(obs_df)
        summary["observations"] = {
            "rows": int(len(obs_df)),
            "total": total,
            "open": open_,
            "closed": closed,
        }

        if "Observation Type" in obs_df.columns:
            out_path = os.path.join(outdir, "observations_by_type.png")
            _plot_bar(obs_df["Observation Type"], "Observations by type", out_path)
            summary["assets"]["observationsByType"] = "/dashboard-assets/observations_by_type.png"

        if "Site / Location" in obs_df.columns:
            out_path = os.path.join(outdir, "observations_by_site.png")
            _plot_bar(obs_df["Site / Location"], "Observations by site", out_path)
            summary["assets"]["observationsBySite"] = "/dashboard-assets/observations_by_site.png"

    else:
        summary["observations"] = {"rows": 0, "note": "Observations CSV not found"}

    # Load incidents
    inc_df: Optional[pd.DataFrame] = None
    if os.path.exists(args.incidents):
        inc_df = pd.read_csv(args.incidents)
        summary["incidents"] = {"rows": int(len(inc_df))}

        # Try multiple likely date columns.
        date_col = None
        for c in ["Incident Date", "Date", "incidentDate", "incident_date"]:
            if c in inc_df.columns:
                date_col = c
                break

        if date_col:
            out_path = os.path.join(outdir, "incidents_over_time.png")
            _plot_incidents_over_time(inc_df, date_col, out_path)
            summary["assets"]["incidentsOverTime"] = "/dashboard-assets/incidents_over_time.png"

        # Train a small model if feasible.
        metrics = _train_simple_incident_model(inc_df)
        summary["model"] = asdict(metrics)

    else:
        summary["incidents"] = {"rows": 0, "note": "Incidents CSV not found"}
        summary["model"] = asdict(ModelMetrics(enabled=False, model="LogisticRegression", target="high_risk", rows=0))

    _write_json(os.path.join(outdir, "summary.json"), summary)


if __name__ == "__main__":
    main()
