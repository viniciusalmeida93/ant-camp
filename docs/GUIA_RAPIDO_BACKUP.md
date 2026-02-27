# 📦 Guia Rápido de Backup - AntCamp

## Como fazer backup AGORA:
```bash
# 1. Executar script
./scripts/backup-database.sh

# 2. Copiar arquivo gerado para locais seguros
cp backups/antcamp_backup_*.gz ~/Google\ Drive/Backups/
cp backups/antcamp_backup_*.gz /Volumes/PENDRIVE/
```

## Como restaurar um backup:
```bash
# 1. Descomprimir
gunzip backups/antcamp_backup_2026-02-27.sql.gz

# 2. Restaurar
psql -h db.jxuhmqctiyeheamhviob.supabase.co \
     -U postgres \
     -d postgres \
     -f backups/antcamp_backup_2026-02-27.sql
```

## Frequência recomendada:

- ✅ **Diário:** Automático (configurar cron)
- ✅ **Semanal:** Manual + copiar para Google Drive
- ✅ **Mensal:** Copiar para pendrive físico

## Agendar backup automático (opcional):
```bash
# Abrir crontab
crontab -e

# Adicionar linha (backup todo dia às 3h da manhã)
0 3 * * * /caminho/completo/scripts/backup-database.sh
```
