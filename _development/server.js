const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '127.0.0.1';
const PROJECT_ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { 'Allow': 'GET, HEAD' });
        res.end('Method Not Allowed');
        return;
    }

    // Strip query parameters (e.g., ?v=1.1.3) to support versioned caching locally
    const urlPath = req.url.split('?')[0];
    
    // Decode URI to support spaces in file names
    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(urlPath);
    } catch {
        res.statusCode = 400;
        res.end('Bad Request');
        return;
    }
    const relativePath = decodedUrl === '/' ? 'index.html' : decodedUrl.replace(/^[/\\]+/, '');
    const filePath = path.resolve(PROJECT_ROOT, relativePath);
    
    // Safety check to prevent directory traversal
    const projectPrefix = PROJECT_ROOT.endsWith(path.sep) ? PROJECT_ROOT : PROJECT_ROOT + path.sep;
    if (filePath !== PROJECT_ROOT && !filePath.startsWith(projectPrefix)) {
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
            // Apply caching for images to speed up local testing on mobile
            const isImage = ['.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(extname.toLowerCase());
            res.writeHead(200, { 
                'Content-Type': contentType,
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'no-referrer',
                'X-Frame-Options': 'DENY',
                'Cache-Control': isImage ? 'public, max-age=3600' : 'no-cache, no-store, must-revalidate',
                'Pragma': isImage ? 'public' : 'no-cache',
                'Expires': isImage ? new Date(Date.now() + 3600000).toUTCString() : '0'
            });
            if (req.method === 'HEAD') {
                res.end();
            } else {
                res.end(content);
            }
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`[MRS LINH 3D] Server dang chay tai: http://${HOST}:${PORT}`);
    console.log(`Vui long click hoac copy link tren mo trong trinh duyet!`);
    console.log(`-----------------------------------------------------`);
});
