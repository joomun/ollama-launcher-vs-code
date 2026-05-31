import os
from datetime import datetime

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)


def model_log(model):
    safe = model.replace(":", "_").replace("/", "_")
    return os.path.join(LOG_DIR, f"{safe}.log")


def write_model_log(model, prompt, duration, error=None, mode="generate"):
    path = model_log(model)

    with open(path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] MODE={mode}\n")
        f.write(f"DURATION={duration}s\n")

        if error:
            f.write(f"ERROR={error}\n")

        f.write(f"PROMPT:\n{prompt}\n")
        f.write("-" * 80 + "\n")


def write_system_log(msg):
    with open(os.path.join(LOG_DIR, "system.log"), "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] {msg}\n")


def write_journal(model, prompt, duration):
    with open(os.path.join(LOG_DIR, "journal.log"), "a", encoding="utf-8") as f:
        f.write(
            f"[{datetime.now()}] MODEL={model} | DURATION={duration}s\n{prompt}\n{'='*80}\n"
        )