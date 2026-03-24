FROM oven/bun:1 AS frontend-build
WORKDIR /app/client
COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile
COPY client/ .
RUN bun run build

FROM python:3.12-slim AS production
WORKDIR /app

# Install nginx
RUN apt-get update && apt-get install -y nginx supervisor && rm -rf /var/lib/apt/lists/*

# Python backend
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ ./server/

# Frontend static files
COPY --from=frontend-build /app/client/dist /usr/share/nginx/html

# Nginx config
COPY <<'NGINX' /etc/nginx/sites-available/default
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

# Supervisor to run both nginx and uvicorn
COPY <<'SUPERVISOR' /etc/supervisor/conf.d/app.conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:backend]
command=uvicorn main:app --host 0.0.0.0 --port 8000
directory=/app/server
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
SUPERVISOR

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
