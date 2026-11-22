"""Vercel Function entrypoint for the FastAPI backend.

Vercel serves this at /api/* in the same project as the Next.js frontend,
so the browser talks to a single origin and no CORS proxy is needed.
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
