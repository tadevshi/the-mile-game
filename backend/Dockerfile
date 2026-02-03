# Build stage
FROM golang:1.23-alpine3.20 AS builder

WORKDIR /app

# Instalar dependencias de build
RUN apk add --no-cache git

# Copiar go.mod y go.sum
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api/main.go

# Final stage
FROM alpine:3.20

WORKDIR /app

# Instalar ca-certificates para HTTPS
RUN apk --no-cache add ca-certificates

# Copiar el binario desde el builder
COPY --from=builder /app/main .

# Copiar migraciones
COPY --from=builder /app/migrations ./migrations

# Exponer puerto
EXPOSE 8080

# Comando para ejecutar
CMD ["./main"]
