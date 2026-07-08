# Gunakan image resmi Node.js LTS (alpine untuk ukuran image yang kecil dan efisien)
FROM node:18-alpine

# Set working directory di dalam kontainer
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu untuk memanfaatkan caching Docker layer
COPY package*.json ./

# Salin direktori prisma (skema database) untuk men-generate Prisma Client
COPY prisma ./prisma/

# Install seluruh dependencies (termasuk devDependencies karena dibutuhkan untuk compile TypeScript)
RUN npm ci

# Generate Prisma Client secara eksplisit agar library database siap digunakan
RUN npx prisma generate

# Salin seluruh kode sumber proyek ke dalam kontainer
COPY . .

# Build proyek TypeScript ke JavaScript (disimpan di folder dist/)
RUN npm run build

# Port yang akan digunakan oleh server Express API
EXPOSE 3001

# Default command untuk menjalankan API server
CMD ["npm", "start"]
