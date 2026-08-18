"""Thread-safe in-process buffer for full sentiment pipeline results (keyed by normalized text hash)."""
from __future__ import annotations

import copy
import hashlib
import threading
import time
from typing import Any, Dict, Optional


_lock = threading.Lock()
_store: dict[str, tuple[float, Dict[str, Any]]] = {}


def cache_key(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def get_cached(key: str, ttl_seconds: float) -> Optional[Dict[str, Any]]:
    now = time.monotonic()
    with _lock:
        hit = _store.get(key)
        if not hit:
            return None
        ts, payload = hit
        if now - ts > ttl_seconds:
            del _store[key]
            return None
        return copy.deepcopy(payload)


def set_cached(key: str, payload: Dict[str, Any]) -> None:
    now = time.monotonic()
    with _lock:
        if len(_store) > 512:
            _store.clear()
        _store[key] = (now, copy.deepcopy(payload))
