from flask import Blueprint

from app.api.v1.auth.routes import bp as auth_bp
from app.api.v1.accounts.routes import bp as accounts_bp
from app.api.v1.campaigns.routes import bp as campaigns_bp
from app.api.v1.health.routes import bp as health_bp
from app.api.v1.ig_accounts.routes import bp as ig_accounts_bp
from app.api.v1.pages.routes import bp as pages_bp


api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")
api_v1_bp.register_blueprint(health_bp)
api_v1_bp.register_blueprint(auth_bp)
api_v1_bp.register_blueprint(accounts_bp)
api_v1_bp.register_blueprint(pages_bp)
api_v1_bp.register_blueprint(ig_accounts_bp)
api_v1_bp.register_blueprint(campaigns_bp)

