import os
import sys
from pathlib import Path

# Inject test environment credentials for isolated test runs
os.environ.setdefault(
    "ALLOWED_EMAILS",
    "tyra.theknath@jfll.com,deepak@jfll.com,akash.dhara@jfll.com,snehal.birje@jfll.com",
)
os.environ.setdefault(
    "AUTH_USER_PROFILES_JSON",
    '{"tyra.theknath@jfll.com":{"name":"Tyra Theknath","role":"Leadership"},"deepak@jfll.com":{"name":"Deepak Naidu","role":"Tech Lead"},"akash.dhara@jfll.com":{"name":"Akash Dhara","role":"Operations"},"snehal.birje@jfll.com":{"name":"Snehal Birje","role":"Commercial"}}',
)

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
