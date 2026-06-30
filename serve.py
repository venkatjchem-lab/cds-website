import os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import http.server
port = int(os.environ.get('PORT', '3344'))
# ThreadingHTTPServer so parallel browser requests don't block each other
Server = getattr(http.server, 'ThreadingHTTPServer', http.server.HTTPServer)
httpd = Server(('localhost', port), http.server.SimpleHTTPRequestHandler)
print('Serving at http://localhost:%d' % port)
httpd.serve_forever()
