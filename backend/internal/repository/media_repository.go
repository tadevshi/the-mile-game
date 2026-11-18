package repository

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
)

// MediaKind identifies the stored reference a media path comes from.
type MediaKind string

const (
	MediaKindPostcardImage     MediaKind = "postcard_image"
	MediaKindPostcardThumbnail MediaKind = "postcard_thumbnail"
	MediaKindEventLogo         MediaKind = "event_logo"
	MediaKindEventBackground   MediaKind = "event_background"
	MediaKindThemeHeroImage    MediaKind = "theme_hero_image"
)

// ErrMediaNotFound reports that no stored record references the requested path.
var ErrMediaNotFound = errors.New("media not found")

// MediaRecord is a stored media file and the event that owns it. A nil EventID
// means that the media belongs to no event.
type MediaRecord struct {
	Path    string
	EventID *uuid.UUID
	Kind    MediaKind
}

// MediaRepository resolves a stored media path to the event that owns it.
type MediaRepository struct {
	db *sql.DB
}

// NewMediaRepository creates a media repository.
func NewMediaRepository(db *sql.DB) *MediaRepository {
	return &MediaRepository{db: db}
}

// FindByPath returns every stored media record that references the stored
// path, for example "/uploads/postcards/abc.jpg". The path is always bound as
// a query parameter and never interpolated into the SQL text. The lookup
// covers every stored reference of a media file: the postcard image and
// thumbnail, the event logo and background, and the theme hero image.
//
// A path can be referenced by more than one record, for example when two
// events share a logo. Every match is returned so the caller can apply the
// strictest policy: the media is only served when the caller may read all the
// records that point to it.
func (r *MediaRepository) FindByPath(storedPath string) ([]*MediaRecord, error) {
	if storedPath == "" {
		return nil, ErrMediaNotFound
	}
	relativePath := strings.TrimPrefix(storedPath, "/uploads/")

	const query = `
		SELECT event_id::text AS event_id, 'postcard_image' AS kind FROM postcards
			WHERE image_path = $1 OR image_path = $2
		UNION ALL
		SELECT event_id::text AS event_id, 'postcard_thumbnail' AS kind FROM postcards
			WHERE thumbnail_path = $1 OR thumbnail_path = $2
		UNION ALL
		SELECT id::text AS event_id, 'event_logo' AS kind FROM events
			WHERE settings->>'logo_url' = $1 OR settings->>'logo_url' = $2
		UNION ALL
		SELECT id::text AS event_id, 'event_background' AS kind FROM events
			WHERE settings->>'background_url' = $1 OR settings->>'background_url' = $2
		UNION ALL
		SELECT event_id::text AS event_id, 'theme_hero_image' AS kind FROM themes
			WHERE hero_image_path = $1 OR hero_image_path = $2`

	rows, err := r.db.Query(query, storedPath, relativePath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := []*MediaRecord{}
	for rows.Next() {
		var eventID sql.NullString
		var kind string
		if err := rows.Scan(&eventID, &kind); err != nil {
			return nil, err
		}

		record := &MediaRecord{Path: storedPath, Kind: MediaKind(kind)}
		if eventID.Valid && eventID.String != "" {
			parsed, parseErr := uuid.Parse(eventID.String)
			if parseErr != nil {
				return nil, parseErr
			}
			record.EventID = &parsed
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, ErrMediaNotFound
	}
	return records, nil
}
