import tkinter as tk
from tkinter import ttk, messagebox
import ttkbootstrap as tb
import requests
import subprocess
import threading
import psutil
import os
import time
from datetime import datetime

OLLAMA_API = "http://localhost:11434"

OLLAMA_EXE = os.path.expandvars(
    r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
)

VSCODE_EXE = os.path.expandvars(
    r"%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe"
)


class App:

    def __init__(self, root):
        self.root = root
        self.root.title("Ollama Control Center")
        self.root.geometry("1100x700")

        self.build_ui()

        threading.Thread(
            target=self.refresh_loop,
            daemon=True
        ).start()

    def build_ui(self):

        top = ttk.Frame(self.root)
        top.pack(fill="x")

        ttk.Button(top, text="Start Ollama", command=self.start_ollama).pack(side="left")
        ttk.Button(top, text="Launch VS Code", command=self.launch_vscode).pack(side="left")

        ttk.Button(top, text="Refresh Models", command=self.load_models).pack(side="right")

        self.status = ttk.Label(top, text="Status: Unknown")
        self.status.pack(side="right", padx=10)

        # Installed models
        frame1 = ttk.LabelFrame(self.root, text="Installed Models")
        frame1.pack(fill="x", padx=10, pady=10)

        self.models_box = tk.Listbox(frame1, height=6)
        self.models_box.pack(fill="x")

        # Running models
        frame2 = ttk.LabelFrame(self.root, text="Running Models")
        frame2.pack(fill="x", padx=10, pady=10)

        self.running_box = tk.Listbox(frame2, height=4)
        self.running_box.pack(fill="x")

        # System stats
        frame3 = ttk.LabelFrame(self.root, text="System Stats")
        frame3.pack(fill="x", padx=10, pady=10)

        self.cpu_label = ttk.Label(frame3)
        self.cpu_label.pack(anchor="w")

        self.ram_label = ttk.Label(frame3)
        self.ram_label.pack(anchor="w")

        # Logs
        frame4 = ttk.LabelFrame(self.root, text="Live Logs")
        frame4.pack(fill="both", expand=True, padx=10, pady=10)

        self.logs = tk.Text(frame4, bg="black", fg="lime")
        self.logs.pack(fill="both", expand=True)

        self.load_models()

    # ---------------- LOGGING ----------------
    def log(self, msg):
        self.logs.insert("end", f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")
        self.logs.see("end")

    # ---------------- OLLAMA ----------------
    def start_ollama(self):
        if self.is_up():
            self.log("Ollama already running")
            return

        self.log("Starting Ollama...")
        subprocess.Popen([OLLAMA_EXE])

    def is_up(self):
        try:
            requests.get(f"{OLLAMA_API}/api/tags", timeout=1)
            return True
        except:
            return False

    def load_models(self):
        try:
            r = requests.get(f"{OLLAMA_API}/api/tags").json()
            models = [m["name"] for m in r.get("models", [])]

            self.models_box.delete(0, "end")
            for m in models:
                self.models_box.insert("end", m)

            self.log(f"Loaded {len(models)} models")

        except Exception as e:
            self.log(f"Model load error: {e}")

    def load_running_models(self):
        try:
            r = subprocess.run(
                ["ollama", "ps"],
                capture_output=True,
                text=True
            )

            self.running_box.delete(0, "end")
            for line in r.stdout.splitlines()[1:]:
                if line.strip():
                    self.running_box.insert("end", line)

        except Exception as e:
            self.log(str(e))

    # ---------------- SYSTEM ----------------
    def refresh_loop(self):
        while True:
            try:
                self.cpu_label.config(text=f"CPU: {psutil.cpu_percent()}%")
                self.ram_label.config(text=f"RAM: {psutil.virtual_memory().percent}%")

                if self.is_up():
                    self.status.config(text="🟢 Ollama Running")
                    self.load_running_models()
                else:
                    self.status.config(text="🔴 Ollama Offline")

            except Exception as e:
                self.log(str(e))

            time.sleep(2)

    # ---------------- VS CODE ----------------
    def launch_vscode(self):
        if os.path.exists(VSCODE_EXE):
            subprocess.Popen([VSCODE_EXE])
            self.log("VS Code launched")
        else:
            messagebox.showerror("Error", "VS Code not found")


root = tb.Window(themename="darkly")
app = App(root)
root.mainloop()