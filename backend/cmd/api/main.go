package main

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/the-mile-game/backend/internal/handlers"
	"github.com/the-mile-game/backend/internal/middleware"
	"github.com/the-mile-game/backend/internal/migrations"
	"github.com/the-mile-game/backend/internal/models"
	"github.com/the-mile-game/backend/internal/repository"
	"github.com/the-mile-game/backend/internal/services"
	"github.com/the-mile-game/backend/internal/websocket"
	"github.com/the-mile-game/backend/internal/worker"
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

	databaseURL := repository.DatabaseURL()
	if err := migrations.Run(context.Background(), databaseURL); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}

	// Conectar a la base de datos
	db, err := repository.NewDBWithURL(databaseURL)
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
	resetTokenRepo := repository.NewResetTokenRepository(db)
	eventRepo := repository.NewEventRepository(db)
	quizQuestionRepo := repository.NewQuizQuestionRepository(db)
	themeRepo := repository.NewThemeRepository(db)
	driveRepo := repository.NewDriveRepository(db)
	collaboratorRepo := repository.NewCollaboratorRepository(db)
	guestRepo := repository.NewGuestRepository(db)

	// JWT secret — siempre requerido
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	authService := services.NewAuthService(userRepo, jwtSecret)

	// Admission tickets for the WebSocket: signed, short-lived and bound to
	// the account and the event, issued over the authenticated HTTP surface.
	wsTicketService := services.NewWsTicketService(jwtSecret)

	// Email sender: Resend en producción, console log en desarrollo
	var emailSender services.EmailSender
	resendAPIKey := os.Getenv("RESEND_API_KEY")
	resendFrom := os.Getenv("RESEND_FROM_EMAIL")
	if resendAPIKey != "" && resendFrom != "" {
		emailSender = services.NewResendEmailSender(resendAPIKey, resendFrom)
		log.Println("Using Resend for password reset emails")
	} else {
		emailSender = services.NewConsoleEmailSender()
		log.Println("Using console logger for password reset emails (dev mode)")
	}

	appBaseURL := os.Getenv("APP_BASE_URL")
	if appBaseURL == "" {
		appBaseURL = "http://localhost:8081"
	}

	authServiceWithReset := services.NewAuthServiceWithReset(userRepo, resetTokenRepo, emailSender, jwtSecret, appBaseURL)
	themeService := services.NewThemeService(themeRepo, eventRepo)

	// Google Drive backup configuration
	enableDriveBackup := os.Getenv("ENABLE_GOOGLE_DRIVE_BACKUP") == "true"
	var driveService *services.DriveService
	var backupWorker *worker.BackupWorker
	var driveAdminHandler *handlers.DriveAdminHandler

	if enableDriveBackup {
		driveConfig := &models.DriveBackupConfig{
			Enabled:       true,
			ClientID:      os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret:  os.Getenv("GOOGLE_CLIENT_SECRET"),
			RedirectURI:   os.Getenv("GOOGLE_REDIRECT_URI"),
			EncryptionKey: os.Getenv("DRIVE_ENCRYPTION_KEY"),
		}

		// Set encryption key
		if driveConfig.EncryptionKey != "" {
			if err := services.SetDriveEncryptionKey(driveConfig.EncryptionKey); err != nil {
				log.Printf("[WARN] Failed to set Drive encryption key: %v", err)
			}
		}

		driveService = services.NewDriveService(driveConfig)

		// Create backup worker
		backupWorker = worker.NewBackupWorker(driveConfig, driveRepo, driveService, worker.WorkerNumWorkers)
		backupWorker.Start()
		log.Printf("[Drive] Backup worker started")

		driveAdminHandler = handlers.NewDriveAdminHandler(driveRepo, eventRepo, driveService, backupWorker, true)
	}

	// WebSocket event validator - valida que el evento existe y está activo
	eventValidator := &webSocketEventValidator{eventRepo: eventRepo}

	// Crear WebSocket Hub con validador de eventos
	// La admisión del room aplica la visibilidad persistida del evento: el
	// ticket identifica la cuenta y la política decide si puede entrar.
	roomPolicy := services.NewWsRoomPolicy(eventRepo, collaboratorRepo, guestRepo)
	hub := websocket.NewHubWithAdmission(eventValidator, wsTicketService, roomPolicy)
	go hub.Run()

	// Crear handlers
	uploadsDir := os.Getenv("UPLOADS_DIR")
	if uploadsDir == "" {
		uploadsDir = uploadPath
	}

	var handler *handlers.Handler
	if enableDriveBackup && backupWorker != nil && driveRepo != nil {
		handler = handlers.NewHandlerWithDrive(playerRepo, quizRepo, quizQuestionRepo, postcardRepo, hub, uploadsDir, driveRepo, backupWorker)
	} else {
		handler = handlers.NewHandler(playerRepo, quizRepo, quizQuestionRepo, postcardRepo, hub, uploadsDir)
	}

	// La visibilidad persistida del evento se aplica también a las rutas legacy.
	handler = handler.WithLegacyVisibility(handlers.NewLegacyEventVisibility(eventRepo, collaboratorRepo, guestRepo))

	// La administración legacy queda acotada a los eventos que administra el caller.
	handler = handler.WithLegacyAdminScope(handlers.NewLegacyAdminScope(eventRepo, collaboratorRepo))

	authHandler := handlers.NewAuthHandler(authServiceWithReset)
	themeHandler := handlers.NewThemeHandler(themeService)
	adminQuestionHandler := handlers.NewAdminQuestionHandler(quizQuestionRepo, eventRepo, eventRepo)
	adminEventHandler := handlers.NewAdminEventHandler(eventRepo, uploadsDir)
	adminSecretBoxHandler := handlers.NewSecretBoxAdminHandler(eventRepo)
	eventHandler := handlers.NewEventHandler(eventRepo, collaboratorRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(db, eventRepo)
	collaboratorHandler := handlers.NewCollaboratorHandler(collaboratorRepo, eventRepo)
	guestHandler := handlers.NewGuestHandler(guestRepo)

	// Configurar router
	r := gin.Default()

	// La media se sirve desde el backend bajo la política de visibilidad del
	// La media se sirve con la politica de visibilidad del evento. La ruta se
	// registra despues del middleware CORS global: el CORS decide que origenes
	// pueden leer el media y nunca responde con un comodin.
	mediaRepo := repository.NewMediaRepository(db)
	mediaPolicy := services.NewMediaPolicy(eventRepo, collaboratorRepo, guestRepo)
	mediaHandler := handlers.NewMediaHandler(mediaRepo, mediaPolicy, uploadsDir, authService)

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
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Player-ID", "X-Secret-Token"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	log.Printf("CORS enabled for origins: %v", config.AllowOrigins)

	// Middlewares
	eventMiddleware := middleware.EventMiddleware(eventRepo)
	authMiddleware := middleware.AuthMiddleware(authService)
	adminMiddleware := middleware.AdminMiddleware(collaboratorRepo)
	eventVisibilityMiddleware := middleware.EventVisibilityMiddleware(collaboratorRepo, guestRepo)
	optionalAuthMiddleware := middleware.OptionalAuthMiddleware(authService)

	// Rutas API
	api := r.Group("/api")
	// La cookie de sesion de media se renueva en las peticiones autenticadas,
	// para que un <img> o un <video> alcanza la media de un evento privado con
	// la sesion restaurada. La cookie esta limitada a /uploads.
	api.Use(middleware.MediaSessionCookieMiddleware(authService))
	{
		// Auth (público)
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/refresh", authHandler.Refresh)
		api.POST("/auth/forgot-password", authHandler.ForgotPassword)
		api.POST("/auth/reset-password", authHandler.ResetPassword)

		// Auth (protegido)
		auth := api.Group("/auth")
		auth.Use(authMiddleware)
		{
			auth.GET("/me", authHandler.Me)
			auth.POST("/logout", authHandler.Logout)
		}

		// Admission de WebSocket (protegido): el ticket se pide por HTTP
		// autenticado y viaja en el subprotocolo del socket.
		handlers.RegisterWsTicketRoutes(api, authMiddleware, handlers.NewWsTicketHandler(wsTicketService, roomPolicy))

		// User events (protegido)
		users := api.Group("/users")
		users.Use(authMiddleware)
		{
			users.GET("/me/events", eventHandler.GetUserEvents)
		}

		// Events (protegido - crear evento)
		eventsAuth := api.Group("/events")
		eventsAuth.Use(authMiddleware)
		{
			eventsAuth.POST("", eventHandler.CreateEvent)
		}

		// Theme presets (public)
		api.GET("/themes/presets", themeHandler.GetPresets)

		// Event-scoped routes (nuevas - multi-event)
		events := scopedEventContentGroup(api, eventMiddleware, optionalAuthMiddleware, eventVisibilityMiddleware)
		{
			// Event info
			handlers.RegisterPublicEventRoutes(events, eventHandler)

			// Theme
			events.GET("/theme", themeHandler.GetTheme)

			// Players
			events.POST("/players", handler.CreatePlayerScoped)
			events.GET("/players", handler.ListPlayersScoped)
			events.GET("/players/:id", handler.GetPlayer)

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
		}

		// Secret Box upload remains token-authorized and is not event-content access.
		registerSecretBoxUploadRoute(api, eventMiddleware, handler.CreateSecretPostcard)

		// Legacy routes (backward compatibility - usan evento default).
		// La identidad opcional permite aplicar la visibilidad persistida del
		// evento a las lecturas y escrituras heredadas.
		legacy := api.Group("")
		legacy.Use(optionalAuthMiddleware)
		{
			// Players
			legacy.POST("/players", handler.CreatePlayer)
			legacy.GET("/players/:id", handler.GetPlayer)
			legacy.GET("/players", handler.ListPlayers)

			// Quiz
			legacy.GET("/quiz/questions", handler.GetQuizQuestions)
			legacy.POST("/quiz/submit", handler.SubmitQuiz)
			legacy.GET("/quiz/answers/:playerId", handler.GetQuizAnswers)
			legacy.GET("/quiz/descriptions", handler.GetDescriptions)

			// Ranking
			legacy.GET("/ranking", handler.GetRanking)

			// Postcards (Cartelera de Corcho)
			legacy.POST("/postcards", handler.CreatePostcard)
			legacy.GET("/postcards", handler.ListPostcards)
		}

		// Secret Box
		api.POST("/postcards/secret", handler.CreateSecretPostcard)

		// Analytics page views are event-scoped content and follow the visibility policy.
		registerScopedPageViewRoute(api, eventMiddleware, optionalAuthMiddleware, eventVisibilityMiddleware, analyticsHandler.LogPageView)

		// Admin routes (legacy - backward compatibility)
		// La identidad es opcional en el middleware: el handler exige una
		// identidad valida y acota la administracion a los eventos del caller.
		api.GET("/admin/status", optionalAuthMiddleware, handler.GetSecretBoxStatus)
		api.GET("/admin/secret-box", optionalAuthMiddleware, handler.ListSecretPostcards)
		api.POST("/admin/reveal", optionalAuthMiddleware, handler.RevealSecretBox)

		// Drive admin routes (user-level, not event-scoped)
		// These routes handle Google Drive OAuth connection and backup job management
		if driveAdminHandler != nil {
			// Callback is PUBLIC - Google's OAuth redirect cannot include our JWT
			// The state parameter is integrity-protected via HMAC
			api.GET("/admin/drive/callback", driveAdminHandler.GetDriveCallback)

			driveAdmin := api.Group("/admin/drive")
			driveAdmin.Use(authMiddleware)
			{
				driveAdmin.GET("/auth-url", driveAdminHandler.GetDriveAuthURL)
				driveAdmin.GET("/status", driveAdminHandler.GetDriveStatus)
				driveAdmin.POST("/disconnect", driveAdminHandler.DisconnectDrive)
				driveAdmin.GET("/backup-jobs", driveAdminHandler.ListBackupJobs)
				driveAdmin.POST("/backup-jobs/:id/retry", driveAdminHandler.RetryBackupJob)
			}
		}

		// Collaborator invitation accept (autenticado, no requiere ser owner)
		api.POST("/collaborators/accept", authMiddleware, collaboratorHandler.AcceptInvitation)
		// Guest invitation acceptance is separate from collaborator/admin invitations.
		api.POST("/guests/accept", authMiddleware, guestHandler.AcceptInvitation)

		// Admin routes (event-scoped - multi-event)
		// Operaciones sensibles: solo el owner real puede gestionar colaboradores o eliminar evento
		adminEventsOwnerOnly := api.Group("/admin/events/:slug")
		adminEventsOwnerOnly.Use(eventMiddleware)
		adminEventsOwnerOnly.Use(authMiddleware)
		adminEventsOwnerOnly.Use(middleware.OwnerOnlyMiddleware())
		{
			// Event management
			adminEventsOwnerOnly.DELETE("", eventHandler.DeleteEvent)

			// Collaborators management
			adminEventsOwnerOnly.GET("/collaborators/invite", collaboratorHandler.GetInviteToken)
			adminEventsOwnerOnly.POST("/collaborators/invite", collaboratorHandler.GenerateInviteToken)
			adminEventsOwnerOnly.GET("/collaborators", collaboratorHandler.ListCollaborators)
			adminEventsOwnerOnly.DELETE("/collaborators/:user_id", collaboratorHandler.RemoveCollaborator)
		}

		// Admin routes: owner o colaboradores con permisos de admin
		adminEvents := api.Group("/admin/events/:slug")
		adminEvents.Use(eventMiddleware)
		adminEvents.Use(authMiddleware)
		adminEvents.Use(adminMiddleware)
		{
			adminEvents.GET("/status", handler.GetSecretBoxStatus)
			adminEvents.GET("/secret-box", handler.ListSecretPostcards)
			adminEvents.POST("/reveal", handler.RevealSecretBox)
			adminEvents.POST("/secret-box/reset", handler.ResetSecretBox)

			// Non-administrative guest membership and event-specific invitation link.
			adminEvents.GET("/guests/invite", guestHandler.GetGuestInviteToken)
			adminEvents.POST("/guests/invite", guestHandler.RotateGuestInviteToken)
			adminEvents.GET("/guests", guestHandler.ListGuests)
			adminEvents.DELETE("/guests/:user_id", guestHandler.RemoveGuest)

			adminEvents.DELETE("/postcards", handler.ClearCorkboard)
			adminEvents.PUT("/theme", themeHandler.UpdateTheme)
			adminEvents.POST("/theme/preset", themeHandler.ApplyPreset)

			// Secret Box Admin (token management)
			adminEvents.GET("/secret-box/token", adminSecretBoxHandler.GetSecretBoxToken)
			adminEvents.POST("/secret-box/token/regenerate", adminSecretBoxHandler.RegenerateSecretBoxToken)

			// Quiz Questions Admin
			adminEvents.GET("/questions", adminQuestionHandler.ListQuestions)
			adminEvents.POST("/questions", adminQuestionHandler.CreateQuestion)
			adminEvents.GET("/questions/export", adminQuestionHandler.ExportQuestions)
			adminEvents.POST("/questions/import", adminQuestionHandler.ImportQuestions)
			adminEvents.PATCH("/questions/reorder", adminQuestionHandler.ReorderQuestions)

			// Event Features Admin
			adminEvents.PUT("/features", adminEventHandler.UpdateEventFeatures)
			adminEvents.POST("/media", adminEventHandler.UploadMedia)
			adminEvents.DELETE("/media", adminEventHandler.DeleteMedia)

			// Analytics
			adminEvents.GET("/analytics", analyticsHandler.GetAnalyticsSummary)
			adminEvents.GET("/analytics/timeline", analyticsHandler.GetAnalyticsTimeline)
			adminEvents.GET("/analytics/funnel", analyticsHandler.GetAnalyticsFunnel)
			adminEvents.GET("/analytics/scores", analyticsHandler.GetScoreDistribution)
		}

		// Admin routes (question-specific - no event slug needed)
		adminQuestions := api.Group("/admin/questions")
		adminQuestions.Use(authMiddleware)
		{
			adminQuestions.PUT("/:id", adminQuestionHandler.UpdateQuestion)
			adminQuestions.DELETE("/:id", adminQuestionHandler.DeleteQuestion)
		}
	}

	// Media (sin /api prefix, igual que health): el backend sirve los archivos
	// guardados aplicando la politica de visibilidad de su evento.
	r.GET("/uploads/*filepath", mediaHandler.Serve)

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
