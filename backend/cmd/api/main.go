package main

import (
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/the-mile-game/backend/internal/handlers"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
	"github.com/the-mile-game/backend/internal/websocket"
)

// webSocketEventValidator implementa websocket.EventValidator usando EventRepository
type webSocketEventValidator struct {
	eventRepo *repository.EventRepository
}

func (v *webSocketEventValidator) ValidateEvent(slug string) error {
	event, err := v.eventRepo.GetBySlug(slug)
	if err != nil {
		return err
	}
	// Verificar que el evento esté activo
	if !event.IsActive {
		return &eventInactiveError{slug: slug}
	}
	return nil
}

type eventInactiveError struct {
	slug string
}

func (e *eventInactiveError) Error() string {
	return "event is inactive"
}

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
	uploadPath := os.Getenv("UPLOAD_PATH")
	if uploadPath == "" {
		uploadPath = "./uploads"
	}
	postcardRepo := repository.NewPostcardRepository(db, uploadPath)
	userRepo := repository.NewUserRepository(db)
	eventRepo := repository.NewEventRepository(db)
	quizQuestionRepo := repository.NewQuizQuestionRepository(db)
	themeRepo := repository.NewThemeRepository(db)

	// Crear servicios
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if ginMode == "release" {
			log.Fatal("JWT_SECRET is required in release mode")
		}
		jwtSecret = "default-secret-change-in-production"
		log.Println("Warning: Using default JWT secret. Set JWT_SECRET env var in production!")
	}
	authService := services.NewAuthService(userRepo, jwtSecret)
	themeService := services.NewThemeService(themeRepo, eventRepo)

	// WebSocket event validator - valida que el evento existe y está activo
	eventValidator := &webSocketEventValidator{eventRepo: eventRepo}

	// Crear WebSocket Hub con validador de eventos
	hub := websocket.NewHubWithValidator(eventValidator)
	go hub.Run()

	// Crear handlers
	uploadsDir := os.Getenv("UPLOADS_DIR")
	if uploadsDir == "" {
		uploadsDir = uploadPath + "/postcards"
	}
	handler := handlers.NewHandler(playerRepo, quizRepo, quizQuestionRepo, postcardRepo, hub, uploadsDir)
	authHandler := handlers.NewAuthHandler(authService)
	themeHandler := handlers.NewThemeHandler(themeService)
	adminQuestionHandler := handlers.NewAdminQuestionHandler(quizQuestionRepo, eventRepo)

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
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Player-ID", "X-Secret-Token", "X-Admin-Key"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	log.Printf("CORS enabled for origins: %v", config.AllowOrigins)

	// Middlewares
	eventMiddleware := middleware.EventMiddleware(eventRepo)
	authMiddleware := middleware.AuthMiddleware(authService)

	// Rutas API
	api := r.Group("/api")
	{
		// Auth (público)
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/refresh", authHandler.Refresh)

		// Auth (protegido)
		auth := api.Group("/auth")
		auth.Use(authMiddleware)
		{
			auth.GET("/me", authHandler.Me)
			auth.POST("/logout", authHandler.Logout)
		}

		// Theme presets (public)
		api.GET("/themes/presets", themeHandler.GetPresets)

		// Event-scoped routes (nuevas - multi-event)
		events := api.Group("/events/:slug")
		events.Use(eventMiddleware)
		{
			// Event info
			events.GET("", func(c *gin.Context) {
				event, _ := c.Get("event")
				c.JSON(200, event)
			})

			// Theme
			events.GET("/theme", themeHandler.GetTheme)

			// Players
			events.POST("/players", handler.CreatePlayerScoped)
			events.GET("/players", handler.ListPlayersScoped)

			// Quiz
			quiz := events.Group("/quiz")
			quiz.Use(middleware.QuizFeatureMiddleware())
			{
				quiz.GET("/questions", handler.GetQuizQuestions)
				quiz.POST("/submit", handler.SubmitQuiz)
				quiz.GET("/answers/:playerId", handler.GetQuizAnswers)
			}

			// Ranking
			events.GET("/ranking", handler.GetRanking)

			// Postcards (Corkboard)
			corkboard := events.Group("/postcards")
			corkboard.Use(middleware.CorkboardFeatureMiddleware())
			{
				corkboard.POST("", handler.CreatePostcard)
				corkboard.GET("", handler.ListPostcards)
			}

			// Secret Box
			secretBox := events.Group("/secret-box")
			secretBox.Use(middleware.SecretBoxFeatureMiddleware())
			{
				secretBox.POST("", handler.CreateSecretPostcard)
			}
		}

		// Legacy routes (backward compatibility - usan evento default)
		// Players
		api.POST("/players", handler.CreatePlayer)
		api.GET("/players/:id", handler.GetPlayer)
		api.GET("/players", handler.ListPlayers)

		// Quiz
		api.POST("/quiz/submit", handler.SubmitQuiz)
		api.GET("/quiz/answers/:playerId", handler.GetQuizAnswers)
		api.GET("/quiz/descriptions", handler.GetDescriptions)

		// Ranking
		api.GET("/ranking", handler.GetRanking)

		// Postcards (Cartelera de Corcho)
		api.POST("/postcards", handler.CreatePostcard)
		api.GET("/postcards", handler.ListPostcards)

		// Secret Box
		api.POST("/postcards/secret", handler.CreateSecretPostcard)

		// Admin routes (legacy - backward compatibility)
		api.GET("/admin/status", handler.GetSecretBoxStatus)
		api.GET("/admin/secret-box", handler.ListSecretPostcards)
		api.POST("/admin/reveal", handler.RevealSecretBox)

		// Admin routes (event-scoped - multi-event)
		adminEvents := api.Group("/admin/events/:slug")
		adminEvents.Use(eventMiddleware)
		adminEvents.Use(authMiddleware)
		{
			adminEvents.GET("/status", handler.GetSecretBoxStatus)
			adminEvents.GET("/secret-box", handler.ListSecretPostcards)
			adminEvents.POST("/reveal", handler.RevealSecretBox)
			adminEvents.PUT("/theme", themeHandler.UpdateTheme)
			adminEvents.POST("/theme/preset", themeHandler.ApplyPreset)

			// Quiz Questions Admin
			adminEvents.GET("/questions", adminQuestionHandler.ListQuestions)
			adminEvents.POST("/questions", adminQuestionHandler.CreateQuestion)
			adminEvents.GET("/questions/export", adminQuestionHandler.ExportQuestions)
			adminEvents.POST("/questions/import", adminQuestionHandler.ImportQuestions)
			adminEvents.PATCH("/questions/reorder", adminQuestionHandler.ReorderQuestions)
		}

		// Admin routes (question-specific - no event slug needed)
		adminQuestions := api.Group("/admin/questions")
		adminQuestions.Use(authMiddleware)
		{
			adminQuestions.PUT("/:id", adminQuestionHandler.UpdateQuestion)
			adminQuestions.DELETE("/:id", adminQuestionHandler.DeleteQuestion)
		}
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
