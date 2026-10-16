# ─────────────────────────────────────────────
#  upload.py  —  File upload route with validation & preview
# ─────────────────────────────────────────────

import os
import datetime
import pandas as pd
from flask import request, jsonify
from werkzeug.utils import secure_filename
try:
    from model import read_file, detect_columns
except (ImportError, ModuleNotFoundError):
    from backend.model import read_file, detect_columns


def upload_file(upload_folder):
    if "file" not in request.files:
        return jsonify({"error": "No file provided in request."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected."}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
        return jsonify({"error": "Unsupported file format. Please upload a .csv, .xlsx, or .xls file."}), 400

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_name = f"{timestamp}_{filename}"
    filepath = os.path.join(upload_folder, saved_name)
    file.save(filepath)

    # Read and inspect
    df = read_file(filepath)
    if df is None:
        return jsonify({"error": "Could not read file. Ensure it is a valid CSV or Excel document."}), 400

    raw_count = len(df)
    df_dedup = df.drop_duplicates()
    duplicates_removed = raw_count - len(df_dedup)

    date_col, rev_col, prod_col, units_col, stock_col, lead_time_col = detect_columns(df_dedup)

    # Column mapping status
    mapping = {
        "date_column": date_col,
        "revenue_column": rev_col,
        "product_column": prod_col,
        "quantity_column": units_col,
        "stock_column": stock_col,
        "lead_time_column": lead_time_col
    }

    # Extract date range if date column detected
    date_min = None
    date_max = None
    if date_col:
        try:
            d_parsed = pd.to_datetime(df_dedup[date_col], dayfirst=True, errors="coerce").dropna()
            if len(d_parsed) > 0:
                date_min = str(d_parsed.min().strftime("%Y-%m-%d"))
                date_max = str(d_parsed.max().strftime("%Y-%m-%d"))
        except Exception:
            pass

    # Unique products
    unique_products = []
    if prod_col and prod_col in df_dedup.columns:
        unique_products = [str(p) for p in df_dedup[prod_col].dropna().unique()[:8]]

    # Clean preview (first 5 rows)
    preview_rows = df_dedup.head(5).fillna("").to_dict(orient="records")

    return jsonify({
        "message": "File uploaded and validated successfully.",
        "file_path": filepath,
        "filename": filename,
        "rows": len(df_dedup),
        "raw_rows": raw_count,
        "duplicates_removed": duplicates_removed,
        "columns": list(df.columns),
        "mapping": mapping,
        "date_range": {"min": date_min, "max": date_max} if date_min else None,
        "sample_products": unique_products,
        "preview": preview_rows
    }), 200