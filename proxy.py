from flask import Flask, request, Response
import requests
import time
from datetime import datetime

app = Flask(__name__)

OLLAMA = "http://localhost:11434"

LOG_FILE = "ollama_requests.log"


def log(data):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(data + "\n")


@app.route("/api/generate", methods=["POST"])
def generate():

    start = time.time()
    payload = request.json

    model = payload.get("model")
    prompt = payload.get("prompt")

    print(f"\n[{datetime.now()}]")
    print("MODEL:", model)
    print("PROMPT:", prompt[:300])

    log(f"{datetime.now()} | {model} | {prompt[:200]}")

    r = requests.post(
        f"{OLLAMA}/api/generate",
        json=payload,
        stream=True
    )

    duration = round(time.time() - start, 2)

    print("Duration:", duration, "s")

    return Response(r.content, content_type="application/json")


@app.route("/api/chat", methods=["POST"])
def chat():

    start = time.time()
    payload = request.json

    model = payload.get("model")

    print(f"\n[{datetime.now()}]")
    print("CHAT MODEL:", model)

    r = requests.post(
        f"{OLLAMA}/api/chat",
        json=payload,
        stream=True
    )

    duration = round(time.time() - start, 2)

    print("Duration:", duration)

    return Response(r.content, content_type="application/json")


if __name__ == "__main__":
    app.run(port=11435, debug=False)