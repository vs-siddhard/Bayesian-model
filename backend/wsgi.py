"""
WSGI entrypoint for Vercel deployment.
"""
from app import app

# Expose WSGI application for Vercel
__all__ = ["app"]
