const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    // Strip query parameters (e.g., ?v=1.1.3) to support versioned caching locally
    const urlPath = req.url.split('?')[0];
    
    // Decode URI to support spaces in file names
    let decodedUrl = decodeURIComponent(urlPath);
    let filePath = path.join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
    
    // Safety check to prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
    }
    
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname.toLowerCase()] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('404: File Not Found');
            } else {
                res.statusCode = 500;
                res.end(`500: Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`[MRS LINH 3D] Server dang chay tai: http://localhost:${PORT}`);
    console.log(`Vui long click hoac copy link tren mo trong trinh duyet!`);
    console.log(`-----------------------------------------------------`);
});
