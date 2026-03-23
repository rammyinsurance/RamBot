import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const backendPlugin = () => ({
  name: 'backend-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      // Body parser helper
      const getBody = () => new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); }
        });
      });

      if (req.method === 'POST' && req.url === '/api/generate-ui') {
        const body = await getBody();
        const { folderPath, html, css, js } = body;
        try {
          // Resolve absolute path
          const targetDir = path.resolve(process.cwd(), folderPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          if (html) fs.writeFileSync(path.join(targetDir, 'index.html'), html);
          if (css) fs.writeFileSync(path.join(targetDir, 'style.css'), css);
          if (js) fs.writeFileSync(path.join(targetDir, 'script.js'), js);

          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: 'Files generated successfully in ' + targetDir }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      if (req.method === 'POST' && req.url === '/api/git-action') {
        const body = await getBody();
        const { taskId, folderPath } = body;
        try {
          const targetDir = path.resolve(process.cwd(), folderPath);
          const branchName = `feature/task-${taskId}`;

          // Execute git sequence
          // We assume we are in a git repository where the folderPath resides.
          // Since fabricator could be anywhere, we run git commands in the targetDir
          const opts = { cwd: targetDir };

          await execAsync('git checkout main', opts);
          await execAsync('git pull origin main', opts);
          await execAsync(`git checkout -b ${branchName}`, opts);
          await execAsync('git add .', opts);
          await execAsync(`git commit -m "Auto-generated UI for task ${taskId}"`, opts);
          await execAsync(`git push -u origin ${branchName}`, opts);

          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, branch: branchName }));
        } catch (err) {
          console.error('Git error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), backendPlugin()],
  server: {
    proxy: {
      '/azure-api': {
        target: 'https://dev.azure.com',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/azure-api/, '')
      }
    }
  }
});
