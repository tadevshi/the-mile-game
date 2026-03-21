package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/the-mile-game/backend/internal/repository"
)

// AnalyticsHandler maneja las peticiones de analytics
type AnalyticsHandler struct {
	db        *sql.DB
	eventRepo *repository.EventRepository
}

// NewAnalyticsHandler crea un nuevo handler de analytics
func NewAnalyticsHandler(db *sql.DB, eventRepo *repository.EventRepository) *AnalyticsHandler {
	return &AnalyticsHandler{
		db:        db,
		eventRepo: eventRepo,
	}
}

// AnalyticsResponse representa la respuesta de analytics para un evento
type AnalyticsResponse struct {
	EventID            uuid.UUID `json:"event_id"`
	TotalParticipants  int       `json:"total_participants"`
	QuizStarted        int       `json:"quiz_started"`
	QuizCompleted      int       `json:"quiz_completed"`
	QuizCompletionRate float64   `json:"quiz_completion_rate"`
	AvgScore           float64   `json:"avg_score"`
	MinScore           *int      `json:"min_score,omitempty"`
	MaxScore           *int      `json:"max_score,omitempty"`
	AvgTimeSpent       *float64  `json:"avg_time_spent_seconds,omitempty"`
	TotalPostcards     int       `json:"total_postcards"`
	PostcardsViewed    int       `json:"postcards_viewed"`
	TotalPageViews     int       `json:"total_page_views"`
	UniqueVisitors     int       `json:"unique_visitors"`
	GeneratedAt        time.Time `json:"generated_at"`
}

// TimelineEntry representa un bucket de tiempo en el timeline
type TimelineEntry struct {
	Timestamp    time.Time `json:"timestamp"`
	Period       string    `json:"period"` // "hour", "day"
	PageViews    int       `json:"page_views"`
	NewPlayers   int       `json:"new_players"`
	QuizStarts   int       `json:"quiz_starts"`
	QuizFinishes int       `json:"quiz_finishes"`
	Postcards    int       `json:"postcards"`
}

// TimelineResponse representa la respuesta del timeline
type TimelineResponse struct {
	EventID uuid.UUID       `json:"event_id"`
	Period  string          `json:"period"` // "hourly", "daily"
	Entries []TimelineEntry `json:"entries"`
}

// FunnelStep representa un paso en el funnel de conversión
type FunnelStep struct {
	Step  string  `json:"step"`
	Count int     `json:"count"`
	Rate  float64 `json:"rate"` // porcentaje vs step anterior
}

// FunnelResponse representa la respuesta del funnel
type FunnelResponse struct {
	EventID    uuid.UUID    `json:"event_id"`
	TotalSteps []FunnelStep `json:"total_steps"` // % sobre total visitantes
	QuizSteps  []FunnelStep `json:"quiz_steps"`  // % sobre players que started
}

// ScoreDistribution representa un bucket de scores
type ScoreDistribution struct {
	Bucket string `json:"bucket"` // e.g., "0-10", "11-20", etc.
	Count  int    `json:"count"`
}

// ScoreDistributionResponse representa la distribución de scores
type ScoreDistributionResponse struct {
	EventID      uuid.UUID           `json:"event_id"`
	Distribution []ScoreDistribution `json:"distribution"`
}

// GetAnalyticsSummary devuelve estadísticas resumidas para un evento
func (h *AnalyticsHandler) GetAnalyticsSummary(c *gin.Context) {
	eventSlug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(eventSlug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Query para obtener estadísticas
	query := `
		WITH player_stats AS (
			SELECT 
				COUNT(DISTINCT id) as total_players
			FROM players
			WHERE event_id = $1
		),
		quiz_stats AS (
			SELECT 
				COUNT(*) FILTER (WHERE event_type = 'started') as quiz_started,
				COUNT(*) FILTER (WHERE event_type = 'completed') as quiz_completed,
				COALESCE(AVG(score) FILTER (WHERE event_type = 'completed'), 0) as avg_score,
				MIN(score) FILTER (WHERE event_type = 'completed') as min_score,
				MAX(score) FILTER (WHERE event_type = 'completed') as max_score,
				COALESCE(AVG(time_spent_seconds) FILTER (WHERE event_type = 'completed'), 0) as avg_time_spent
			FROM quiz_events
			WHERE event_id = $1
		),
		postcard_stats AS (
			SELECT 
				COUNT(*) as total_postcards,
				COUNT(DISTINCT player_id) as postcards_viewed
			FROM postcards
			WHERE event_id = $1 AND (is_secret = FALSE OR revealed_at IS NOT NULL)
		),
		page_stats AS (
			SELECT 
				COUNT(*) as total_page_views,
				COUNT(DISTINCT player_id) as unique_visitors
			FROM page_views
			WHERE event_id = $1
		)
		SELECT 
			$1::uuid as event_id,
			COALESCE(ps.total_players, 0) as total_players,
			COALESCE(qs.quiz_started, 0) as quiz_started,
			COALESCE(qs.quiz_completed, 0) as quiz_completed,
			CASE WHEN COALESCE(qs.quiz_started, 0) > 0 THEN ROUND((qs.quiz_completed::float / qs.quiz_started) * 100, 2) ELSE 0 END as quiz_completion_rate,
			COALESCE(qs.avg_score, 0) as avg_score,
			qs.min_score,
			qs.max_score,
			qs.avg_time_spent,
			COALESCE(pct.total_postcards, 0) as total_postcards,
			COALESCE(pct.postcards_viewed, 0) as postcards_viewed,
			COALESCE(pgs.total_page_views, 0) as total_page_views,
			COALESCE(pgs.unique_visitors, 0) as unique_visitors,
			NOW() as generated_at
		FROM player_stats ps, quiz_stats qs, postcard_stats pct, page_stats pgs
	`

	var result AnalyticsResponse
	var minScore, maxScore sql.NullInt64
	var avgTimeSpent sql.NullFloat64

	err = h.db.QueryRow(query, event.ID).Scan(
		&result.EventID,
		&result.TotalParticipants,
		&result.QuizStarted,
		&result.QuizCompleted,
		&result.QuizCompletionRate,
		&result.AvgScore,
		&minScore,
		&maxScore,
		&avgTimeSpent,
		&result.TotalPostcards,
		&result.PostcardsViewed,
		&result.TotalPageViews,
		&result.UniqueVisitors,
		&result.GeneratedAt,
	)

	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get analytics"})
		return
	}

	if minScore.Valid {
		m := int(minScore.Int64)
		result.MinScore = &m
	}
	if maxScore.Valid {
		m := int(maxScore.Int64)
		result.MaxScore = &m
	}
	if avgTimeSpent.Valid {
		result.AvgTimeSpent = &avgTimeSpent.Float64
	}

	c.JSON(http.StatusOK, result)
}

// GetAnalyticsTimeline devuelve datos de actividad por tiempo
func (h *AnalyticsHandler) GetAnalyticsTimeline(c *gin.Context) {
	eventSlug := c.Param("slug")
	period := c.DefaultQuery("period", "hourly") // "hourly" o "daily"

	event, err := h.eventRepo.GetBySlug(eventSlug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	query := `
		WITH timeline_data AS (
			SELECT 
				DATE_TRUNC('hour', pv.visited_at) as timestamp,
				COUNT(DISTINCT pv.player_id) as page_views,
				COUNT(DISTINCT pl.id) FILTER (WHERE pl.created_at >= DATE_TRUNC('hour', pv.visited_at) AND pl.created_at < DATE_TRUNC('hour', pv.visited_at) + INTERVAL '1 hour') as new_players,
				COUNT(*) FILTER (WHERE qe.event_type = 'started' AND DATE_TRUNC('hour', qe.created_at) = DATE_TRUNC('hour', pv.visited_at)) as quiz_starts,
				COUNT(*) FILTER (WHERE qe.event_type = 'completed' AND DATE_TRUNC('hour', qe.created_at) = DATE_TRUNC('hour', pv.visited_at)) as quiz_finishes,
				COUNT(*) FILTER (WHERE DATE_TRUNC('hour', pst.created_at) = DATE_TRUNC('hour', pv.visited_at)) as postcards
			FROM page_views pv
			LEFT JOIN players pl ON pl.event_id = $1
			LEFT JOIN quiz_events qe ON qe.event_id = $1
			LEFT JOIN postcards pst ON pst.event_id = $1
			WHERE pv.event_id = $1
			GROUP BY DATE_TRUNC('hour', pv.visited_at)
			ORDER BY timestamp
		)
		SELECT 
			timestamp,
			$2 as period,
			COALESCE(page_views, 0) as page_views,
			COALESCE(new_players, 0) as new_players,
			COALESCE(quiz_starts, 0) as quiz_starts,
			COALESCE(quiz_finishes, 0) as quiz_finishes,
			COALESCE(postcards, 0) as postcards
		FROM timeline_data
	`

	rows, err := h.db.Query(query, event.ID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get timeline"})
		return
	}
	defer rows.Close()

	var entries []TimelineEntry
	for rows.Next() {
		var entry TimelineEntry
		if err := rows.Scan(&entry.Timestamp, &entry.Period, &entry.PageViews, &entry.NewPlayers, &entry.QuizStarts, &entry.QuizFinishes, &entry.Postcards); err != nil {
			continue
		}
		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []TimelineEntry{}
	}

	c.JSON(http.StatusOK, TimelineResponse{
		EventID: event.ID,
		Period:  period,
		Entries: entries,
	})
}

// GetAnalyticsFunnel devuelve el funnel de conversión
func (h *AnalyticsHandler) GetAnalyticsFunnel(c *gin.Context) {
	eventSlug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(eventSlug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	query := `
		WITH stats AS (
			SELECT 
				COUNT(DISTINCT pv.player_id) as visitors,
				COUNT(DISTINCT pl.id) as registered_players,
				COUNT(DISTINCT qe.player_id) FILTER (WHERE qe.event_type = 'started') as quiz_started,
				COUNT(DISTINCT qe.player_id) FILTER (WHERE qe.event_type = 'completed') as quiz_completed,
				COUNT(DISTINCT pst.id) as postcards_created
			FROM page_views pv
			LEFT JOIN players pl ON pl.event_id = $1
			LEFT JOIN quiz_events qe ON qe.event_id = $1
			LEFT JOIN postcards pst ON pst.event_id = $1
			WHERE pv.event_id = $1
		)
		SELECT * FROM stats
	`

	var visitors, registeredPlayers, quizStarted, quizCompleted, postcardsCreated int

	err = h.db.QueryRow(query, event.ID).Scan(
		&visitors, &registeredPlayers, &quizStarted, &quizCompleted, &postcardsCreated,
	)

	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get funnel"})
		return
	}

	makeStep := func(step string, count int, prevCount int) FunnelStep {
		rate := 0.0
		if prevCount > 0 {
			rate = float64(count) / float64(prevCount) * 100
		}
		return FunnelStep{Step: step, Count: count, Rate: rate}
	}

	// Total steps (% sobre unique visitors)
	totalSteps := []FunnelStep{
		makeStep("visitors", visitors, 1),
		makeStep("registered", registeredPlayers, visitors),
		makeStep("quiz_started", quizStarted, registeredPlayers),
		makeStep("quiz_completed", quizCompleted, quizStarted),
		makeStep("postcards", postcardsCreated, visitors),
	}

	// Quiz steps (% sobre quiz started)
	quizSteps := []FunnelStep{
		makeStep("started", quizStarted, 1),
		makeStep("completed", quizCompleted, quizStarted),
	}

	c.JSON(http.StatusOK, FunnelResponse{
		EventID:    event.ID,
		TotalSteps: totalSteps,
		QuizSteps:  quizSteps,
	})
}

// GetScoreDistribution devuelve la distribución de scores
func (h *AnalyticsHandler) GetScoreDistribution(c *gin.Context) {
	eventSlug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(eventSlug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	query := `
		SELECT 
			CASE 
				WHEN score >= 0 AND score < 10 THEN '0-9'
				WHEN score >= 10 AND score < 20 THEN '10-19'
				WHEN score >= 20 AND score < 30 THEN '20-29'
				WHEN score >= 30 AND score < 40 THEN '30-39'
				WHEN score >= 40 AND score < 50 THEN '40-49'
				WHEN score >= 50 AND score < 60 THEN '50-59'
				WHEN score >= 60 AND score < 70 THEN '60-69'
				WHEN score >= 70 AND score < 80 THEN '70-79'
				WHEN score >= 80 AND score < 90 THEN '80-89'
				WHEN score >= 90 AND score <= 100 THEN '90-100'
				ELSE 'other'
			END as bucket,
			COUNT(*) as count
		FROM quiz_events
		WHERE event_id = $1 AND event_type = 'completed'
		GROUP BY bucket
		ORDER BY bucket
	`

	rows, err := h.db.Query(query, event.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get score distribution"})
		return
	}
	defer rows.Close()

	var distribution []ScoreDistribution
	for rows.Next() {
		var d ScoreDistribution
		if err := rows.Scan(&d.Bucket, &d.Count); err != nil {
			continue
		}
		distribution = append(distribution, d)
	}

	if distribution == nil {
		distribution = []ScoreDistribution{}
	}

	c.JSON(http.StatusOK, ScoreDistributionResponse{
		EventID:      event.ID,
		Distribution: distribution,
	})
}

// LogPageView registra una visita a una página (llamado desde frontend)
func (h *AnalyticsHandler) LogPageView(c *gin.Context) {
	eventSlug := c.Param("slug")

	event, err := h.eventRepo.GetBySlug(eventSlug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	var playerID *uuid.UUID
	playerIDStr := c.GetHeader("X-Player-ID")
	if playerIDStr != "" {
		id, _ := uuid.Parse(playerIDStr)
		playerID = &id
	}

	pagePath := c.Request.URL.Path

	query := `INSERT INTO page_views (event_id, player_id, page_path) VALUES ($1, $2, $3)`
	_, err = h.db.Exec(query, event.ID, playerID, pagePath)
	if err != nil {
		// No fallar el request por analytics
		c.JSON(http.StatusOK, gin.H{"logged": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logged": true})
}
