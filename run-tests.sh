#!/bin/bash

# Script para ejecutar tests del backend

echo "=== Running Backend Tests ==="
cd "$(dirname "$0")/backend" || exit 1

# Ejecutar todos los tests
echo ""
echo "1. Running unit tests..."
go test -v ./internal/services/... -cover

# Verificar resultado
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Some tests failed"
    exit 1
fi

# Mostrar cobertura
echo ""
echo "2. Generating coverage report..."
go test -coverprofile=coverage.out ./internal/services/...
go tool cover -func=coverage.out

echo ""
echo "=== Tests Complete ==="
