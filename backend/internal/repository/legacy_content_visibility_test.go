package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/the-mile-game/backend/internal/models"
)

func TestLegacyContentVisibleSet(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live PostgreSQL")
	}
	db := setupTestDB(t)
	defer db.Close()
	owner, collaborator, guest, unrelated := createTestUser(t, db), createTestUser(t, db), createTestUser(t, db), createTestUser(t, db)
	events := NewEventRepository(db)
	var eventIDs []uuid.UUID
	for i := 0; i < 3; i++ {
		ownerID := unrelated.ID
		if i == 1 {
			ownerID = owner.ID
		}
		e, err := events.Create(ownerID, "content-"+uuid.NewString(), "Content", "", models.EventFeatures{}, models.EventSettings{}, nil, nil)
		require.NoError(t, err)
		if i != 0 {
			e.Visibility = "private"
		}
		require.NoError(t, events.Update(e))
		eventIDs = append(eventIDs, e.ID)
	}
	_, err := NewCollaboratorRepository(db).Create(eventIDs[1], collaborator.ID)
	require.NoError(t, err)
	guests := NewGuestRepository(db)
	token, err := guests.InviteToken(eventIDs[1], false)
	require.NoError(t, err)
	_, err = guests.Accept(token, guest.ID)
	require.NoError(t, err)
	players, postcards, quiz := NewPlayerRepository(db), NewPostcardRepository(db, ""), NewQuizRepository(db)
	var cards []models.Postcard
	var answers []models.QuizAnswers
	for _, eventID := range append(eventIDs, uuid.Nil) {
		var p *models.Player
		if eventID == uuid.Nil {
			p, err = players.Create("Legacy", "avatar")
		} else {
			p, err = players.CreateWithEvent(eventID, "Player", "avatar")
		}
		require.NoError(t, err)
		description := "  description-" + uuid.NewString() + "  "
		require.NoError(t, quiz.SaveAnswers(p.ID, map[string]string{"favorite": "value"}, nil, description))
		a, err := quiz.GetAnswersByPlayerID(p.ID)
		require.NoError(t, err)
		answers = append(answers, *a)
		// Legacy Create leaves postcard.event_id NULL: the player's event must protect it.
		c, err := postcards.Create(p.ID, "image.png", "message", 2.5, nil, "image", nil, nil)
		require.NoError(t, err)
		cards = append(cards, *c)
	}
	// Empty descriptions still do not appear.
	blank, err := players.Create("Blank", "avatar")
	require.NoError(t, err)
	require.NoError(t, quiz.SaveAnswers(blank.ID, nil, nil, "   "))
	for _, eventID := range eventIDs[:2] {
		c, err := postcards.CreateWithEvent(eventID, nil, "video.mp4", "scoped", -3, nil, "video", nil, nil)
		require.NoError(t, err)
		cards = append(cards, *c)
		for _, reveal := range []bool{false, true} {
			c, err := postcards.CreateSecret(eventID, "Sender", "secret.png", "secret", 1, "image", nil, nil)
			require.NoError(t, err)
			if reveal {
				c, err = postcards.RevealPostcard(c.ID)
				require.NoError(t, err)
			}
			cards = append(cards, *c)
		}
	}
	for _, tc := range []struct {
		name   string
		viewer *uuid.UUID
		member bool
	}{
		{"anonymous", nil, false}, {"unrelated", &createTestUser(t, db).ID, false},
		{"owner", &owner.ID, true}, {"collaborator", &collaborator.ID, true}, {"guest", &guest.ID, true},
	} {
		t.Run(tc.name+"/postcards", func(t *testing.T) {
			got, err := postcards.ListVisible(tc.viewer)
			require.NoError(t, err)
			var selected, want []models.Postcard
			for _, c := range got {
				for _, f := range cards {
					if c.ID == f.ID {
						selected = append(selected, c)
					}
				}
			}
			// Match the original secret-first, newest-first ordering and entire projection.
			for i := len(cards) - 1; i >= 0; i-- {
				f := cards[i]
				private := i == 1 || i >= 7
				if i == 2 || (private && !tc.member) || (f.IsSecret && f.RevealedAt == nil) {
					continue
				}
				want = append(want, f)
			}
			// Revealed secrets precede every normal postcard, regardless of creation time.
			ordered := []models.Postcard{}
			for _, c := range want {
				if c.IsSecret {
					ordered = append(ordered, c)
				}
			}
			for _, c := range want {
				if !c.IsSecret {
					ordered = append(ordered, c)
				}
			}
			require.Equal(t, ordered, selected)
		})
		t.Run(tc.name+"/descriptions", func(t *testing.T) {
			got, err := quiz.ListDescriptionsVisible(tc.viewer)
			require.NoError(t, err)
			var selected, want []string
			for _, d := range got {
				for _, a := range answers {
					if d == a.Description {
						selected = append(selected, d)
					}
				}
			}
			for i, a := range answers {
				if i == 0 || i == 3 || (i == 1 && tc.member) {
					want = append(want, a.Description)
				}
			}
			require.Equal(t, want, selected)
			require.NotContains(t, got, "   ")
		})
	}
	for _, f := range cards {
		got, err := postcards.GetByID(f.ID)
		require.NoError(t, err)
		require.Equal(t, f, *got)
	}
	for _, a := range answers {
		got, err := quiz.GetAnswersByPlayerID(a.PlayerID)
		require.NoError(t, err)
		require.Equal(t, a, *got)
	}
	all, err := postcards.List()
	require.NoError(t, err)
	for _, f := range cards {
		if !f.IsSecret || f.RevealedAt != nil {
			require.Contains(t, all, f)
		}
	}
	descriptions, err := quiz.ListDescriptions()
	require.NoError(t, err)
	for _, a := range answers {
		require.Contains(t, descriptions, a.Description)
	}
}
