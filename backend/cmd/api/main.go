package main

import (
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/the-mile-game/backend/internal/handlers"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/websocket"
)

func main() {
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Configurar modo de Gin
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	// Conectar a la base de datos
	db, err := repository.NewDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Crear repositorios
	playerRepo := repository.NewPlayerRepository(db)
	quizRepo := repository.NewQuizRepository(db)

	// Crear WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Crear handlers con WebSocket hub
	handler := handlers.NewHandler(playerRepo, quizRepo, hub)

	// Configurar router
	r := gin.Default()

	// Configurar CORS
	config := cors.DefaultConfig()

	// Leer allowed origins desde env (comma-separated)
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		// Default fallback
		allowedOrigins = "http://localhost:5173,http://localhost:3000,http://localhost:8081,http://localhost"
	}
	config.AllowOrigins = strings.Split(allowedOrigins, ",")

	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "X-Player-ID"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	log.Printf("CORS enabled for origins: %v", config.AllowOrigins)

	// Rutas API
	api := r.Group("/api")
	{
		// Players
		api.POST("/players", handler.CreatePlayer)
		api.GET("/players/:id", handler.GetPlayer)
		api.GET("/players", handler.ListPlayers)

		// Quiz
		api.POST("/quiz/submit", handler.SubmitQuiz)
		api.GET("/quiz/answers/:playerId", handler.GetQuizAnswers)

		// Ranking
		api.GET("/ranking", handler.GetRanking)
	}

	// WebSocket endpoint (sin /api prefix, igual que health)
	r.GET("/ws", gin.WrapH(hub))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "websocket_clients": hub.GetClientCount()})
	})

	// Iniciar servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("WebSocket endpoint: ws://localhost:%s/ws", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
