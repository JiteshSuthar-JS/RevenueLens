from flask import Flask, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
import os

import config
import auth
import upload
from model import run_forecast

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
    data      = request.get_json()
    file_path = data.get("file_path")

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
        result = run_forecast(file_path)   # all ML logic in model.py
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Forecast failed: {str(e)}"}), 500


# ── Health Check ──────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "RevenueLens API is running"}), 200


# ── Run ───────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True)