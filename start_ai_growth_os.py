"""
AI Growth OS - one-click launcher
Double-click this file (or run: python start_ai_growth_os.py)
Starts API server, Web server, and opens the dashboard in your browser.
"""

import subprocess
import time
import webbrowser
import os

PROJECT_ROOT = r"F:\AI_Growth_OS"
WEB_DIR = os.path.join(PROJECT_ROOT, "apps", "web")
DASHBOARD_URL = "http://localhost:5173"

def open_terminal(title, working_dir, command):
    """Opens a new visible cmd window running the given command."""
    full_cmd = f'start "{title}" cmd /k "cd /d {working_dir} && {command}"'
    subprocess.Popen(full_cmd, shell=True)

def main():
    print("Starting AI Growth OS...")

    # 1. Start API server
    print("  -> Launching API server (port 3000)...")
    open_terminal("AI Growth OS - API", PROJECT_ROOT, "pnpm dev:api")

    # small delay so API has time to boot before web tries to hit it
    time.sleep(3)

    # 2. Start Web server
    print("  -> Launching Web server (port 5173)...")
    open_terminal("AI Growth OS - WEB", WEB_DIR, "pnpm dev")

    # 3. Wait a bit for Vite to boot, then open browser
    print("  -> Waiting for servers to be ready...")
    time.sleep(5)

    print(f"  -> Opening {DASHBOARD_URL}")
    webbrowser.open(DASHBOARD_URL)

    print("\nDone. Two terminal windows are running the servers.")
    print("Keep them open while you use the app.")
    print("Close this window any time (it is not needed anymore).")
    input("\nPress Enter to exit this launcher window...")

if __name__ == "__main__":
    main()
