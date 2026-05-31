import tkinter as tk
from tkinter import ttk
import ttkbootstrap as tb
import psutil
import os

from model_manager import get_models, get_running, start_model, stop_model

LOG_DIR = "logs"


class App:

    def __init__(self, root):
        self.root = root
        self.root.title("Ollama Smart Model Manager (Stable UI)")
        self.root.geometry("1300x850")

        # cache to prevent UI spam
        self.last_running = ""

        self.build_ui()

        self.refresh_models()
        self.loop()

    # ---------------- UI ----------------
    def build_ui(self):

        top = ttk.Frame(self.root)
        top.pack(fill="x")

        ttk.Button(top, text="Start Ollama", command=self.start_ollama).pack(side="left")
        ttk.Button(top, text="Refresh Models", command=self.refresh_models).pack(side="left")

        self.mem_label = ttk.Label(top, text="")
        self.mem_label.pack(side="right")

        # ---------------- MODELS ----------------
        frame1 = ttk.LabelFrame(self.root, text="Models")
        frame1.pack(fill="x", padx=10, pady=5)

        self.models = tk.Listbox(frame1, height=6)
        self.models.pack(fill="x")

        btns = ttk.Frame(frame1)
        btns.pack(fill="x")

        ttk.Button(btns, text="Run", command=self.run_model).pack(side="left")
        ttk.Button(btns, text="Stop", command=self.stop_model).pack(side="left")

        # ---------------- RUNNING ----------------
        frame2 = ttk.LabelFrame(self.root, text="Running Models (Live)")
        frame2.pack(fill="x", padx=10, pady=5)

        self.running_box = tk.Text(frame2, height=6)
        self.running_box.pack(fill="x")

        # ---------------- SYSTEM ----------------
        frame3 = ttk.LabelFrame(self.root, text="System")
        frame3.pack(fill="x", padx=10, pady=5)

        self.sys = ttk.Label(frame3, text="")
        self.sys.pack(anchor="w")

        # ---------------- LOGS ----------------
        frame4 = ttk.LabelFrame(self.root, text="Logs")
        frame4.pack(fill="both", expand=True, padx=10, pady=5)

        self.logs = tk.Text(frame4, bg="black", fg="lime")
        self.logs.pack(fill="both", expand=True)

    # ---------------- ACTIONS ----------------
    def start_ollama(self):
        os.system("start ollama")

    def refresh_models(self):
        self.models.delete(0, tk.END)
        for m in get_models():
            self.models.insert(tk.END, m)

    def run_model(self):
        sel = self.models.curselection()
        if not sel:
            return

        model = self.models.get(sel[0])
        ok, msg = start_model(model)
        self.append(msg)

    def stop_model(self):
        sel = self.models.curselection()
        if not sel:
            return

        model = self.models.get(sel[0])
        stop_model(model)

    # ---------------- LIVE LOOP (NO THREADS, NO FLICKER) ----------------
    def loop(self):

        # system stats
        ram = psutil.virtual_memory()
        swap = psutil.swap_memory()

        self.mem_label.config(
            text=f"RAM: {ram.percent}% | Swap: {swap.percent}%"
        )

        self.sys.config(
            text=f"Available RAM: {ram.available // (1024**3)} GB"
        )

        # running models (ONLY UPDATE IF CHANGED)
        running = get_running()

        if running != self.last_running:
            self.running_box.delete("1.0", tk.END)

            for line in running.splitlines():
                status = "🟢 " if line.strip() else "⚪ "
                self.running_box.insert(tk.END, status + line + "\n")

            self.last_running = running

        # repeat loop safely
        self.root.after(1000, self.loop)

    # ---------------- LOG APPEND ----------------
    def append(self, msg):
        self.logs.insert(tk.END, msg + "\n")
        self.logs.see(tk.END)


root = tb.Window(themename="darkly")
app = App(root)
root.mainloop()