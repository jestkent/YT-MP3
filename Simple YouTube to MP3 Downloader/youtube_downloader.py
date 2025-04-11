# ytmp3.py - YouTube to MP3 Downloader v1.0

import os
import sys
import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter import ttk
import threading
import subprocess

class SimpleYouTubeDownloader:
    def __init__(self, root):
        self.root = root
        self.root.title("Simple YouTube to MP3 Downloader")
        self.root.geometry("600x350")
        self.root.configure(bg="#f0f0f0")
        
        self.check_requirements()
        
        self.url_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Ready")
        
        self.create_ui()
    
    def check_requirements(self):
        ffmpeg_path = r"C:\Program Files\ffmpeg-2025-03-03-git-d21ed2298e-full_build\bin"
        os.environ["PATH"] += os.pathsep + ffmpeg_path
        
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "yt-dlp"], 
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            self.show_error_message("Error", f"yt-dlp install failed: {e}")
        
        if not self.is_tool("ffmpeg") or not self.is_tool("ffprobe"):
            self.show_error_message(
                "Error",
                "ffmpeg and/or ffprobe not found.\nPlease install them and add to your PATH."
            )
    
    def is_tool(self, name):
        from shutil import which
        return which(name) is not None

    def create_ui(self):
        frame = tk.Frame(self.root, bg="#f0f0f0", padx=20, pady=20)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(frame, text="Simple YouTube to MP3 Downloader", font=("Arial", 16, "bold"), bg="#f0f0f0").pack(pady=(0, 20))

        url_frame = tk.Frame(frame, bg="#f0f0f0")
        url_frame.pack(fill=tk.X, pady=10)

        tk.Label(url_frame, text="YouTube URL:", bg="#f0f0f0", font=("Arial", 12)).pack(side=tk.LEFT, padx=(0, 10))
        tk.Entry(url_frame, textvariable=self.url_var, font=("Arial", 12), width=40).pack(side=tk.LEFT, fill=tk.X, expand=True)
        tk.Button(url_frame, text="Paste", command=self.paste_url, bg="#e0e0e0").pack(side=tk.RIGHT, padx=(10, 0))

        tk.Button(frame, text="Download MP3", command=self.start_download, 
                  bg="#4CAF50", fg="white", font=("Arial", 12, "bold"), padx=20, pady=10).pack(pady=20)

        self.status_label = tk.Label(frame, textvariable=self.status_var, bg="#f0f0f0", font=("Arial", 10), fg="#555555")
        self.status_label.pack(fill=tk.X, pady=10)

        self.progress_bar = ttk.Progressbar(frame, length=400, mode="determinate", maximum=100)
        self.progress_bar.pack(pady=10)

    def paste_url(self):
        try:
            self.url_var.set(self.root.clipboard_get())
        except:
            pass

    def start_download(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Error", "Please enter a YouTube URL")
            return

        download_dir = filedialog.askdirectory(title="Select Download Directory")
        if not download_dir:
            return

        threading.Thread(target=self.download_mp3, args=(url, download_dir), daemon=True).start()

    def download_mp3(self, url, download_dir):
        try:
            self.status_var.set("Downloading... Please wait")
            self.root.update_idletasks()

            cmd = [
                "yt-dlp",
                "--no-cache-dir", "--force-overwrites",
                "--restrict-filenames",
                "-x", "--audio-format", "mp3", "--audio-quality", "0",
                "--ffmpeg-location", r"C:\Program Files\ffmpeg-2025-03-03-git-d21ed2298e-full_build\bin",
                "-o", os.path.join(download_dir, "%(title)s.%(ext)s"),
                url
            ]

            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

            for line in process.stdout:
                if "[download]" in line:
                    progress = self.extract_progress(line)
                    if progress is not None:
                        self.progress_bar['value'] = progress
                        self.root.update_idletasks()

            process.wait()
            if process.returncode == 0:
                self.status_var.set("Download completed successfully!")
                messagebox.showinfo("Success", "Download completed successfully!")
            else:
                self.status_var.set("Download failed.")
                self.show_error_message("Error", "Download failed. Please try again.")
        except Exception as e:
            self.status_var.set("Error occurred.")
            self.show_error_message("Error", str(e))

    def extract_progress(self, line):
        import re
        match = re.search(r"\[download\] *(\d+)%", line)
        return int(match.group(1)) if match else None

    def show_error_message(self, title, message):
        error_dialog = tk.Toplevel(self.root)
        error_dialog.title(title)
        error_dialog.geometry("400x200")
        error_dialog.configure(bg="#f0f0f0")

        tk.Label(error_dialog, text=message, bg="#f0f0f0", wraplength=380).pack(pady=20, padx=20)
        tk.Button(error_dialog, text="Copy", command=lambda: self.copy_to_clipboard(message)).pack(pady=10)
        tk.Button(error_dialog, text="Close", command=error_dialog.destroy).pack(pady=10)

    def copy_to_clipboard(self, text):
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.root.update()

# Safeguard to prevent recursive launching when bundled with PyInstaller
if __name__ == "__main__":
    root = tk.Tk()
    app = SimpleYouTubeDownloader(root)
    root.mainloop()
