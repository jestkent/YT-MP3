"""YouTube AI Studio — Tkinter desktop app.

Generate a complete faceless-channel video (script, voiceover, visuals, and
a stitched MP4) plus publish-ready metadata from a single topic prompt.

Run with:  python -m youtube_ai_studio.app
"""

from __future__ import annotations

import os
import platform
import subprocess
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk

# Support both `python -m youtube_ai_studio.app` and direct execution.
try:
    from .config import PRESETS, StudioConfig, check_ffmpeg
    from .pipeline import run as run_pipeline
except ImportError:  # pragma: no cover - direct-run fallback
    import sys

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from youtube_ai_studio.config import PRESETS, StudioConfig, check_ffmpeg
    from youtube_ai_studio.pipeline import run as run_pipeline


BG = "#f0f0f0"


class StudioApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("YouTube AI Studio")
        self.root.geometry("720x680")
        self.root.configure(bg=BG)

        self.result = None
        self._build_ui()

        ok, msg = check_ffmpeg()
        if not ok:
            self.log(msg)
            self.status_var.set("ffmpeg not found — install it before generating.")

    # ---- UI construction -------------------------------------------------
    def _build_ui(self):
        frame = tk.Frame(self.root, bg=BG, padx=20, pady=16)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            frame, text="YouTube AI Studio", font=("Arial", 18, "bold"), bg=BG
        ).pack(pady=(0, 4))
        tk.Label(
            frame,
            text="Turn a topic into a full faceless video + metadata.",
            font=("Arial", 10), bg=BG, fg="#555555",
        ).pack(pady=(0, 14))

        form = tk.Frame(frame, bg=BG)
        form.pack(fill=tk.X)

        # Topic
        tk.Label(form, text="Topic / idea:", bg=BG, font=("Arial", 11)).grid(
            row=0, column=0, sticky="w", pady=4
        )
        self.topic_var = tk.StringVar()
        tk.Entry(form, textvariable=self.topic_var, font=("Arial", 11), width=48).grid(
            row=0, column=1, columnspan=3, sticky="we", pady=4
        )

        # Style
        tk.Label(form, text="Style:", bg=BG, font=("Arial", 11)).grid(
            row=1, column=0, sticky="w", pady=4
        )
        self.style_var = tk.StringVar(value="educational")
        ttk.Combobox(
            form, textvariable=self.style_var, width=20,
            values=["educational", "listicle", "story", "motivational",
                    "documentary", "explainer", "top 10"],
        ).grid(row=1, column=1, sticky="w", pady=4)

        # Scenes
        tk.Label(form, text="Scenes:", bg=BG, font=("Arial", 11)).grid(
            row=1, column=2, sticky="e", pady=4, padx=(10, 4)
        )
        self.scenes_var = tk.IntVar(value=5)
        tk.Spinbox(form, from_=1, to=12, textvariable=self.scenes_var, width=6).grid(
            row=1, column=3, sticky="w", pady=4
        )

        # Format
        tk.Label(form, text="Format:", bg=BG, font=("Arial", 11)).grid(
            row=2, column=0, sticky="w", pady=4
        )
        self.preset_var = tk.StringVar(value="landscape")
        ttk.Combobox(
            form, textvariable=self.preset_var, width=20, values=list(PRESETS),
        ).grid(row=2, column=1, sticky="w", pady=4)

        # Voice accent
        tk.Label(form, text="Voice:", bg=BG, font=("Arial", 11)).grid(
            row=2, column=2, sticky="e", pady=4, padx=(10, 4)
        )
        self.voice_var = tk.StringVar(value="US")
        self._voice_map = {
            "US": ("en", "com"), "UK": ("en", "co.uk"),
            "Australia": ("en", "com.au"), "India": ("en", "co.in"),
        }
        ttk.Combobox(
            form, textvariable=self.voice_var, width=12,
            values=list(self._voice_map),
        ).grid(row=2, column=3, sticky="w", pady=4)

        # API key
        tk.Label(form, text="API key:", bg=BG, font=("Arial", 11)).grid(
            row=3, column=0, sticky="w", pady=4
        )
        self.key_var = tk.StringVar(value=os.environ.get("ANTHROPIC_API_KEY", ""))
        tk.Entry(
            form, textvariable=self.key_var, font=("Arial", 11), width=48, show="*"
        ).grid(row=3, column=1, columnspan=3, sticky="we", pady=4)
        tk.Label(
            form, text="(or set ANTHROPIC_API_KEY)", bg=BG, fg="#888888",
            font=("Arial", 8),
        ).grid(row=4, column=1, sticky="w")

        # Output dir
        tk.Label(form, text="Output:", bg=BG, font=("Arial", 11)).grid(
            row=5, column=0, sticky="w", pady=4
        )
        self.out_var = tk.StringVar(value=os.path.abspath("output"))
        tk.Entry(form, textvariable=self.out_var, font=("Arial", 10), width=40).grid(
            row=5, column=1, columnspan=2, sticky="we", pady=4
        )
        tk.Button(form, text="Browse", command=self._choose_dir, bg="#e0e0e0").grid(
            row=5, column=3, sticky="w", pady=4, padx=(6, 0)
        )

        form.columnconfigure(1, weight=1)

        # Generate button
        self.generate_btn = tk.Button(
            frame, text="Generate Video", command=self._start,
            bg="#4CAF50", fg="white", font=("Arial", 12, "bold"), padx=20, pady=10,
        )
        self.generate_btn.pack(pady=14)

        # Progress
        self.progress = ttk.Progressbar(frame, length=560, mode="determinate", maximum=100)
        self.progress.pack(pady=(0, 6))
        self.status_var = tk.StringVar(value="Ready")
        tk.Label(
            frame, textvariable=self.status_var, bg=BG, fg="#555555", font=("Arial", 10)
        ).pack()

        # Log
        self.log_box = scrolledtext.ScrolledText(frame, height=10, font=("Courier", 9))
        self.log_box.pack(fill=tk.BOTH, expand=True, pady=(10, 6))
        self.log_box.configure(state=tk.DISABLED)

        # Open folder button (enabled after success)
        self.open_btn = tk.Button(
            frame, text="Open Output Folder", command=self._open_output,
            state=tk.DISABLED, bg="#e0e0e0",
        )
        self.open_btn.pack()

    # ---- Helpers ---------------------------------------------------------
    def _choose_dir(self):
        d = filedialog.askdirectory(title="Select output directory")
        if d:
            self.out_var.set(d)

    def log(self, message: str):
        self.log_box.configure(state=tk.NORMAL)
        self.log_box.insert(tk.END, message + "\n")
        self.log_box.see(tk.END)
        self.log_box.configure(state=tk.DISABLED)

    def _progress(self, message: str, fraction: float):
        # Called from worker thread — marshal onto the UI thread.
        def update():
            self.status_var.set(message)
            self.progress["value"] = fraction * 100
            self.log(f"[{int(fraction * 100):3d}%] {message}")
        self.root.after(0, update)

    # ---- Run -------------------------------------------------------------
    def _start(self):
        lang, tld = self._voice_map[self.voice_var.get()]
        try:
            config = StudioConfig(
                topic=self.topic_var.get(),
                style=self.style_var.get(),
                scenes=self.scenes_var.get(),
                preset=self.preset_var.get(),
                voice_lang=lang,
                voice_tld=tld,
                output_dir=self.out_var.get(),
                api_key=self.key_var.get().strip() or None,
            )
            config.resolve()
        except ValueError as exc:
            messagebox.showerror("Invalid input", str(exc))
            return

        ok, msg = check_ffmpeg()
        if not ok:
            messagebox.showerror("ffmpeg required", msg)
            return

        self.generate_btn.configure(state=tk.DISABLED)
        self.open_btn.configure(state=tk.DISABLED)
        self.progress["value"] = 0
        threading.Thread(target=self._worker, args=(config,), daemon=True).start()

    def _worker(self, config: StudioConfig):
        try:
            result = run_pipeline(config, self._progress)
            self.result = result
            self.root.after(0, lambda: self._on_success(result))
        except Exception as exc:  # surface any pipeline error
            self.root.after(0, lambda: self._on_error(exc))

    def _on_success(self, result: dict):
        self.generate_btn.configure(state=tk.NORMAL)
        self.open_btn.configure(state=tk.NORMAL)
        self.status_var.set(f"Done: {result['title']}")
        self.log(f"\nVideo:      {result['video']}")
        self.log(f"Thumbnail:  {result['thumbnail']}")
        self.log(f"Metadata:   {result['metadata']}")
        self.log(f"Transcript: {result['transcript']}")
        messagebox.showinfo("Success", f"Video generated:\n{result['video']}")

    def _on_error(self, exc: Exception):
        self.generate_btn.configure(state=tk.NORMAL)
        self.status_var.set("Error")
        self.log(f"\nERROR: {exc}")
        messagebox.showerror("Generation failed", str(exc))

    def _open_output(self):
        if not self.result:
            return
        path = self.result["run_dir"]
        system = platform.system()
        if system == "Windows":
            os.startfile(path)  # type: ignore[attr-defined]
        elif system == "Darwin":
            subprocess.run(["open", path])
        else:
            subprocess.run(["xdg-open", path])


def main():
    root = tk.Tk()
    StudioApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
