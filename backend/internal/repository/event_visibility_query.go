package repository

// eventVisibleToViewerSQL uses the actual effective event alias e and viewer $1.
// Callers must separately allow only their own genuinely NULL event association.
// SQL NULL represents an anonymous viewer, never a uuid.Nil pseudo-account.
const eventVisibleToViewerSQL = `
	e.visibility = 'public' OR ($1::uuid IS NOT NULL AND (
		e.owner_id = $1
		OR EXISTS (SELECT 1 FROM event_collaborators ec WHERE ec.event_id = e.id AND ec.user_id = $1)
		OR EXISTS (SELECT 1 FROM event_guests eg WHERE eg.event_id = e.id AND eg.user_id = $1)
	))
`
