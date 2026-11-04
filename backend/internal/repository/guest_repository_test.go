package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

// A minimal database/sql boundary double: no live database or dependency needed.
// The live lifecycle test below separately verifies PostgreSQL persistence.
type guestQuery struct {
	contains string
	args     []any
	rows     [][]driver.Value
	err      error
}

type guestSQL struct {
	t       *testing.T
	queries []guestQuery
}

func (s *guestSQL) Connect(context.Context) (driver.Conn, error) { return s, nil }
func (s *guestSQL) Driver() driver.Driver                       { return s }
func (s *guestSQL) Open(string) (driver.Conn, error)             { return s, nil }
func (s *guestSQL) Close() error                                { return nil }

func (s *guestSQL) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected Prepare")
}

func (s *guestSQL) Begin() (driver.Tx, error) {
	return nil, errors.New("unexpected Begin")
}

func (s *guestSQL) QueryContext(_ context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	require.NotEmpty(s.t, s.queries, "unexpected query: %s", query)
	q := s.queries[0]
	s.queries = s.queries[1:]
	require.Contains(s.t, query, q.contains)
	require.NotContains(s.t, query, "event_collaborators")
	require.NotContains(s.t, query, "players")
	require.Len(s.t, args, len(q.args))
	for i, expected := range q.args {
		if expected != nil {
			require.Equal(s.t, expected, args[i].Value)
		} else {
			require.NoError(s.t, uuid.Validate(args[i].Value.(string)))
		}
	}
	if strings.Contains(query, "INSERT INTO event_guests") {
		require.Contains(s.t, query, "WHERE token = $1 FOR SHARE")
		require.Contains(s.t, query, "ON CONFLICT (event_id, user_id) DO UPDATE SET user_id = EXCLUDED.user_id")
	}
	if strings.Contains(query, "INSERT INTO event_guest_invites") {
		require.Contains(s.t, query, "ELSE event_guest_invites.token END")
	}
	return &guestRows{rows: q.rows}, q.err
}

type guestRows struct {
	rows [][]driver.Value
}

func (r *guestRows) Columns() []string {
	if len(r.rows) > 0 {
		return make([]string, len(r.rows[0]))
	}
	return []string{"empty"}
}

func (r *guestRows) Close() error { return nil }

func (r *guestRows) Next(values []driver.Value) error {
	if len(r.rows) == 0 {
		return io.EOF
	}
	copy(values, r.rows[0])
	r.rows = r.rows[1:]
	return nil
}

func guestTestRepo(t *testing.T, queries ...guestQuery) *GuestRepository {
	s := &guestSQL{t: t, queries: queries}
	db := sql.OpenDB(s)
	t.Cleanup(func() {
		require.Empty(t, s.queries)
		require.NoError(t, db.Close())
	})
	return NewGuestRepository(db)
}

func TestGuestRepositoryLiveLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping live PostgreSQL integration test in short mode")
	}
	db := setupTestDB(t)
	defer db.Close()
	defer cleanupTestData(t, db)
	owner := createTestUser(t, db)
	account := createTestUser(t, db)
	newcomer := createTestUser(t, db)
	events := NewEventRepository(db)
	event, err := events.Create(owner.ID, "guest-"+uuid.NewString(), "Guest event", "",
		models.EventFeatures{}, models.EventSettings{}, nil, nil)
	require.NoError(t, err)
	guests := NewGuestRepository(db)
	collaborators := NewCollaboratorRepository(db)

	first, err := guests.InviteToken(event.ID, false)
	require.NoError(t, err)
	require.NoError(t, uuid.Validate(first))
	read, err := guests.InviteToken(event.ID, false)
	require.NoError(t, err)
	require.Equal(t, first, read)
	member, err := guests.Accept(first, account.ID)
	require.NoError(t, err)
	require.Equal(t, event.ID, member.EventID)
	require.Equal(t, account.ID, member.UserID)
	require.NotEqual(t, uuid.Nil, member.ID)
	require.False(t, member.CreatedAt.IsZero())
	repeated, err := guests.Accept(first, account.ID)
	require.NoError(t, err)
	require.Equal(t, member, repeated)

	rotated, err := guests.InviteToken(event.ID, true)
	require.NoError(t, err)
	require.NotEqual(t, first, rotated)
	for _, userID := range []uuid.UUID{account.ID, newcomer.ID} {
		rejected, err := guests.Accept(first, userID)
		require.ErrorIs(t, err, sql.ErrNoRows)
		require.Nil(t, rejected)
	}
	stored, err := guests.GetByEventAndUser(event.ID, account.ID)
	require.NoError(t, err)
	require.Equal(t, member, stored)
	exists, err := guests.Exists(event.ID, newcomer.ID)
	require.NoError(t, err)
	require.False(t, exists)
	repeated, err = guests.Accept(rotated, account.ID)
	require.NoError(t, err)
	require.Equal(t, member, repeated)
	joined, err := guests.Accept(rotated, newcomer.ID)
	require.NoError(t, err)
	require.Equal(t, event.ID, joined.EventID)
	require.Equal(t, newcomer.ID, joined.UserID)

	// AdminMiddleware checks this collaborator repository, never guest Exists.
	for _, userID := range []uuid.UUID{account.ID, newcomer.ID} {
		exists, err := guests.Exists(event.ID, userID)
		require.NoError(t, err)
		require.True(t, exists)
		isAdmin, err := collaborators.Exists(event.ID, userID)
		require.NoError(t, err)
		require.False(t, isAdmin)
	}
}

func TestGuestRepositoryInvite(t *testing.T) {
	event := uuid.New()
	for _, rotate := range []bool{false, true} {
		t.Run(map[bool]string{false: "read or create", true: "regenerate"}[rotate], func(t *testing.T) {
			repo := guestTestRepo(t, guestQuery{
				contains: "INSERT INTO event_guest_invites",
				args: []any{event.String(), nil, rotate}, rows: [][]driver.Value{{"current-token"}},
			})
			token, err := repo.InviteToken(event, rotate)
			require.NoError(t, err)
			require.Equal(t, "current-token", token)
		})
	}
}

func TestGuestRepositoryMembership(t *testing.T) {
	id, event, user := uuid.New(), uuid.New(), uuid.New()
	now := time.Now()
	row := [][]driver.Value{{id.String(), event.String(), user.String(), now}}
	repo := guestTestRepo(t,
		guestQuery{contains: "INSERT INTO event_guests", args: []any{"valid", nil, user.String()}, rows: row},
		guestQuery{contains: "FROM event_guests WHERE", args: []any{event.String(), user.String()}, rows: row},
		guestQuery{contains: "SELECT EXISTS(SELECT 1 FROM event_guests", args: []any{event.String(), user.String()}, rows: [][]driver.Value{{true}}},
	)
	member, err := repo.Accept("valid", user)
	require.NoError(t, err)
	require.Equal(t, id, member.ID)
	require.Equal(t, event, member.EventID)
	require.Equal(t, user, member.UserID)
	require.Equal(t, now, member.CreatedAt)
	found, err := repo.GetByEventAndUser(event, user)
	require.NoError(t, err)
	require.Equal(t, member, found)
	exists, err := repo.Exists(event, user)
	require.NoError(t, err)
	require.True(t, exists)
}

func TestGuestRepositoryFailure(t *testing.T) {
	user, event := uuid.New(), uuid.New()
	failure := errors.New("database unavailable")
	repo := guestTestRepo(t,
		guestQuery{contains: "INSERT INTO event_guests", args: []any{"invalid", nil, user.String()}},
		guestQuery{contains: "INSERT INTO event_guests", args: []any{"valid", nil, user.String()}, err: failure},
		guestQuery{contains: "FROM event_guests WHERE", args: []any{event.String(), user.String()}},
		guestQuery{contains: "SELECT EXISTS", args: []any{event.String(), user.String()}, err: failure},
		guestQuery{contains: "INSERT INTO event_guest_invites", args: []any{event.String(), nil, true}, err: failure},
	)
	member, err := repo.Accept("invalid", user)
	require.ErrorIs(t, err, sql.ErrNoRows)
	require.Nil(t, member)
	member, err = repo.Accept("valid", user)
	require.ErrorIs(t, err, failure)
	require.Nil(t, member)
	member, err = repo.GetByEventAndUser(event, user)
	require.ErrorIs(t, err, sql.ErrNoRows)
	require.Nil(t, member)
	exists, err := repo.Exists(event, user)
	require.ErrorIs(t, err, failure)
	require.False(t, exists)
	_, err = repo.InviteToken(event, true)
	require.ErrorIs(t, err, failure)
}
