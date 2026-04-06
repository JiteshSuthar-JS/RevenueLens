# ─────────────────────────────────────────────
#  model.py  —  ML training + forecast logic
#
#  This file contains ALL machine learning code.
#  No Flask code here — just pure data science.
#
#  Models used:
#    - LinearRegression      (trend)
#    - GradientBoostingRegressor  (patterns)
#    - Ensemble: 30% LR + 70% GBR
# ─────────────────────────────────────────────

import datetime
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import GradientBoostingRegressor
from flask import jsonify


def read_file(filepath):
    """Read CSV or Excel with multiple encoding fallbacks."""
    df = None
    for enc in ["utf-8", "latin1", "cp1252"]:
        try:
            if filepath.endswith(".csv"):
                df = pd.read_csv(filepath, encoding=enc)
            else:
                df = pd.read_excel(filepath)
            break
        except Exception:
            continue
    return df


def build_features(df, date_col, revenue_col):
    """Add time-based and lag features to dataframe."""
    df = df.sort_values(date_col).reset_index(drop=True)

    df["day_num"]      = (df[date_col] - df[date_col].min()).dt.days
    df["month"]        = df[date_col].dt.month
    df["day_of_week"]  = df[date_col].dt.dayofweek
    df["day_of_year"]  = df[date_col].dt.dayofyear
    df["week_of_year"] = df[date_col].dt.isocalendar().week.astype(int)
    df["quarter"]      = df[date_col].dt.quarter
    df["is_weekend"]   = (df[date_col].dt.dayofweek >= 5).astype(int)
    df["is_month_start"] = df[date_col].dt.is_month_start.astype(int)
    df["is_month_end"]   = df[date_col].dt.is_month_end.astype(int)

    # Lag features — most powerful for time series
    mean_val = df[revenue_col].mean()
    df["lag_1"]      = df[revenue_col].shift(1).fillna(mean_val)
    df["lag_7"]      = df[revenue_col].shift(7).fillna(mean_val)
    df["lag_30"]     = df[revenue_col].shift(30).fillna(mean_val)
    df["rolling_7"]  = df[revenue_col].shift(1).rolling(7,  min_periods=1).mean().fillna(mean_val)
    df["rolling_30"] = df[revenue_col].shift(1).rolling(30, min_periods=1).mean().fillna(mean_val)

    return df


FEATURE_COLS = [
    "day_num", "month", "day_of_week", "day_of_year",
    "week_of_year", "quarter", "is_weekend",
    "is_month_start", "is_month_end",
    "lag_1", "lag_7", "lag_30", "rolling_7", "rolling_30"
]

PRODUCT_FEATURE_COLS = [
    "day_num", "month", "day_of_week", "day_of_year",
    "week_of_year", "quarter", "is_weekend",
    "lag_1", "lag_7", "rolling_7"
]


def train_model(X, y):
    """Train LR + GBR ensemble. Returns (lr, gbr, accuracy)."""
    lr  = LinearRegression()
    gbr = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=3,
        random_state=42
    )
    lr.fit(X, y)
    gbr.fit(X, y)

    train_pred = 0.3 * lr.predict(X) + 0.7 * gbr.predict(X)
    mape       = np.mean(np.abs((y - train_pred) / (np.abs(y) + 1e-9))) * 100
    accuracy   = round(float(max(0, 100 - mape)), 1)

    return lr, gbr, accuracy


def predict_ensemble(lr, gbr, X):
    """Run ensemble prediction: 30% LR + 70% GBR."""
    return np.maximum(0.3 * lr.predict(X) + 0.7 * gbr.predict(X), 0)


def forecast_30_days(lr, gbr, df, date_col, revenue_col, feature_cols):
    """
    Forecast next 30 days using rolling lag update.
    Each predicted day feeds back as lag for next day.
    This gives genuinely different values day by day.
    """
    last_date    = df[date_col].max()
    last_day     = int(df["day_num"].max())
    future_dates = [last_date + datetime.timedelta(days=i+1) for i in range(30)]

    # Start with recent actual values as initial lag window
    recent_vals = list(df[revenue_col].values[-30:])
    predictions = []

    for i, d in enumerate(future_dates):
        lag_1  = recent_vals[-1]
        lag_7  = recent_vals[-7]  if len(recent_vals) >= 7  else recent_vals[0]
        lag_30 = recent_vals[-30] if len(recent_vals) >= 30 else recent_vals[0]
        roll7  = float(np.mean(recent_vals[-7:]))
        roll30 = float(np.mean(recent_vals[-30:]))

        row = [
            last_day + i + 1,
            d.month,
            d.weekday(),
            d.timetuple().tm_yday,
            int(d.strftime("%W")),
            (d.month - 1) // 3 + 1,
            1 if d.weekday() >= 5 else 0,
            1 if d.day == 1 else 0,
            1 if d.day == (d.replace(month=d.month % 12 + 1, day=1) - datetime.timedelta(days=1)).day else 0,
            lag_1, lag_7, lag_30, roll7, roll30,
        ]

        pred = float(max(0, 0.3*lr.predict([row])[0] + 0.7*gbr.predict([row])[0]))
        predictions.append(pred)
        recent_vals.append(pred)  # feed prediction back as next lag

    return future_dates, np.array(predictions)


def forecast_product_30_days(p_lr, p_gbr, grp, date_col, revenue_col, future_dates):
    """
    Forecast 30 days for a single product using its own model.
    Uses simpler feature set (no lag_30 since products may have sparse data).
    """
    p_last_day = int(grp["day_num"].max())
    p_recent   = list(grp[revenue_col].values[-7:])
    p_preds    = []

    for i, d in enumerate(future_dates):
        lag1  = p_recent[-1]
        lag7  = p_recent[-7] if len(p_recent) >= 7 else p_recent[0]
        roll7 = float(np.mean(p_recent[-7:]))

        row = [
            p_last_day + i + 1,
            d.month, d.weekday(), d.timetuple().tm_yday,
            int(d.strftime("%W")),
            (d.month - 1) // 3 + 1,
            1 if d.weekday() >= 5 else 0,
            lag1, lag7, roll7
        ]
        pred = float(max(0, 0.3*p_lr.predict([row])[0] + 0.7*p_gbr.predict([row])[0]))
        p_preds.append(pred)
        p_recent.append(pred)

    return np.array(p_preds)


def run_forecast(file_path):
    """
    Main forecast function — called from app.py.
    Returns a dict of results or raises an Exception.
    """

    # ── Load file ─────────────────────────────────────────
    df = read_file(file_path)
    if df is None:
        raise ValueError("Could not read file.")

    df.columns = [c.lower().strip() for c in df.columns]

    # ── Auto-detect columns ───────────────────────────────
    date_col    = next((c for c in df.columns if "date" in c), None)
    revenue_col = next((c for c in df.columns if any(k in c for k in ["revenue","sales","amount","total","value"])), None)
    product_col = next((c for c in df.columns if any(k in c for k in ["product","item","category","name"])), None)
    units_col   = next((c for c in df.columns if any(k in c for k in ["quantity","units","qty"])), None)

    if not date_col:
        raise ValueError(f"No date column found. Your columns: {list(df.columns)}")
    if not revenue_col:
        raise ValueError(f"No revenue column found. Expected: revenue, sales, amount, or total. Your columns: {list(df.columns)}")

    # ── Clean data ────────────────────────────────────────
    df[date_col]    = pd.to_datetime(df[date_col], errors="coerce")
    df[revenue_col] = pd.to_numeric(df[revenue_col], errors="coerce")
    df.dropna(subset=[date_col, revenue_col], inplace=True)
    df.sort_values(date_col, inplace=True)

    # ── Build features ────────────────────────────────────
    df = build_features(df, date_col, revenue_col)

    X = df[FEATURE_COLS].values
    y = df[revenue_col].values

    # ── Train total model ─────────────────────────────────
    lr, gbr, accuracy = train_model(X, y)

    # ── Forecast next 30 days ─────────────────────────────
    future_dates, future_pred = forecast_30_days(lr, gbr, df, date_col, revenue_col, FEATURE_COLS)

    # ── Monthly aggregates ────────────────────────────────
    df["period"]   = df[date_col].dt.to_period("M")
    monthly_actual = df.groupby("period")[revenue_col].sum()
    last6_actual   = [round(float(v)) for v in monthly_actual.values[-6:]]
    last6_labels   = [str(p) for p in monthly_actual.index[-6:]]
    all_periods    = last6_labels

    # Next month total = sum of all 30 predicted days
    next_month_total = round(float(future_pred.sum()))

    # Next month label
    last_label   = last6_labels[-1] if last6_labels else ""
    next_label   = ""
    if last_label:
        yr, mo   = map(int, last_label.split("-"))
        next_dt  = datetime.date(yr, mo, 1)
        # Add one month
        if mo == 12:
            next_dt = datetime.date(yr+1, 1, 1)
        else:
            next_dt = datetime.date(yr, mo+1, 1)
        next_label = next_dt.strftime("%Y-%m")

    # ── Per-product training ──────────────────────────────
    products = []
    if product_col:
        total = float(df[revenue_col].sum())

        for prod, grp in df.groupby(product_col):
            grp = grp.sort_values(date_col).reset_index(drop=True)
            if len(grp) < 5:
                continue

            act = float(grp[revenue_col].sum())

            # Real per-product monthly revenue (aligned to same 6 months as total)
            grp["period"]  = grp[date_col].dt.to_period("M")
            prod_monthly   = grp.groupby("period")[revenue_col].sum()
            prod_dict      = {str(k): round(float(v)) for k, v in prod_monthly.items()}
            prod_last6     = [prod_dict.get(p, 0) for p in all_periods]

            # Build per-product features
            mean_val = grp[revenue_col].mean()
            grp["day_num"]     = (grp[date_col] - grp[date_col].min()).dt.days
            grp["month"]       = grp[date_col].dt.month
            grp["day_of_week"] = grp[date_col].dt.dayofweek
            grp["day_of_year"] = grp[date_col].dt.dayofyear
            grp["week_of_year"]= grp[date_col].dt.isocalendar().week.astype(int)
            grp["quarter"]     = grp[date_col].dt.quarter
            grp["is_weekend"]  = (grp[date_col].dt.dayofweek >= 5).astype(int)
            grp["lag_1"]       = grp[revenue_col].shift(1).fillna(mean_val)
            grp["lag_7"]       = grp[revenue_col].shift(7).fillna(mean_val)
            grp["rolling_7"]   = grp[revenue_col].shift(1).rolling(7, min_periods=1).mean().fillna(mean_val)

            Xp = grp[PRODUCT_FEATURE_COLS].values
            yp = grp[revenue_col].values

            # Train per-product model
            p_lr  = LinearRegression()
            p_gbr = GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
            p_lr.fit(Xp, yp)
            p_gbr.fit(Xp, yp)

            # Per-product accuracy
            p_pred = 0.3*p_lr.predict(Xp) + 0.7*p_gbr.predict(Xp)
            p_mape = np.mean(np.abs((yp - p_pred) / (np.abs(yp) + 1e-9))) * 100
            p_acc  = round(float(max(0, 100 - p_mape)), 1)

            # Per-product 30-day forecast
            p_future = forecast_product_30_days(p_lr, p_gbr, grp, date_col, revenue_col, future_dates)
            prod_next_month = round(float(p_future.sum()))

            # Stock estimate
            prod_units   = int(grp[units_col].sum()) if units_col and units_col in grp.columns else 0
            avg_price    = act / prod_units if prod_units > 0 else max(act / 100, 1)
            stock_needed = max(1, round(prod_next_month / avg_price))

            products.append({
                "product":      str(prod),
                "actual":       round(act),
                "last6_actual": prod_last6,       # unique per product chart
                "last6_labels": all_periods,
                "forecast":     prod_next_month,  # individually trained
                "stock_needed": stock_needed,
                "accuracy":     p_acc,
            })

    # ── Return final result ───────────────────────────────
    return {
        "accuracy":        accuracy,
        "total_actual":    round(float(df[revenue_col].sum())),
        "next_month_total": next_month_total,
        "total_forecast":  next_month_total,
        "total_units":     int(df[units_col].sum()) if units_col else 0,
        "rows":            len(df),
        "last6_actual":    last6_actual,
        "last6_labels":    last6_labels,
        "next_month_label": next_label,
        "forecast_3m":     [next_month_total],
        "forecast_3m_lb":  [next_label],
        "future_30days":   [
            {"date": str(d.date()), "value": round(float(v))}
            for d, v in zip(future_dates, future_pred)
        ],
        "products": products,
    }