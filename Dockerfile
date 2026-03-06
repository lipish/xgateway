# Stage 1: Build admin frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/admin
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ ./
RUN npm run build

# Stage 2: Build Rust binary
FROM rust:1-bookworm AS rust-builder
WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Build Rust app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

# Stage 3: Runtime
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN mkdir -p /app/config

COPY --from=rust-builder /app/target/release/xgateway ./xgateway
COPY --from=frontend-builder /app/admin/dist ./admin/dist
COPY config/xgateway.railway.yaml ./config/xgateway.yaml

EXPOSE 8080

CMD ["sh", "-c", "./xgateway --host 0.0.0.0 --port ${PORT:-8080}"]
