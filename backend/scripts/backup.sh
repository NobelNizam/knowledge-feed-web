#!/bin/bash
# Script untuk backup harian PostgreSQL ke MinIO (S3) dengan retention 30 hari

# Load environment variables (contoh, sesuaikan path jika dipanggil via cron)
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '#' | awk '/=/ {print $1}')
fi

# Konfigurasi Backup
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-knowledge}
DB_NAME=${DB_NAME:-knowledge_feed}
# Password dari environment atau dari .pgpass, di sini asumsikan di-pass via PGPASSWORD
export PGPASSWORD=${DB_PASSWORD:-knowledge123}

# Konfigurasi S3/MinIO
S3_ENDPOINT=${S3_ENDPOINT:-http://localhost:9000}
S3_BUCKET=${S3_BUCKET:-s3://knowledge-feed-backups}
S3_ACCESS_KEY=${S3_ACCESS_KEY:-minioadmin}
S3_SECRET_KEY=${S3_SECRET_KEY:-minioadmin}

# Setup path lokal
BACKUP_DIR="/tmp/pg_backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup_${DB_NAME}_${DATE}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Memulai backup database ${DB_NAME}..."

# 1. Dump database ke file gzip
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$FILEPATH"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup lokal sukses: $FILEPATH"
else
  echo "[$(date)] Error: Backup lokal gagal!"
  exit 1
fi

# 2. Upload ke MinIO (menggunakan aws-cli kompatibel S3)
export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"

echo "[$(date)] Uploading ke MinIO bucket ${S3_BUCKET}..."
aws --endpoint-url "$S3_ENDPOINT" s3 cp "$FILEPATH" "${S3_BUCKET}/${FILENAME}"

if [ $? -eq 0 ]; then
  echo "[$(date)] Upload sukses."
else
  echo "[$(date)] Error: Upload ke MinIO gagal!"
  exit 1
fi

# 3. Hapus backup lokal
rm "$FILEPATH"

# 4. Terapkan retention policy (hapus file lebih lama dari 30 hari di MinIO)
# Untuk retention 30 hari secara efisien biasanya dikonfigurasi lewat bucket lifecycle MinIO,
# tetapi bisa juga via skrip sederhana jika perlu. Disarankan setting Bucket Lifecycle Policy di MinIO UI.
echo "[$(date)] Backup selesai. Pastikan S3 bucket lifecycle dikonfigurasi untuk hapus >30 hari."
exit 0
