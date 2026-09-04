const fs = require('fs');
const file = '/app/applet/server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\/\/ Vite middleware for development[\s\S]*?app\.use\(vite\.middlewares\);/,
  `// Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    let viteReady = false;
    let viteMiddlewares;
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      viteMiddlewares = vite.middlewares;
      viteReady = true;
    });
    
    app.use((req, res, next) => {
      if (viteReady) {
        viteMiddlewares(req, res, next);
      } else {
        const check = setInterval(() => {
          if (viteReady) {
            clearInterval(check);
            viteMiddlewares(req, res, next);
          }
        }, 100);
      }
    });`
);

fs.writeFileSync(file, code);
