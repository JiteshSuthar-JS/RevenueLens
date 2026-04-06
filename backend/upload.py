# ─────────────────────────────────────────────
#  upload.py  —  File upload route only
# ─────────────────────────────────────────────

from flask import request, jsonify
from werkzeug.utils import secure_filename
import datetime
import os
import pandas as pd

def upload_file(upload_folder):
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected."}), 400

    filename   = secure_filename(file.filename)
    timestamp  = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_name = f"{timestamp}_{filename}"
    filepath   = os.path.join(upload_folder, saved_name)
    file.save(filepath)

    # Try reading with multiple encodings to handle all CSV types
    df = None
    for enc in ["utf-8", "latin1", "cp1252"]:
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(filepath, encoding=enc)
            else:
                df = pd.read_excel(filepath)
            break
        except Exception:
            continue

    if df is None:
        return jsonify({"error": "Could not read file. Make sure it is a valid CSV or Excel file."}), 400

    return jsonify({
        "message":   "File uploaded successfully.",
        "file_path": filepath,
        "rows":      len(df),
        "columns":   list(df.columns),
    }), 200