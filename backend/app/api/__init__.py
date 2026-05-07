from flask import Flask

from app.api.v1 import api_v1_bp


def register_api_blueprints(app: Flask) -> None:
    app.register_blueprint(api_v1_bp)
