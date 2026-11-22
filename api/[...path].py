"""Catch-all Vercel Function entrypoint for the FastAPI backend.

Serves every /api/* request in the same project as the Next.js frontend.
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
