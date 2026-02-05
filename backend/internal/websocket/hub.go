package websocket

import (
	"encoding/json"
	"log"
	"net/http"
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
type Hub struct {
	// Clientes registrados
	clients map[*Client]bool

	// Canal para registrar nuevos clientes
	register chan *Client

	// Canal para desregistrar clientes
	unregister chan *Client

	// Canal para broadcastear mensajes a todos los clientes
	broadcast chan []byte

	// Mutex para acceso seguro concurrente
	mu sync.RWMutex
}

// Client representa una conexión WebSocket
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
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

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Permitir cualquier origen en desarrollo
		// En producción, verificar contra CORS_ALLOWED_ORIGINS
		return true
	},
}

// NewHub crea un nuevo Hub
func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
		clients:    make(map[*Client]bool),
	}
}

// Run inicia el loop del hub para manejar registros y broadcasts
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket: Cliente conectado. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket: Cliente desconectado. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Cliente lento, cerrar conexión
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// ServeHTTP maneja las conexiones WebSocket
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
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

// GetClientCount devuelve el número de clientes conectados
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
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
