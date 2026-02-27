import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:3105"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

def post(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, json.dumps(data).encode(), headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error POST {path}: {e}")
        return None

def put(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, json.dumps(data).encode(), headers, method="PUT")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error PUT {path}: {e}")
        return None

def get(path, token):
    url = f"{BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error GET {path}: {e}")
        return None

# Login
print("Logging in...")
login_res = post("/api/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
if not login_res or not login_res.get("success"):
    print("Login failed")
    sys.exit(1)

token = login_res["data"]["token"]
print("Login success.")

# Get Instances
print("Fetching instances...")
instances_res = get("/api/instances", token)
if instances_res and instances_res.get("success"):
    instances = instances_res["data"]
    for inst in instances:
        if not inst.get('enabled'):
            print(f"Enabling provider: {inst.get('name')} (ID: {inst.get('id')})")
            # Update to enabled
            update_res = put(f"/api/instances/{inst.get('id')}", {"enabled": True}, token)
            if update_res and update_res.get("success"):
                print("  Success")
            else:
                print(f"  Failed: {update_res}")
        else:
            print(f"Provider {inst.get('name')} is already enabled.")
else:
    print("Failed to fetch instances")
