import psutil
import requests
import subprocess
from logger import write_system_log

OLLAMA = "http://localhost:11434"


# ---------------- MEMORY ----------------
def get_effective_memory_gb():
    vm = psutil.virtual_memory()
    swap = psutil.swap_memory()

    return (vm.available + swap.free) / (1024 ** 3)


# ---------------- MODEL SIZE ESTIMATOR ----------------
def estimate_model(model):
    model = model.lower()

    if "34b" in model:
        return 20
    if "13b" in model:
        return 10
    if "7b" in model:
        return 6
    if "3b" in model:
        return 3
    if "1b" in model:
        return 1.5

    return 5  # default guess


# ---------------- FETCH MODELS ----------------
def get_models():
    try:
        r = requests.get(f"{OLLAMA}/api/tags")
        return [m["name"] for m in r.json().get("models", [])]
    except:
        return []


# ---------------- SMART FILTER ----------------
def get_compatible_models():

    models = get_models()
    available = get_effective_memory_gb()

    compatible = []
    warn = []
    blocked = []

    for m in models:
        need = estimate_model(m)

        if available >= need:
            compatible.append(m)
        elif available + 2 >= need:
            warn.append(m)
        else:
            blocked.append(m)

    return compatible, warn, blocked


# ---------------- RUNNING MODELS ----------------
def get_running():
    try:
        r = subprocess.run(["ollama", "ps"], capture_output=True, text=True)
        return r.stdout
    except:
        return ""


# ---------------- START MODEL ----------------
def start_model(model):
    available = get_effective_memory_gb()
    need = estimate_model(model)

    if available < need:
        msg = f"BLOCKED: Need {need}GB, have {available:.1f}GB"
        write_system_log(msg)
        return False, msg

    subprocess.Popen(["ollama", "run", model])
    write_system_log(f"Started model: {model}")
    return True, "OK"


# ---------------- STOP MODEL ----------------
def stop_model(model):
    subprocess.run(["ollama", "stop", model])
    write_system_log(f"Stopped model: {model}")