from flask import Flask, request, Response
import requests
import time

from logger import write_model_log, write_system_log, write_journal

app = Flask(__name__)

OLLAMA = "http://localhost:11434"


def is_oom(text):
    return "more system memory" in text or "out of memory" in text


@app.route("/api/generate", methods=["POST"])
def generate():

    start = time.time()
    payload = request.json

    model = payload.get("model", "unknown")
    prompt = payload.get("prompt", "")

    try:
        r = requests.post(f"{OLLAMA}/api/generate", json=payload)

        duration = round(time.time() - start, 3)
        text = r.text

        if is_oom(text):
            write_system_log("OOM ERROR DETECTED")
            write_model_log(model, prompt, duration, error="OOM")
        else:
            write_model_log(model, prompt, duration)

        write_journal(model, prompt, duration)

        return Response(text, content_type="application/json")

    except Exception as e:
        write_system_log(str(e))
        raise


@app.route("/api/chat", methods=["POST"])
def chat():

    start = time.time()
    payload = request.json

    model = payload.get("model", "unknown")
    prompt = str(payload.get("messages", []))

    r = requests.post(f"{OLLAMA}/api/chat", json=payload)

    duration = round(time.time() - start, 3)

    write_model_log(model, prompt, duration)
    write_journal(model, prompt, duration)

    return Response(r.text, content_type="application/json")


if __name__ == "__main__":
    app.run(port=11435)