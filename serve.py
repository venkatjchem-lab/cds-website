import os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import http.server
httpd = http.server.HTTPServer(('localhost', 3344), http.server.SimpleHTTPRequestHandler)
print('Serving at http://localhost:3344')
httpd.serve_forever()
