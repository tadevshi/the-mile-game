package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

func TestPlayerVisibleSet(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live PostgreSQL")
	}
	db := setupTestDB(t)
	defer db.Close()
	// Unique fixtures: never delete unrelated data from the shared test database.
	owner, collaborator, guest, unrelated := createTestUser(t, db), createTestUser(t, db), createTestUser(t, db), createTestUser(t, db)
	events := NewEventRepository(db)
	makeEvent := func(ownerID uuid.UUID, visibility string) *models.Event {
		e, err := events.Create(ownerID, "visible-"+uuid.NewString(), "Visibility", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
		require.NoError(t, err)
		e.Visibility = visibility
		require.NoError(t, events.Update(e))
		return e
	}
	public := makeEvent(unrelated.ID, "public")
	private := makeEvent(owner.ID, "private")
	otherPrivate := makeEvent(unrelated.ID, "private")
	_, err := NewCollaboratorRepository(db).Create(private.ID, collaborator.ID)
	require.NoError(t, err)
	guests := NewGuestRepository(db)
	token, err := guests.InviteToken(private.ID, false)
	require.NoError(t, err)
	_, err = guests.Accept(token, guest.ID)
	require.NoError(t, err)
	repo := NewPlayerRepository(db)
	var fixtures []models.Player
	for i, eventID := range []uuid.UUID{otherPrivate.ID, private.ID, public.ID, uuid.Nil} {
		var p *models.Player
		if eventID == uuid.Nil {
			p, err = repo.Create("Legacy", "avatar")
		} else {
			p, err = repo.CreateWithEvent(eventID, "Event player", "avatar")
		}
		require.NoError(t, err)
		p.Score = 40 - i*10
		require.NoError(t, repo.UpdateScore(p.ID, p.Score))
		stored, err := repo.GetByID(p.ID)
		require.NoError(t, err)
		fixtures = append(fixtures, *stored)
	}
	for _, tc := range []struct {
		name    string
		viewer  *uuid.UUID
		private bool
	}{
		{"anonymous", nil, false}, {"unrelated", &createTestUser(t, db).ID, false},
		{"owner", &owner.ID, true}, {"collaborator", &collaborator.ID, true}, {"guest", &guest.ID, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := repo.ListVisible(tc.viewer)
			require.NoError(t, err)
			var selected []models.Player
			for i, p := range got {
				if i > 0 {
					require.GreaterOrEqual(t, got[i-1].Score, p.Score)
				}
				for _, f := range fixtures {
					if p.ID == f.ID {
						selected = append(selected, p)
					}
				}
			}
			want := fixtures[2:]
			if tc.private {
				want = fixtures[1:]
			}
			require.Equal(t, want, selected)
			for _, f := range fixtures {
				stored, err := repo.GetByID(f.ID)
				require.NoError(t, err)
				require.Equal(t, f, *stored, "reads must not mutate players or scores")
			}
		})
	}
	// Visibility is evaluated at read time, not collected/cached during login.
	private.Visibility = "public"
	require.NoError(t, events.Update(private))
	got, err := repo.ListVisible(nil)
	require.NoError(t, err)
	require.Contains(t, got, fixtures[1])
	// Existing unfiltered callers keep their original List behavior.
	all, err := repo.List()
	require.NoError(t, err)
	for _, f := range fixtures {
		require.Contains(t, all, f)
	}
}
