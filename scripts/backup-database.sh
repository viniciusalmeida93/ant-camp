#!/bin/bash

# 🔐 Script de Backup Automático - AntCamp Database
# Uso: ./scripts/backup-database.sh

# Configurações
PROJECT_REF="jxuhmqctiyeheamhviob"
DB_PASSWORD="COLOCAR_SENHA_AQUI"  # Pegar em Supabase → Settings → Database
BACKUP_DIR="./backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="antcamp_backup_$DATE.sql"

echo "🔄 Iniciando backup do banco de dados..."
echo "📅 Data/Hora: $DATE"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR
echo "📁 Diretório de backup: $BACKUP_DIR"

# Fazer backup usando pg_dump
echo "⏳ Exportando banco de dados..."
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.$PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F p \
  --no-owner \
  --no-acl \
  -f $BACKUP_DIR/$BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup SQL criado: $BACKUP_DIR/$BACKUP_FILE"
    
    # Comprimir
    echo "🗜️ Comprimindo backup..."
    gzip $BACKUP_DIR/$BACKUP_FILE
    echo "✅ Backup comprimido: $BACKUP_DIR/$BACKUP_FILE.gz"
    
    # Calcular tamanho
    SIZE=$(du -h $BACKUP_DIR/$BACKUP_FILE.gz | cut -f1)
    echo "📦 Tamanho do arquivo: $SIZE"
    
    # Manter apenas últimos 7 backups
    echo "🧹 Removendo backups antigos..."
    ls -t $BACKUP_DIR/*.gz | tail -n +8 | xargs -r rm
    echo "✅ Mantidos últimos 7 backups"
    
    # Listar backups existentes
    echo ""
    echo "📋 Backups disponíveis:"
    ls -lh $BACKUP_DIR/*.gz
    
    echo ""
    echo "🎉 Backup concluído com sucesso!"
    echo "💾 Lembre-se de copiar para:"
    echo "   1. Google Drive / Dropbox"
    echo "   2. Pendrive externo"
else
    echo "❌ Erro ao criar backup!"
    exit 1
fi
