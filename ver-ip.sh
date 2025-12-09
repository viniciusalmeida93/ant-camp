#!/bin/bash

# Script para ver IP da máquina
echo "🌐 IPs disponíveis para acesso no celular:"
echo ""

# Linux/Mac
if command -v hostname &> /dev/null; then
    echo "Hostname: $(hostname)"
    echo ""
fi

# Mostrar todos os IPs
if command -v ip &> /dev/null; then
    echo "IPs da rede:"
    ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print "  → " $2}'
elif command -v ifconfig &> /dev/null; then
    echo "IPs da rede:"
    ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print "  → " $2}'
fi

echo ""
echo "📱 Para acessar no celular:"
echo "1. Inicie o servidor: npm run dev -- --host"
echo "2. Acesse no celular: http://[IP-ACIMA]:5173/app"
echo "3. Celular e computador devem estar na MESMA REDE WiFi"
