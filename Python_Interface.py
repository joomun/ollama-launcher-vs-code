import tkinter as tk
from tkinter import ttk, messagebox
import ttkbootstrap as tb
import requests
import subprocess
import threading
import psutil
import os
import time
import sqlite3
from datetime import datetime

OLLAMA_API = "http://localhost:11434"

OLLAMA_EXE = os.path.expandvars(
    r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
)

VSCODE_EXE = os.path.expandvars(
    r"%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe"
)

# ---------------- DATABASE (JOURNAL) ----------------
conn = sqlite3.connect("journal.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT,
    model TEXT,
    prompt TEXT,
    duration REAL
)
""")
conn.commit()


def save_journal(model, prompt, duration):
    cursor.execute(
        "INSERT INTO journal (time, model, prompt, duration) VALUES (?, ?, ?, ?)",
        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), model, prompt, duration)
    )
    conn.commit()


class App:

    def __init__(self, root):
        self.root = root
        self.root.title("Ollama Control Center Pro")
        self.root.geometry("1200x800")

        self.build_ui()
        self.refresh_models()

        threading.Thread(target=self.loop, daemon=True).start()

    # ---------------- UI ----------------
    def build_ui(self):

        top = ttk.Frame(self.root)
        top.pack(fill="x")

        ttk.Button(top, text="Start Ollama", command=self.start_ollama).pack(side="left")
        ttk.Button(top, text="Launch VS Code", command=self.launch_vscode).pack(side="left")

        self.status = ttk.Label(top, text="Status: Unknown")
        self.status.pack(side="right")

        # ---------------- MODELS ----------------
        frame1 = ttk.LabelFrame(self.root, text="Installed Models")
        frame1.pack(fill="x", padx=10, pady=5)

        self.models = tk.Listbox(frame1, height=6)
        self.models.pack(fill="x")

        btns = ttk.Frame(frame1)
        btns.pack(fill="x")

        ttk.Button(btns, text="Refresh", command=self.refresh_models).pack(side="left")
        ttk.Button(btns, text="Load Selected", command=self.load_model).pack(side="left")
        ttk.Button(btns, text="Stop Model", command=self.stop_model).pack(side="left")

        # ---------------- RUNNING MODELS ----------------
        frame2 = ttk.LabelFrame(self.root, text="Running Models (ollama ps)")
        frame2.pack(fill="x", padx=10, pady=5)

        self.running = tk.Listbox(frame2, height=5)
        self.running.pack(fill="x")

        ttk.Button(frame2, text="Refresh Running", command=self.refresh_running).pack()

        # ---------------- SYSTEM ----------------
        frame3 = ttk.LabelFrame(self.root, text="System")
        frame3.pack(fill="x", padx=10, pady=5)

        self.cpu = ttk.Label(frame3)
        self.cpu.pack(anchor="w")

        self.ram = ttk.Label(frame3)
        self.ram.pack(anchor="w")

        # ---------------- JOURNAL ----------------
        frame4 = ttk.LabelFrame(self.root, text="Journal (AI Calls)")
        frame4.pack(fill="both", expand=True, padx=10, pady=5)

        self.journal = tk.Text(frame4, bg="black", fg="lime")
        self.journal.pack(fill="both", expand=True)

        ttk.Button(frame4, text="Refresh Journal", command=self.load_journal).pack()

        self.load_journal()

    # ---------------- OLLAMA CONTROL ----------------
    def start_ollama(self):
        subprocess.Popen([OLLAMA_EXE])

    def stop_model(self):
        model = self.get_selected_running_model()
        if not model:
            return

        self.log(f"Stopping model: {model}")

        subprocess.run(["ollama", "stop", model])

        self.refresh_running()

    def load_model(self):
        model = self.get_selected_model()
        if not model:
            return

        self.log(f"Loading model: {model}")

        subprocess.Popen(["ollama", "run", model])

    def get_selected_model(self):
        sel = self.models.curselection()
        if not sel:
            return None
        return self.models.get(sel[0])

    def get_selected_running_model(self):
        sel = self.running.curselection()
        if not sel:
            return None

        line = self.running.get(sel[0])
        return line.split()[0]

    # ---------------- MODELS ----------------
    def refresh_models(self):
        try:
            r = requests.get(f"{OLLAMA_API}/api/tags").json()
            models = [m["name"] for m in r.get("models", [])]

            self.models.delete(0, tk.END)
            for m in models:
                self.models.insert(tk.END, m)

        except Exception as e:
            self.log(str(e))

    def refresh_running(self):
        try:
            r = subprocess.run(["ollama", "ps"], capture_output=True, text=True)

            self.running.delete(0, tk.END)
            for line in r.stdout.splitlines()[1:]:
                if line.strip():
                    self.running.insert(tk.END, line)

        except Exception as e:
            self.log(str(e))

    # ---------------- JOURNAL ----------------
    def load_journal(self):
        self.journal.delete("1.0", tk.END)

        cursor.execute("SELECT time, model, duration, prompt FROM journal ORDER BY id DESC LIMIT 50")
        rows = cursor.fetchall()

        for r in rows:
            self.journal.insert(
                tk.END,
                f"[{r[0]}] {r[1]} | {r[2]}s\n{r[3][:200]}\n\n"
            )

    # ---------------- SYSTEM LOOP ----------------
    def loop(self):
        while True:
            self.cpu.config(text=f"CPU: {psutil.cpu_percent()}%")
            self.ram.config(text=f"RAM: {psutil.virtual_memory().percent}%")

            try:
                requests.get(f"{OLLAMA_API}/api/tags", timeout=1)
                self.status.config(text="🟢 Running")
            except:
                self.status.config(text="🔴 Offline")

            time.sleep(2)

    def launch_vscode(self):
        subprocess.Popen([VSCODE_EXE])

    def log(self, msg):
        self.journal.insert(tk.END, msg + "\n")
        self.journal.see(tk.END)

    


root = tb.Window(themename="darkly")
app = App(root)
root.mainloop()