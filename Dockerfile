FROM oven/bun:1 AS frontend-build
WORKDIR /app/client
COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile
COPY client/ .
RUN bun run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y nginx supervisor && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ ./server/

COPY --from=frontend-build /app/client/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/sites-available/default
COPY deploy/supervisord.conf /etc/supervisor/conf.d/app.conf

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
