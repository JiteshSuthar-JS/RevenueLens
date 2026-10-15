# ─────────────────────────────────────────────
#  config.py  —  All app configuration here
#  Change DB password, secret key, etc. here
# ─────────────────────────────────────────────

import os

SECRET_KEY      = "revenuelens_secret"

MYSQL_HOST      = "localhost"
MYSQL_USER      = "root"
MYSQL_PASSWORD  = "add your password here"
MYSQL_DB        = "revenuelens"

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER   = os.path.join(BASE_DIR, "uploads")
MAX_FILE_SIZE   = 20 * 1024 * 1024  # 20 MB
