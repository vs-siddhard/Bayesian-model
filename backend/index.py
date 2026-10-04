"""
Vercel entrypoint alias exposing the Flask application instance.
"""
from app import app

# Expose WSGI application for Vercel
__all__ = ["app"]
