# ─────────────────────────────────────────────
#  auth.py  —  Register & Login routes only
# ─────────────────────────────────────────────

from flask import request, jsonify
import bcrypt
import jwt
import datetime


def register(mysql, secret_key):
    data     = request.get_json()
    name     = data["name"]
    email    = data["email"]
    password = data["password"]

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email=%s", (email,))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Email already registered"}), 400

    cur.execute(
        "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
        (name, email, hashed)
    )
    mysql.connection.commit()
    cur.close()
    return jsonify({"message": "User registered successfully"})


def login(mysql, secret_key):
    data     = request.get_json()
    email    = data["email"]
    password = data["password"]

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cur.fetchone()
    cur.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    stored_password = user[3]
    if not bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
        return jsonify({"error": "Invalid password"}), 401

    token = jwt.encode(
        {
            "user_id": user[0],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        },
        secret_key,
        algorithm="HS256"
    )

    return jsonify({
        "token": token,
        "user": {
            "id":    user[0],
            "name":  user[1],
            "email": user[2]
        }
    })