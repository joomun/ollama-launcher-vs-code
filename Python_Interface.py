import tkinter as tk
from tkinter import ttk
import ttkbootstrap as tb
import psutil
import threading
import time
import os

from model_manager import (
    get_compatible_models,
    get_running,
    start_model,
    stop_model
)

LOG_DIR = "logs"


class App:

    def __init__(self, root):
        self.root = root
        self.root.title("Ollama Smart Model Manager")
        self.root.geometry("1300x850")

        self.build_ui()

        threading.Thread(target=self.loop, daemon=True).start()

    # ---------------- UI ----------------
    def build_ui(self):

        top = ttk.Frame(self.root)
        top.pack(fill="x")

        ttk.Button(top, text="Refresh Smart Models", command=self.refresh_models).pack(side="left")

        self.mem_label = ttk.Label(top, text="")
        self.mem_label.pack(side="right")

        # ---------------- COMPATIBLE ----------------
        frame1 = ttk.LabelFrame(self.root, text="✅ Compatible Models")
        frame1.pack(fill="x", padx=10, pady=5)

        self.ok_list = tk.Listbox(frame1, height=5)
        self.ok_list.pack(fill="x")

        ttk.Button(frame1, text="Run Selected", command=self.run_ok).pack()

        # ---------------- WARNING ----------------
        frame2 = ttk.LabelFrame(self.root, text="⚠ Might Run (Low Memory Risk)")
        frame2.pack(fill="x", padx=10, pady=5)

        self.warn_list = tk.Listbox(frame2, height=4)
        self.warn_list.pack(fill="x")

        ttk.Button(frame2, text="Run Anyway", command=self.run_warn).pack()

        # ---------------- BLOCKED ----------------
        frame3 = ttk.LabelFrame(self.root, text="❌ Too Heavy for System")
        frame3.pack(fill="x", padx=10, pady=5)

        self.block_list = tk.Listbox(frame3, height=4)
        self.block_list.pack(fill="x")

        # ---------------- RUNNING ----------------
        frame4 = ttk.LabelFrame(self.root, text="Running Models")
        frame4.pack(fill="x", padx=10, pady=5)

        self.running = tk.Text(frame4, height=5)
        self.running.pack(fill="x")

        # ---------------- SYSTEM ----------------
        frame5 = ttk.LabelFrame(self.root, text="System")
        frame5.pack(fill="x", padx=10, pady=5)

        self.sys = ttk.Label(frame5)
        self.sys.pack(anchor="w")

        self.refresh_models()

    # ---------------- REFRESH ----------------
    def refresh_models(self):

        ok, warn, bad = get_compatible_models()

        self.ok_list.delete(0, tk.END)
        self.warn_list.delete(0, tk.END)
        self.block_list.delete(0, tk.END)

        for m in ok:
            self.ok_list.insert(tk.END, m)

        for m in warn:
            self.warn_list.insert(tk.END, m)

        for m in bad:
            self.block_list.insert(tk.END, m)

    # ---------------- RUN OK ----------------
    def run_ok(self):
        sel = self.ok_list.curselection()
        if not sel:
            return

        model = self.ok_list.get(sel[0])
        start_model(model)

    # ---------------- RUN WARN ----------------
    def run_warn(self):
        sel = self.warn_list.curselection()
        if not sel:
            return

        model = self.warn_list.get(sel[0])
        start_model(model)

    # ---------------- LOOP ----------------
    def loop(self):

        while True:

            ram = psutil.virtual_memory()
            swap = psutil.swap_memory()

            self.sys.config(
                text=f"RAM: {ram.percent}% | Swap: {swap.percent}%"
            )

            try:
                self.running.delete("1.0", tk.END)
                self.running.insert(tk.END, get_running())
            except:
                pass

            time.sleep(2)


root = tb.Window(themename="darkly")
app = App(root)
root.mainloop()