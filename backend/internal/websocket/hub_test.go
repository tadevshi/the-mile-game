package websocket

import (
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/the-mile-game/backend/internal/models"
)

// mockConn es un mock de websocket.Conn para testing
type mockConn struct {
	writeMsgChan chan []byte
	readMsgChan  chan []byte
	closeCalled  bool
}

func newMockConn() *mockConn {
	return &mockConn{
		writeMsgChan: make(chan []byte, 256),
		readMsgChan:  make(chan []byte, 256),
	}
}

func (m *mockConn) ReadMessage() (int, []byte, error) {
	msg, ok := <-m.readMsgChan
	if !ok {
		return 0, nil, errors.New("connection closed")
	}
	return websocket.TextMessage, msg, nil
}

func (m *mockConn) WriteMessage(t int, data []byte) error {
	m.writeMsgChan <- data
	return nil
}

func (m *mockConn) Close() error {
	m.closeCalled = true
	return nil
}

func (m *mockConn) SetReadDeadline(t time.Time) error {
	return nil
}

func (m *mockConn) SetWriteDeadline(t time.Time) error {
	return nil
}

func (m *mockConn) SetPongHandler(h func(string) error) {
}

func (m *mockConn) SetPingHandler(h func(string) error) {
}

func (m *mockConn) LocalAddr() string {
	return "localhost:8080"
}

func (m *mockConn) RemoteAddr() string {
	return "localhost:12345"
}

// mockEventValidator es un validador simple para tests
type mockEventValidator struct {
	validEvents map[string]bool
}

func newMockEventValidator() *mockEventValidator {
	return &mockEventValidator{
		validEvents: map[string]bool{
			"mile-cumple": true,
			"test-event":  true,
		},
	}
}

func (m *mockEventValidator) ValidateEvent(slug string) error {
	if !m.validEvents[slug] {
		return ErrEventNotFound
	}
	return nil
}

// ErrEventNotFound es el error cuando el evento no existe
var ErrEventNotFound = &eventNotFoundError{}

type eventNotFoundError struct{}

func (e *eventNotFoundError) Error() string {
	return "event not found"
}

func TestHub_RegisterClient(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear cliente mock
	client := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "mile-cumple",
	}

	// Registrar cliente
	hub.register <- client

	// Esperar a que se registre
	time.Sleep(50 * time.Millisecond)

	// Verificar que el cliente está en el room correcto
	hub.mu.RLock()
	roomClients := hub.rooms["mile-cumple"]
	hub.mu.RUnlock()

	if roomClients == nil {
		t.Fatal("Room 'mile-cumple' should exist")
	}

	if !roomClients[client] {
		t.Error("Client should be in room 'mile-cumple'")
	}

	// Verificar que también está en clients global
	hub.mu.RLock()
	_, exists := hub.clients[client]
	hub.mu.RUnlock()

	if !exists {
		t.Error("Client should be in global clients map")
	}
}

func TestHub_BroadcastToEvent(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear cliente mock que escucha el evento "mile-cumple"
	client1 := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "mile-cumple",
	}

	hub.register <- client1
	time.Sleep(50 * time.Millisecond)

	// Broadcast ranking solo a "mile-cumple"
	ranking := []models.RankingEntry{
		{
			Position: 1,
			Player: models.Player{
				ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
				Name:   "Player1",
				Avatar: "👤",
				Score:  10,
			},
		},
	}

	hub.BroadcastRankingToRoom("mile-cumple", ranking)

	// Verificar que el cliente recibió el mensaje
	select {
	case msg := <-client1.send:
		var wsMsg Message
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			t.Errorf("Failed to unmarshal message: %v", err)
		}
		if wsMsg.Type != "ranking_update" {
			t.Errorf("Expected ranking_update, got %s", wsMsg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Error("Client should receive message within timeout")
	}
}

func TestHub_BroadcastIsolation(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear dos clientes en diferentes eventos
	clientA := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "event-a",
	}

	clientB := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "event-b",
	}

	hub.register <- clientA
	hub.register <- clientB
	time.Sleep(50 * time.Millisecond)

	// Broadcast ranking solo a "event-a"
	ranking := []models.RankingEntry{
		{
			Position: 1,
			Player: models.Player{
				ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
				Name:   "PlayerA",
				Avatar: "👤",
				Score:  10,
			},
		},
	}

	hub.BroadcastRankingToRoom("event-a", ranking)

	// Verificar que SOLO clientA recibió el mensaje
	select {
	case msg := <-clientA.send:
		var wsMsg Message
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			t.Errorf("Failed to unmarshal message: %v", err)
		}
		if wsMsg.Type != "ranking_update" {
			t.Errorf("Expected ranking_update, got %s", wsMsg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Error("Client A should receive message within timeout")
	}

	// Verificar que clientB NO recibió nada (el canal debe estar vacío)
	select {
	case msg := <-clientB.send:
		t.Errorf("Client B should NOT receive message from event-a, got: %s", string(msg))
	default:
		// Canal vacío, esperado - cliente B no debe recibir mensajes de event-a
	}
}

func TestHub_UnregisterClient(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear cliente
	client := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "mile-cumple",
	}

	hub.register <- client
	time.Sleep(50 * time.Millisecond)

	// Verificar que está registrado
	hub.mu.RLock()
	roomClients := hub.rooms["mile-cumple"]
	hub.mu.RUnlock()

	if roomClients == nil || len(roomClients) != 1 {
		t.Fatalf("Client should be in room, got %v", roomClients)
	}

	// Desregistrar
	hub.unregister <- client
	time.Sleep(50 * time.Millisecond)

	// Verificar que fue removido
	hub.mu.RLock()
	roomClients = hub.rooms["mile-cumple"]
	hub.mu.RUnlock()

	if roomClients != nil && len(roomClients) > 0 {
		t.Error("Client should be removed from room")
	}
}

func TestHub_EmptyRoomCleanup(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear y registrar cliente
	client := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "temp-event",
	}

	hub.register <- client
	time.Sleep(50 * time.Millisecond)

	// Desregistrar
	hub.unregister <- client
	time.Sleep(50 * time.Millisecond)

	// Verificar que el room fue limpiado
	hub.mu.RLock()
	room := hub.rooms["temp-event"]
	hub.mu.RUnlock()

	// El room puede seguir existiendo como mapa vacío o haber sido eliminado
	// Ambas son aceptables - verificamos que el cliente no esté
	if room != nil && len(room) > 0 {
		t.Error("Room should be empty or removed")
	}
}

func TestHub_BroadcastToAll(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear clientes en diferentes rooms
	clientA := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "event-a",
	}

	clientB := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "event-b",
	}

	clientNoRoom := &Client{
		hub:       hub,
		conn:      &websocket.Conn{},
		send:      make(chan []byte, 256),
		EventSlug: "",
	}

	hub.register <- clientA
	hub.register <- clientB
	hub.register <- clientNoRoom
	time.Sleep(50 * time.Millisecond)

	// Broadcast global (sin room)
	ranking := []models.RankingEntry{
		{
			Position: 1,
			Player: models.Player{
				ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
				Name:   "Player1",
				Avatar: "👤",
				Score:  10,
			},
		},
	}

	hub.BroadcastRanking(ranking)

	// Verificar que todos recibieron el mensaje
	for _, client := range []*Client{clientA, clientB, clientNoRoom} {
		select {
		case msg := <-client.send:
			var wsMsg Message
			if err := json.Unmarshal(msg, &wsMsg); err != nil {
				t.Errorf("Failed to unmarshal message: %v", err)
			}
			if wsMsg.Type != "ranking_update" {
				t.Errorf("Expected ranking_update, got %s", wsMsg.Type)
			}
		case <-time.After(1 * time.Second):
			t.Error("All clients should receive global broadcast")
		}
	}
}

func TestHub_MultipleClientsSameRoom(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Crear múltiples clientes en el mismo room
	var clients []*Client
	for i := 0; i < 3; i++ {
		client := &Client{
			hub:       hub,
			conn:      &websocket.Conn{},
			send:      make(chan []byte, 256),
			EventSlug: "mile-cumple",
		}
		clients = append(clients, client)
		hub.register <- client
	}
	time.Sleep(50 * time.Millisecond)

	// Broadcast al room
	ranking := []models.RankingEntry{
		{
			Position: 1,
			Player: models.Player{
				ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
				Name:   "Player1",
				Avatar: "👤",
				Score:  10,
			},
		},
	}

	hub.BroadcastRankingToRoom("mile-cumple", ranking)

	// Verificar que TODOS los clientes recibieron el mensaje
	for i, client := range clients {
		select {
		case msg := <-client.send:
			var wsMsg Message
			if err := json.Unmarshal(msg, &wsMsg); err != nil {
				t.Errorf("Client %d: Failed to unmarshal message: %v", i, err)
			}
			if wsMsg.Type != "ranking_update" {
				t.Errorf("Client %d: Expected ranking_update, got %s", i, wsMsg.Type)
			}
		case <-time.After(1 * time.Second):
			t.Errorf("Client %d should receive message within timeout", i)
		}
	}
}

func TestHub_ConcurrentRegister(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Registrar muchos clientes concurrentemente
	var wg sync.WaitGroup
	numClients := 100

	for i := 0; i < numClients; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			client := &Client{
				hub:       hub,
				conn:      &websocket.Conn{},
				send:      make(chan []byte, 256),
				EventSlug: "test-event",
			}
			hub.register <- client
		}(i)
	}

	wg.Wait()
	time.Sleep(100 * time.Millisecond)

	// Verificar que todos están registrados
	hub.mu.RLock()
	roomClients := hub.rooms["test-event"]
	totalClients := len(hub.clients)
	hub.mu.RUnlock()

	if len(roomClients) != numClients {
		t.Errorf("Expected %d clients in room, got %d", numClients, len(roomClients))
	}

	if totalClients != numClients {
		t.Errorf("Expected %d total clients, got %d", numClients, totalClients)
	}
}

func TestHub_NonExistentRoomBroadcast(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	defer func() {
		hub.broadcast <- []byte{} // Signal to stop
	}()

	// Broadcast a un room que no existe - no debe fallar
	ranking := []models.RankingEntry{
		{
			Position: 1,
			Player: models.Player{
				ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
				Name:   "Player1",
				Avatar: "👤",
				Score:  10,
			},
		},
	}

	// Esto no debe bloquear ni panicar
	hub.BroadcastRankingToRoom("non-existent-event", ranking)

	// El broadcast a room inexistente es un no-op, el código debe continuar
	time.Sleep(50 * time.Millisecond)
}
