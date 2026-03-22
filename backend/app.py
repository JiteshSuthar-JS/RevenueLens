from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
import bcrypt
import jwt
import datetime

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = "revenuelens_secret"

# MySQL config
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'root@123'
app.config['MYSQL_DB'] = 'revenuelens'

mysql = MySQL(app)




@app.route('/api/register', methods=['POST'])
def register():

    data = request.get_json()

    name = data["name"]
    email = data["email"]
    password = data["password"]

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    cur = mysql.connection.cursor()

    cur.execute("SELECT * FROM users WHERE email=%s", (email,))
    existing = cur.fetchone()

    if existing:
        return jsonify({"error": "Email already registered"}), 400

    cur.execute(
        "INSERT INTO users (name,email,password) VALUES (%s,%s,%s)",
        (name, email, hashed_password)
    )

    mysql.connection.commit()
    cur.close()

    return jsonify({"message": "User registered successfully"})


@app.route('/api/login', methods=['POST'])
def login():

    data = request.get_json()

    email = data["email"]
    password = data["password"]

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cur.fetchone()
    cur.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    stored_password = user[3]

    if not bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
        return jsonify({"error": "Invalid password"}), 401

    token = jwt.encode(
        {
            "user_id": user[0],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        },
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )

    return jsonify({
        "token": token,
        "user": {
            "id": user[0],
            "name": user[1],
            "email": user[2]
        }
    })


if __name__ == "__main__":
    app.run(debug=True)