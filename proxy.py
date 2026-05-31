from flask import Flask, request, Response
import requests
import time

from logger import write_log

app = Flask(__name__)

OLLAMA = "http://localhost:11434"


@app.route("/api/generate", methods=["POST"])
def generate():

    start = time.time()
    payload = request.json

    model = payload.get("model", "unknown")
    prompt = payload.get("prompt", "")

    response = requests.post(
        f"{OLLAMA}/api/generate",
        json=payload
    )

    duration = round(time.time() - start, 3)

    write_log(model, prompt, duration, mode="generate")

    return Response(response.content, content_type="application/json")


@app.route("/api/chat", methods=["POST"])
def chat():

    start = time.time()
    payload = request.json

    model = payload.get("model", "unknown")

    messages = payload.get("messages", [])
    prompt = str(messages)

    response = requests.post(
        f"{OLLAMA}/api/chat",
        json=payload
    )

    duration = round(time.time() - start, 3)

    write_log(model, prompt, duration, mode="chat")

    return Response(response.content, content_type="application/json")


if __name__ == "__main__":
    app.run(port=11435)