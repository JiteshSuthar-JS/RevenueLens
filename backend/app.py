import os
import datetime
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_mysqldb import MySQL
from werkzeug.utils import secure_filename

import config
import auth
import upload
from model import run_forecast, read_file

# ── App Setup ─────────────────────────────────
app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"]          = config.SECRET_KEY
app.config["MYSQL_HOST"]          = config.MYSQL_HOST
app.config["MYSQL_USER"]          = config.MYSQL_USER
app.config["MYSQL_PASSWORD"]      = config.MYSQL_PASSWORD
app.config["MYSQL_DB"]            = config.MYSQL_DB
app.config["MAX_CONTENT_LENGTH"]  = config.MAX_FILE_SIZE

os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)

mysql = MySQL(app)


# ── Auth Routes ───────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    return auth.register(mysql, config.SECRET_KEY)


@app.route("/api/login", methods=["POST"])
def login():
    return auth.login(mysql, config.SECRET_KEY)


# ── Upload Route ──────────────────────────────
@app.route("/api/upload", methods=["POST"])
def upload_file():
    return upload.upload_file(config.UPLOAD_FOLDER)


# ── Forecast Route ────────────────────────────
@app.route("/api/forecast", methods=["POST"])
def forecast():
    from flask import request
    data      = request.get_json() or {}
    file_path = data.get("file_path")
    options   = {
        "lead_time_days": data.get("lead_time_days", 14),
        "service_level": data.get("service_level", 95),
        "demand_shock_pct": data.get("demand_shock_pct", 0)
    }

    if not file_path:
        return jsonify({"error": "No file path provided."}), 400

    if not os.path.exists(file_path):
        # Fallback check inside config.UPLOAD_FOLDER or uploads/
        candidates = [
            os.path.join(config.UPLOAD_FOLDER, os.path.basename(file_path)),
            os.path.join(os.getcwd(), file_path),
            os.path.join(os.getcwd(), "uploads", os.path.basename(file_path)),
            os.path.join(config.BASE_DIR, "uploads", os.path.basename(file_path))
        ]
        found = False
        for c in candidates:
            if os.path.exists(c):
                file_path = c
                found = True
                break
        if not found:
            return jsonify({"error": "File not found. Please upload again."}), 400

    try:
        result = run_forecast(file_path, options=options)   # all ML logic in model.py
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Forecast failed: {str(e)}"}), 500


# ── Current Stock File Upload & Parsing ───────
@app.route("/api/stock-update", methods=["POST"])
def stock_update():
    """
    Parses an uploaded current stock file (CSV or Excel) and returns
    a mapping of product name -> current stock quantity.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename."}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
        return jsonify({"error": "Unsupported file format. Please upload .csv or .xlsx."}), 400

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(config.UPLOAD_FOLDER, f"stock_{timestamp}_{filename}")
    file.save(filepath)

    from model import read_file
    df = read_file(filepath)
    if df is None or len(df) == 0:
        return jsonify({"error": "Could not read stock file. Please ensure it has valid data."}), 400

    # Clean columns
    cols_lower = {str(c).lower().strip(): c for c in df.columns}
    prod_candidates = ["product", "product_name", "product_line", "productline", "item", "item_name", "sku", "name", "line"]
    prod_col = next((cols_lower[c] for c in cols_lower if any(k == c or k in c for k in prod_candidates)), None)

    stock_candidates = ["current_stock", "stock", "quantity", "qty", "stock_on_hand", "available_stock", "on_hand", "units", "count"]
    stock_col = next((cols_lower[c] for c in cols_lower if any(k == c or k in c for k in stock_candidates)), None)

    if not prod_col or not stock_col:
        if len(df.columns) >= 2:
            prod_col = df.columns[0]
            stock_col = df.columns[1]
        else:
            return jsonify({"error": f"Could not detect product and stock columns. Columns found: {list(df.columns)}"}), 400

    stock_map = {}
    for _, row in df.iterrows():
        p_name = str(row[prod_col]).strip()
        val = pd.to_numeric(row[stock_col], errors="coerce")
        if p_name and pd.notna(val):
            stock_map[p_name] = max(0, int(val))

    return jsonify({
        "status": "SUCCESS",
        "matched_count": len(stock_map),
        "stock_map": stock_map,
        "product_column": prod_col,
        "stock_column": stock_col
    }), 200


# ── Health Check ──────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "RevenueLens API is running"}), 200


# ── Run ───────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True)