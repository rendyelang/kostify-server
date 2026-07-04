# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL (diperlukan oleh Prisma Engine di lingkungan Linux Debian)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Salin file dependency dan schema Prisma terlebih dahulu (untuk memanfaatkan Docker layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install seluruh dependency (termasuk devDependencies seperti prisma CLI)
RUN npm ci

# Generate Prisma Client agar sesuai dengan arsitektur OS kontainer (Linux Debian)
RUN npx prisma generate

# Salin sisa kode aplikasi
COPY app.js ./
COPY src ./src/

# ==========================================
# Stage 2: Runner (Production Image)
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

# Set environment ke production
ENV NODE_ENV=production
# Google Cloud Run secara default menggunakan port 8080 (akan diinject otomatis ke process.env.PORT)
ENV PORT=8080

# Install OpenSSL untuk runtime Prisma Engine
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Salin file package.json
COPY --from=builder /app/package*.json ./

# Salin node_modules yang sudah berisi Prisma Client yang digenerate di stage builder
COPY --from=builder /app/node_modules ./node_modules

# Salin folder prisma (dibutuhkan oleh beberapa konfigurasi Prisma di runtime)
COPY --from=builder /app/prisma ./prisma

# Salin kode sumber aplikasi dari stage builder
COPY --from=builder /app/app.js ./
COPY --from=builder /app/src ./src

# Ubah kepemilikan direktori kerja ke user non-root 'node' demi keamanan (Security Best Practice)
RUN chown -R node:node /app

# Gunakan user non-root
USER node

# Expose port 8080 untuk Cloud Run
EXPOSE 8080

# Jalankan aplikasi
CMD ["node", "app.js"]
