#!/bin/bash

# Script para detener el servidor de Task Manager elegantemente

echo "🛑 Deteniendo Task Manager..."

# Buscar procesos de Node.js relacionados con el servidor
PIDS=$(pgrep -f "node.*server.js" 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No se encontraron procesos del servidor en ejecución"
    exit 0
fi

echo "📋 Procesos encontrados: $PIDS"

# Enviar señal SIGINT para cierre elegante
for pid in $PIDS; do
    echo "📤 Enviando SIGINT al proceso $pid..."
    kill -INT "$pid" 2>/dev/null
done

# Esperar un poco para el cierre elegante
echo "⏳ Esperando cierre elegante..."
sleep 3

# Verificar si los procesos todavía están corriendo
REMAINING_PIDS=$(pgrep -f "node.*server.js" 2>/dev/null)

if [ -n "$REMAINING_PIDS" ]; then
    echo "⚠️  Algunos procesos no se cerraron elegantemente. Forzando cierre..."

    # Forzar cierre con SIGTERM
    for pid in $REMAINING_PIDS; do
        echo "📤 Enviando SIGTERM al proceso $pid..."
        kill -TERM "$pid" 2>/dev/null
    done

    # Esperar un poco más
    sleep 2

    # Verificar de nuevo
    FINAL_PIDS=$(pgrep -f "node.*server.js" 2>/dev/null)

    if [ -n "$FINAL_PIDS" ]; then
        echo "❌ Forzando cierre con SIGKILL..."
        for pid in $FINAL_PIDS; do
            kill -KILL "$pid" 2>/dev/null
        done
    fi
fi

# Limpiar puertos si es necesario
echo "🧹 Limpiando puertos..."
netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | xargs -r kill -9 2>/dev/null

echo "✅ Task Manager detenido correctamente"