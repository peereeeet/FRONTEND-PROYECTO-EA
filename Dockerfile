# syntax=docker/dockerfile:1

# ==============================================================================
# BASE STAGE
# Used for both development and production build.
# ==============================================================================
FROM node:24-alpine AS base
WORKDIR /app
# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# ==============================================================================
# DEVELOPMENT STAGE
# Optimized for local development with hot-reload.
# Usage: docker compose up (uses docker-compose.override.yml)
# ==============================================================================
FROM base AS dev
# We don't copy source here because we bind-mount it in docker-compose.
# Expose default Angular port
EXPOSE 4200
# Bind to 0.0.0.0 to make it accessible from outside the container
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]

# ==============================================================================
# BUILD STAGE
# Compiles the application for production.
# ==============================================================================
FROM base AS builder
COPY . .
RUN npm run build --prod

# ==============================================================================
# PRODUCTION STAGE
# Serves the built artifact using Nginx.
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up
# ==============================================================================
FROM nginx:alpine AS prod
# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist/front-end-angular/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
