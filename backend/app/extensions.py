import json
import os

import firebase_admin
from firebase_admin import credentials, firestore
from flask_cors import CORS
from flask_jwt_extended import JWTManager

cors = CORS()
jwt = JWTManager()
scheduler = None

_firestore_client = None


def init_firebase(credentials_file: str) -> None:
    global _firestore_client
    if _firestore_client is not None:
        return

    if not firebase_admin._apps:
        credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if credentials_json:
            cred = credentials.Certificate(json.loads(credentials_json))
            firebase_admin.initialize_app(cred)
        elif os.path.exists(credentials_file):
            cred = credentials.Certificate(credentials_file)
            firebase_admin.initialize_app(cred)
        else:
            raise RuntimeError(
                "Firebase credentials không tìm thấy. "
                "Đặt FIREBASE_CREDENTIALS_JSON hoặc FIREBASE_CREDENTIALS_FILE."
            )

    _firestore_client = firestore.client()


def get_firestore():
    if _firestore_client is None:
        raise RuntimeError("Firebase chưa được khởi tạo. Gọi init_firebase() trước.")
    return _firestore_client
