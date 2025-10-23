# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim as builder
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package.json ./
COPY frontend/*.config.* ./
COPY frontend/tsconfig*.json ./
COPY frontend/app.json ./

RUN npm install

ARG EXPO_PUBLIC_API_BASE_URL=/api
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}
ENV NODE_ENV=production

COPY frontend/ ./

RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine as runner
COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
