package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

func TestLegacyAdminRepositoryLive(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	viewer, other, guest, empty := createTestUser(t, db), createTestUser(t, db), createTestUser(t, db), createTestUser(t, db)
	events, repo := NewEventRepository(db), NewPostcardRepository(db, "")
	var fixtures, want []models.Postcard
	var deniedEvent uuid.UUID
	for i := 0; i < 7; i++ {
		owner := other.ID
		if i < 2 {
			owner = viewer.ID
		}
		if i == 6 {
			owner = empty.ID
		}
		e, err := events.Create(owner, "admin-"+uuid.NewString(), "Admin fixture", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
		require.NoError(t, err)
		if i%2 == 1 {
			e.Visibility = "private"
			require.NoError(t, events.Update(e))
		}
		if i == 2 || i == 3 {
			_, err = NewCollaboratorRepository(db).Create(e.ID, viewer.ID)
			require.NoError(t, err)
		}
		if i == 5 {
			deniedEvent = e.ID
			guests := NewGuestRepository(db)
			token, err := guests.InviteToken(e.ID, false)
			require.NoError(t, err)
			for _, id := range []uuid.UUID{viewer.ID, guest.ID} {
				_, err = guests.Accept(token, id)
				require.NoError(t, err)
			}
		}
		if i == 6 {
			continue
		}
		regular, err := repo.CreateWithEvent(e.ID, nil, "regular.png", "regular", 0, nil, "image", nil, nil)
		require.NoError(t, err)
		fixtures = append(fixtures, *regular)
		secret, err := repo.CreateSecret(e.ID, "Sender", "secret.mp4", "secret", 1.5, "video", nil, nil)
		require.NoError(t, err)
		if i == 0 {
			secret, err = repo.RevealPostcard(secret.ID)
			require.NoError(t, err)
		}
		require.Nil(t, secret.PlayerID)
		require.Equal(t, e.ID, secret.EventID)
		fixtures = append(fixtures, *secret)
		if i < 4 {
			want = append([]models.Postcard{*secret}, want...)
		}
	}
	// Historical NULL ownership is a deliberately malformed fixture, not an inferred event.
	nullID := uuid.New()
	_, err := db.Exec(`INSERT INTO postcards (id, image_path, message, rotation, is_secret) VALUES ($1, 'null.png', 'unknown owner', 0, TRUE)`, nullID)
	require.NoError(t, err)
	unknown, err := repo.GetByID(nullID)
	require.NoError(t, err)
	fixtures = append(fixtures, *unknown)
	for _, tc := range []struct {
		id      uuid.UUID
		allowed bool
		cards   []models.Postcard
	}{
		{viewer.ID, true, want}, {guest.ID, false, nil}, {createTestUser(t, db).ID, false, nil}, {empty.ID, true, nil},
	} {
		allowed, err := repo.HasAdministrativeEvents(tc.id)
		require.NoError(t, err)
		require.Equal(t, tc.allowed, allowed)
		cards, err := repo.ListSecretForAdmin(tc.id)
		require.NoError(t, err)
		require.Equal(t, tc.cards, cards)
		status, err := repo.GetSecretBoxStatusForAdmin(tc.id)
		require.NoError(t, err)
		expected := &models.SecretBoxStatus{Total: len(tc.cards)}
		if tc.id == viewer.ID {
			expected.Revealed = true
			expected.RevealedAt = want[len(want)-1].RevealedAt
		}
		require.Equal(t, expected, status)
		if tc.id != viewer.ID {
			revealed, err := repo.RevealSecretBoxForAdmin(tc.id)
			require.NoError(t, err)
			require.Empty(t, revealed)
		}
	}
	revealed, err := repo.RevealSecretBoxForAdmin(viewer.ID)
	require.NoError(t, err)
	require.Len(t, revealed, 4)
	for i, card := range revealed {
		require.NotNil(t, card.RevealedAt)
		expected := want[i]
		expected.RevealedAt = card.RevealedAt
		require.Equal(t, expected, card)
	}
	repeated, err := repo.RevealSecretBoxForAdmin(viewer.ID)
	require.NoError(t, err)
	require.Equal(t, revealed, repeated)
	status, err := repo.GetSecretBoxStatusForAdmin(viewer.ID)
	require.NoError(t, err)
	require.Equal(t, &models.SecretBoxStatus{Total: 4, Revealed: true, RevealedAt: revealed[0].RevealedAt}, status)
	for _, before := range fixtures {
		after, err := repo.GetByID(before.ID)
		require.NoError(t, err)
		if before.IsSecret && before.EventID != uuid.Nil && before.EventID != deniedEvent {
			for _, card := range revealed {
				if card.ID == before.ID {
					before = card
				}
			}
		}
		require.Equal(t, before, *after)
	}
	// Membership changes take effect on the next read, with no cached ID set.
	require.NoError(t, NewCollaboratorRepository(db).Delete(want[0].EventID, viewer.ID))
	cards, err := repo.ListSecretForAdmin(viewer.ID)
	require.NoError(t, err)
	require.Len(t, cards, 3)
}

// Transaction boundary double checks sequencing and failures, not SQL policy;
// PostgreSQL fixtures above prove the actual owner/collaborator predicate.
type adminTxSQL struct {
	fail            string
	viewer          uuid.UUID
	calls           []string
	pending, stored bool
}

func (s *adminTxSQL) Connect(context.Context) (driver.Conn, error) { return s, nil }
func (s *adminTxSQL) Driver() driver.Driver                        { return s }
func (s *adminTxSQL) Open(string) (driver.Conn, error)             { return s, nil }
func (s *adminTxSQL) Close() error                                 { return nil }
func (s *adminTxSQL) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (s *adminTxSQL) step(name string) error {
	s.calls = append(s.calls, name)
	if s.fail == name {
		return errors.New(name + " failed")
	}
	return nil
}
func (s *adminTxSQL) Begin() (driver.Tx, error) { return s, s.step("begin") }
func (s *adminTxSQL) Commit() error {
	err := s.step("commit")
	if err == nil {
		s.stored = s.pending
	}
	return err
}
func (s *adminTxSQL) Rollback() error {
	s.pending = false
	return s.step("rollback")
}
func (s *adminTxSQL) ExecContext(_ context.Context, _ string, args []driver.NamedValue) (driver.Result, error) {
	if len(args) != 1 || args[0].Value != s.viewer.String() {
		return nil, errors.New("incorrect viewer")
	}
	err := s.step("update")
	s.pending = err == nil
	return driver.RowsAffected(1), err
}
func (s *adminTxSQL) QueryContext(_ context.Context, _ string, args []driver.NamedValue) (driver.Rows, error) {
	if len(args) != 1 || args[0].Value != s.viewer.String() {
		return nil, errors.New("incorrect viewer")
	}
	return &adminTxRows{s: s}, s.step("readback")
}

type adminTxRows struct {
	s    *adminTxSQL
	done bool
}

func (r *adminTxRows) Columns() []string { return make([]string, 15) }
func (r *adminTxRows) Close() error      { return nil }
func (r *adminTxRows) Next(values []driver.Value) error {
	if r.s.fail == "rows" {
		return errors.New("iteration failed")
	}
	if r.done {
		return io.EOF
	}
	r.done = true
	copy(values, []driver.Value{uuid.NewString(), uuid.NewString(), nil, "Sender", "Sender", "🎁", "secret.png", "secret", float64(1), true, time.Unix(0, 0), time.Unix(0, 0), "image", nil, nil})
	if r.s.fail == "scan" {
		values[8] = "not a number"
	}
	return nil
}
func TestLegacyAdminTransactionFailures(t *testing.T) {
	for _, fail := range []string{"begin", "update", "readback", "scan", "rows", "commit", ""} {
		t.Run("failure="+fail, func(t *testing.T) {
			s := &adminTxSQL{fail: fail, viewer: uuid.New()}
			db := sql.OpenDB(s)
			defer db.Close()
			cards, err := NewPostcardRepository(db, "").RevealSecretBoxForAdmin(s.viewer)
			if fail == "" {
				require.NoError(t, err)
				require.Len(t, cards, 1)
			} else {
				require.Error(t, err)
				require.Nil(t, cards)
			}
			expected := []string{"begin", "update", "readback"}
			switch fail {
			case "begin":
				expected = expected[:1]
			case "update":
				expected = append(expected[:2], "rollback")
			case "readback", "scan", "rows":
				expected = append(expected, "rollback")
			default:
				expected = append(expected, "commit")
			}
			require.Equal(t, expected, s.calls)
			require.Equal(t, fail == "", s.stored)
			if fail != "commit" && fail != "" {
				require.False(t, s.pending)
			}
		})
	}
}
