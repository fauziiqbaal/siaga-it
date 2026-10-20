import os
import sys
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer

PORT = int(os.environ.get("PORT", 5173))
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class SPAServer(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Resolve path without query parameters
        clean_path = self.path.split("?")[0]
        local_path = os.path.normpath(os.path.join(DIST_DIR, clean_path.lstrip("/")))

        # If asset exists, serve asset
        if os.path.exists(local_path) and not os.path.isdir(local_path):
            return super().do_GET()

        # SPA Fallback for React: rewrite to /index.html
        self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    if not os.path.exists(DIST_DIR):
        print(f"❌ Error: Folder '{DIST_DIR}' tidak ditemukan!")
        sys.exit(1)

    # Allow immediate socket reuse
    TCPServer.allow_reuse_address = True

    with TCPServer(("0.0.0.0", PORT), SPAServer) as httpd:
        print("=================================================")
        print("🚀 Siaga IT Production Server Aktif (Python)")
        print(f"🌐 Running on: http://0.0.0.0:{PORT}")
        print(f"📁 Serving static build from: {DIST_DIR}")
        print("=================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server dihentikan.")
