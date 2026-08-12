import { defineConfig } from 'astro/config';

export default defineConfig({
  build: {
    // src/pages/html/trainings.astro → dist/html/trainings.html（保持原 URL）
    format: 'file',
    // 把 <style is:global> 的 CSS 内联进 HTML，使 dist 只产出单个 HTML、无 _astro 资源目录
    inlineStylesheets: 'always',
  },
  vite: {
    server: {
      // astro dev 下把其余路径代理到本地后端（5000），保证样式/脚本/图片可加载
      proxy: {
        '/api': 'http://127.0.0.1:5000',
        '/html': {
          target: 'http://127.0.0.1:5000',
          // Astro 自己的页面路由（/html/trainings.html、/html/honors.html）不代理，交给 Astro 处理
          bypass(req) {
            if (req.url?.startsWith('/html/trainings.html')) return req.url;
            if (req.url?.startsWith('/html/honors.html')) return req.url;
            if (req.url?.startsWith('/html/index.html')) return req.url;
            if (req.url?.startsWith('/html/about-association.html')) return req.url;
          },
        },
        '/image': 'http://127.0.0.1:5000',
        '/data': 'http://127.0.0.1:5000',
        '/favicon.ico': 'http://127.0.0.1:5000',
      },
    },
  },
});
