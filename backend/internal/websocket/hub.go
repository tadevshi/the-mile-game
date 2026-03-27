package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/the-mile-game/backend/internal/models"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024 // 512KB
)

// Hub mantiene el registro de clientes conectados y broadcastea mensajes
// Soporta rooms por evento para mensajes filtrados
type Hub struct {
	// Clientes registrados (todos los clientes, sin importar el evento)
	clients map[*Client]bool

	// Rooms: mapea eventSlug -> clientes en ese evento
	rooms map[string]map[*Client]bool

	// Canal para registrar nuevos clientes
	register chan *Client

	// Canal para desregistrar clientes
	unregister chan *Client

	// Canal para broadcastear mensajes a todos los clientes
	broadcast chan []byte

	// Canal para broadcastear a un evento específico
	broadcastToRoom chan *RoomMessage

	// Validador de eventos (opcional) - si está presente, se validan los event slugs
	eventValidator EventValidator

	// Mutex para acceso seguro concurrente
	mu sync.RWMutex
}

// EventValidator interface para validar que un evento existe y está activo
type EventValidator interface {
	ValidateEvent(slug string) error
}

// RoomMessage mensaje dirigido a un room específico
type RoomMessage struct {
	EventSlug string
	Message   []byte
}

// Client representa una conexión WebSocket
type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	EventSlug string // El evento al que está suscrito este cliente
}

// Message representa un mensaje enviado por WebSocket
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// RankingUpdateMessage mensaje específico para actualización de ranking
type RankingUpdateMessage struct {
	Type    string                `json:"type"`
	Ranking []models.RankingEntry `json:"ranking"`
}

// PostcardNewMessage mensaje específico para nueva postal en la cartelera
type PostcardNewMessage struct {
	Type     string          `json:"type"`
	Postcard models.Postcard `json:"postcard"`
}

// SecretRevealMessage mensaje para revelar la Secret Box a todos los clientes
type SecretRevealMessage struct {
	Type      string            `json:"type"`
	EventSlug string            `json:"event_slug"`
	Postcards []models.Postcard `json:"postcards"`
}

// SecretResetMessage mensaje para resetear la Secret Box (ocultar las postcards reveladas)
type SecretResetMessage struct {
	Type      string `json:"type"`
	EventSlug string `json:"event_slug"`
	Count     int64  `json:"count"`
}

// getAllowedOrigins returns the list of allowed origins from the CORS_ALLOWED_ORIGINS env var.
// If empty, defaults to localhost patterns for development.
func getAllowedOrigins() []string {
	env := os.Getenv("CORS_ALLOWED_ORIGINS")
	if env == "" {
		return []string{
			"http://localhost:5173",
			"http://localhost:3000",
			"http://localhost:8081",
			"http://localhost",
		}
	}
	return strings.Split(env, ",")
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			// No Origin header (e.g., direct WebSocket upgrade): allow
			return true
		}
		allowedOrigins := getAllowedOrigins()
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				return true
			}
		}
		log.Printf("WebSocket: Origin %q not in allowed list", origin)
		return false
	},
}

// NewHub crea un nuevo Hub sin validador de eventos
func NewHub() *Hub {
	return &Hub{
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		broadcast:       make(chan []byte),
		broadcastToRoom: make(chan *RoomMessage, 256), // Buffered para no bloquear
		clients:         make(map[*Client]bool),
		rooms:           make(map[string]map[*Client]bool),
	}
}

// NewHubWithValidator crea un nuevo Hub con validador de eventos
func NewHubWithValidator(validator EventValidator) *Hub {
	hub := NewHub()
	hub.eventValidator = validator
	return hub
}

// Run inicia el loop del hub para manejar registros y broadcasts
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			// Si el cliente tiene un eventSlug, agregarlo al room
			if client.EventSlug != "" {
				if h.rooms[client.EventSlug] == nil {
					h.rooms[client.EventSlug] = make(map[*Client]bool)
				}
				h.rooms[client.EventSlug][client] = true
				log.Printf("WebSocket: Cliente conectado al room '%s'. Clientes en room: %d", client.EventSlug, len(h.rooms[client.EventSlug]))
			}
			h.mu.Unlock()
			log.Printf("WebSocket: Cliente conectado. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				// Remover del room si tenía uno
				if client.EventSlug != "" && h.rooms[client.EventSlug] != nil {
					delete(h.rooms[client.EventSlug], client)
					log.Printf("WebSocket: Cliente removido del room '%s'. Clientes restantes: %d", client.EventSlug, len(h.rooms[client.EventSlug]))
				}
			}
			h.mu.Unlock()
			log.Printf("WebSocket: Cliente desconectado. Total: %d", len(h.clients))

		case roomMsg := <-h.broadcastToRoom:
			// Broadcast a un room específico (evento)
			h.mu.RLock()
			room := h.rooms[roomMsg.EventSlug]
			if room == nil {
				h.mu.RUnlock()
				log.Printf("WebSocket: Room '%s' no existe, mensaje descartado", roomMsg.EventSlug)
				continue
			}

			var deadClients []*Client
			for client := range room {
				select {
				case client.send <- roomMsg.Message:
				default:
					deadClients = append(deadClients, client)
				}
			}
			h.mu.RUnlock()

			// Limpiar clientes muertos
			if len(deadClients) > 0 {
				h.mu.Lock()
				for _, client := range deadClients {
					delete(h.clients, client)
					delete(h.rooms[roomMsg.EventSlug], client)
					close(client.send)
				}
				h.mu.Unlock()
			}

		case message := <-h.broadcast:
			h.mu.RLock()
			// Coleccionar los clientes a borrar para no modificar el mapa durante el RLock
			var deadClients []*Client

			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Cliente lento, lo anotamos para borrar después
					deadClients = append(deadClients, client)
				}
			}
			h.mu.RUnlock()

			// Ahora sí, con Lock exclusivo borramos los muertos
			if len(deadClients) > 0 {
				h.mu.Lock()
				for _, client := range deadClients {
					if _, ok := h.clients[client]; ok {
						delete(h.clients, client)
						if client.EventSlug != "" && h.rooms[client.EventSlug] != nil {
							delete(h.rooms[client.EventSlug], client)
						}
						close(client.send)
					}
				}
				h.mu.Unlock()
				log.Printf("WebSocket: Borrados %d clientes lentos. Total: %d", len(deadClients), len(h.clients))
			}
		}
	}
}

// ServeHTTP maneja las conexiones WebSocket
// El query param "event" es opcional; sin él el cliente recibe broadcasts globales
// Si hay un eventValidator configurado, se validará que el evento exista
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Extraer event slug del query param
	eventSlug := r.URL.Query().Get("event")
	if eventSlug == "" {
		// Sin event, el cliente no recibe mensajes específicos
		log.Printf("WebSocket: Conexión sin event slug - recibirá broadcasts globales nomás")
	} else if h.eventValidator != nil {
		// Validar que el evento existe y está activo
		if err := h.eventValidator.ValidateEvent(eventSlug); err != nil {
			log.Printf("WebSocket: Evento '%s' no válido: %v", eventSlug, err)
			http.Error(w, "Event not found or inactive", http.StatusNotFound)
			return
		}
		log.Printf("WebSocket: Conexión al evento '%s' aceptada", eventSlug)
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:       h,
		conn:      conn,
		send:      make(chan []byte, 256),
		EventSlug: eventSlug,
	}
	client.hub.register <- client

	// Iniciar goroutines para lectura y escritura
	go client.writePump()
	go client.readPump()
}

// BroadcastRanking envía el ranking actualizado a todos los clientes
func (h *Hub) BroadcastRanking(ranking []models.RankingEntry) {
	msg := RankingUpdateMessage{
		Type:    "ranking_update",
		Ranking: ranking,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling ranking: %v", err)
		return
	}

	h.broadcast <- data
	log.Printf("WebSocket: Ranking broadcasteado a %d clientes", len(h.clients))
}

// BroadcastPostcard envía una nueva postal a todos los clientes conectados
func (h *Hub) BroadcastPostcard(postcard models.Postcard) {
	msg := PostcardNewMessage{
		Type:     "postcard_new",
		Postcard: postcard,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling postcard: %v", err)
		return
	}

	h.broadcast <- data
	log.Printf("WebSocket: Postal broadcasteada a %d clientes", len(h.clients))
}

// BroadcastSecretReveal envía el evento de reveal de la Secret Box a todos los clientes.
// Este mensaje dispara la animación de caja de regalos en todos los corkboards conectados.
func (h *Hub) BroadcastSecretReveal(postcards []models.Postcard) {
	msg := SecretRevealMessage{
		Type:      "secret_box_reveal",
		Postcards: postcards,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling secret reveal: %v", err)
		return
	}

	h.broadcast <- data
	log.Printf("WebSocket: Secret Box revelada — %d postales broadcasteadas a %d clientes", len(postcards), len(h.clients))
}

// GetClientCount devuelve el número de clientes conectados
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// BroadcastRankingToRoom envía el ranking actualizado solo a clientes de un evento específico
func (h *Hub) BroadcastRankingToRoom(eventSlug string, ranking []models.RankingEntry) {
	if eventSlug == "" {
		// Si no hay eventSlug, usar broadcast global
		h.BroadcastRanking(ranking)
		return
	}

	msg := RankingUpdateMessage{
		Type:    "ranking_update",
		Ranking: ranking,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling ranking: %v", err)
		return
	}

	h.broadcastToRoom <- &RoomMessage{
		EventSlug: eventSlug,
		Message:   data,
	}

	h.mu.RLock()
	roomCount := len(h.rooms[eventSlug])
	h.mu.RUnlock()
	log.Printf("WebSocket: Ranking broadcasteado al room '%s' (%d clientes)", eventSlug, roomCount)
}

// BroadcastPostcardToRoom envía una nueva postal solo a clientes de un evento específico
func (h *Hub) BroadcastPostcardToRoom(eventSlug string, postcard models.Postcard) {
	if eventSlug == "" {
		// Si no hay eventSlug, usar broadcast global
		h.BroadcastPostcard(postcard)
		return
	}

	msg := PostcardNewMessage{
		Type:     "postcard_new",
		Postcard: postcard,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling postcard: %v", err)
		return
	}

	h.broadcastToRoom <- &RoomMessage{
		EventSlug: eventSlug,
		Message:   data,
	}

	h.mu.RLock()
	roomCount := len(h.rooms[eventSlug])
	h.mu.RUnlock()
	log.Printf("WebSocket: Postal broadcasteada al room '%s' (%d clientes)", eventSlug, roomCount)
}

// BroadcastSecretRevealToRoom envía el evento de reveal solo a clientes de un evento específico
func (h *Hub) BroadcastSecretRevealToRoom(eventSlug string, postcards []models.Postcard) {
	if eventSlug == "" {
		h.BroadcastSecretReveal(postcards)
		return
	}

	msg := SecretRevealMessage{
		Type:      "secret_box_reveal",
		EventSlug: eventSlug,
		Postcards: postcards,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling secret reveal: %v", err)
		return
	}

	h.broadcastToRoom <- &RoomMessage{
		EventSlug: eventSlug,
		Message:   data,
	}

	h.mu.RLock()
	roomCount := len(h.rooms[eventSlug])
	h.mu.RUnlock()
	log.Printf("WebSocket: Secret Box revelada al room '%s' — %d postales broadcasteadas (%d clientes)", eventSlug, len(postcards), roomCount)
}

// BroadcastSecretResetToRoom envía el evento de reset de la Secret Box solo a clientes de un evento específico
func (h *Hub) BroadcastSecretResetToRoom(eventSlug string, count int64) {
	if eventSlug == "" {
		log.Printf("WebSocket: Secret Box reset ignorado — no hay eventSlug")
		return
	}

	msg := SecretResetMessage{
		Type:      "secret_box_reset",
		EventSlug: eventSlug,
		Count:     count,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling secret reset: %v", err)
		return
	}

	h.broadcastToRoom <- &RoomMessage{
		EventSlug: eventSlug,
		Message:   data,
	}

	h.mu.RLock()
	roomCount := len(h.rooms[eventSlug])
	h.mu.RUnlock()
	log.Printf("WebSocket: Secret Box reseteada al room '%s' — %d postcards ocultadas (%d clientes)", eventSlug, count, roomCount)
}

// readPump bombea mensajes desde el WebSocket al hub
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		// Por ahora no procesamos mensajes entrantes del cliente
		// Solo hacemos broadcast del ranking
	}
}

// writePump bombea mensajes desde el hub al WebSocket
// The application runs writePump in a per-connection goroutine. The application
// ensures that there is at most one writer to a connection by executing all
// writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			c.conn.WriteMessage(websocket.TextMessage, message)

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
