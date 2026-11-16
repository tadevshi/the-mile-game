package main

import (
	"github.com/gin-gonic/gin"
	"github.com/the-mile-game/backend/internal/middleware"
)

// scopedEventContentGroup applies event lookup, optional account identity, and
// visibility policy to current event content routes in that order.
func scopedEventContentGroup(api *gin.RouterGroup, eventLookup, optionalAuth, visibility gin.HandlerFunc) *gin.RouterGroup {
	events := api.Group("/events/:slug")
	events.Use(eventLookup)
	events.Use(optionalAuth)
	events.Use(visibility)
	return events
}

// registerScopedPageViewRoute keeps event analytics subject to the same visibility policy as content reads.
func registerScopedPageViewRoute(api *gin.RouterGroup, eventLookup, optionalAuth, visibility, logPageView gin.HandlerFunc) {
	events := scopedEventContentGroup(api, eventLookup, optionalAuth, visibility)
	events.POST("/page-view", logPageView)
}

// registerSecretBoxUploadRoute keeps the token-authorized upload endpoint
// outside the event-content visibility gate.
func registerSecretBoxUploadRoute(api *gin.RouterGroup, eventLookup, createPostcard gin.HandlerFunc) {
	uploads := api.Group("/events/:slug/secret-box")
	uploads.Use(eventLookup)
	uploads.Use(middleware.SecretBoxFeatureMiddleware())
	uploads.POST("", createPostcard)
}
