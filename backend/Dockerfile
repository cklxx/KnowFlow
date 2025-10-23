# syntax=docker/dockerfile:1
FROM rust:1.81 as builder
WORKDIR /app/backend

COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/services ./services

RUN cargo build --release -p knowflow-api

FROM debian:bookworm-slim as runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/backend/target/release/knowflow-api /usr/local/bin/knowflow-api
COPY backend/services/api/migrations ./migrations

ENV BIND_ADDRESS=0.0.0.0:3000 \
    DATABASE_URL=sqlite:///data/knowflow.db

RUN mkdir -p /data

EXPOSE 3000

CMD ["knowflow-api"]
