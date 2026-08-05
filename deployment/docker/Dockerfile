# 生产镜像构建文件。构建上下文必须是仓库根目录：
#   docker build -f deployment/docker/Dockerfile -t radio-association:<SHA> .
# 或直接使用 deployment/docker/compose.yaml（推荐，见迁移计划 docs/DOCKER_MIGRATION_PLAN.md）。
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir uv

WORKDIR /app

# 先只拷依赖清单，锁定层缓存：源码变更不触发重装依赖
COPY backend/pyproject.toml backend/uv.lock backend/
RUN cd backend && uv sync --frozen --no-dev

COPY backend/ backend/
COPY public/ public/

WORKDIR /app/backend
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/healthz', timeout=3).status == 200 else 1)"]

CMD [".venv/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000", "--proxy-headers", "--forwarded-allow-ips", "127.0.0.1"]
