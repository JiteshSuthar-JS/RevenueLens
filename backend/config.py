# ─────────────────────────────────────────────
#  config.py  —  All app configuration here
#  Change DB password, secret key, etc. here
# ─────────────────────────────────────────────

SECRET_KEY      = "revenuelens_secret"

MYSQL_HOST      = "localhost"
MYSQL_USER      = "root"
MYSQL_PASSWORD  = "root@123"       # ← change your password here
MYSQL_DB        = "revenuelens"

UPLOAD_FOLDER   = "uploads"
MAX_FILE_SIZE   = 20 * 1024 * 1024  # 20 MB