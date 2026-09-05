import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  build: {
    // src/pages/html/trainings.astro → dist/html/trainings.html（保持原 URL）
    format: 'file',
    // 外链 CSS 产物（dist/_astro/），配合严格 CSP（style-src 'self'，无 unsafe-inline）；
    // 构建脚本负责把 dist/_astro 同步到 public/ 下
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // 产物一律走外链文件：内联脚本/样式会被严格 CSP（无 unsafe-inline）拦截
      assetsInlineLimit: 0,
    },
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
            if (req.url?.startsWith('/html/recruitment-questions.html')) return req.url;
          },
        },
        '/image': 'http://127.0.0.1:5000',
        '/data': 'http://127.0.0.1:5000',
        '/favicon.ico': 'http://127.0.0.1:5000',
      },
    },
  },
});
