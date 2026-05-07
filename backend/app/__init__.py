import importlib
import os
from typing import Optional, Type

from flask import Flask
from marshmallow import ValidationError as MarshmallowValidationError

from app.api import register_api_blueprints
from app.config import Config
from app.extensions import cors, db, jwt, ma
from app.scheduler import init_scheduler
from app.utils.exceptions import AppError
from app.utils.response import error_response


def create_app(config_object: Optional[Type[Config]] = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or Config)

    db.init_app(app)
    ma.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    with app.app_context():
        importlib.import_module("app.models")

        db.create_all()

    register_api_blueprints(app)
    register_error_handlers(app)

    if app.config["SCHEDULER_ENABLED"] and (not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true"):
        init_scheduler(app)

    return app


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(MarshmallowValidationError)
    def handle_validation_error(error: MarshmallowValidationError):
        return error_response(
            message="Validation failed",
            status_code=400,
            errors=error.messages,
        )

    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        return error_response(
            message=error.message,
            status_code=error.status_code,
            errors=error.errors,
        )

    @app.errorhandler(404)
    def handle_404(_error):
        return error_response(message="Endpoint not found", status_code=404)

    @app.errorhandler(405)
    def handle_405(_error):
        return error_response(message="Method not allowed", status_code=405)

    @app.errorhandler(500)
    def handle_500(error):
        app.logger.exception("Unhandled error: %s", error)
        return error_response(message="Internal server error", status_code=500)
