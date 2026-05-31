import os
from datetime import datetime

LOG_FILE = "ollama_api.log"


def write_log(model, prompt, duration, mode="generate"):
    """
    Appends a structured log entry to file
    """

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    entry = (
        f"[{timestamp}] "
        f"MODE={mode} | "
        f"MODEL={model} | "
        f"DURATION={duration}s\n"
        f"PROMPT:\n{prompt}\n"
        f"{'-'*80}\n"
    )

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)