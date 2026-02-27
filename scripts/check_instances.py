import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:3105"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

def post(path, data):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, json.dumps(data).encode(), headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error: {e}")
        return None

def get(path, token):
    url = f"{BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error: {e}")
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
    print(f"Found {len(instances)} instances:")
    for inst in instances:
        print(f" - ID: {inst.get('id')}, Name: {inst.get('name')}, Enabled: {inst.get('enabled')}, Type: {inst.get('provider_type')}")
else:
    print("Failed to fetch instances")
