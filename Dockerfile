# Gunakan Node versi ringan
FROM node:18-alpine

# Tentukan folder kerja
WORKDIR /app

# Copy file package agar install lebih cepat
COPY package*.json ./

# Install library
RUN npm install --production

# Copy semua kode aplikasi
COPY . .

# Cloud Run mendengarkan di port 8080 secara default
ENV PORT=8080
EXPOSE 8080

# Jalankan server
CMD ["node", "server.js"]