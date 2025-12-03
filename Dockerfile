FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci
RUN cd client && npm ci

# Copy source files
COPY . .

# Build client
RUN cd client && npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/client/dist ./client/dist
COPY server ./server

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/index.js"]
