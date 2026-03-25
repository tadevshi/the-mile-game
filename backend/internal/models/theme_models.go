package models

import "time"

// Theme represents visual customization for an event
type Theme struct {
	ID              string    `json:"id" db:"id"`
	EventID         string    `json:"eventId" db:"event_id"`
	PrimaryColor    string    `json:"primaryColor" db:"primary_color"`
	SecondaryColor  string    `json:"secondaryColor" db:"secondary_color"`
	AccentColor     string    `json:"accentColor" db:"accent_color"`
	BgColor         string    `json:"bgColor" db:"bg_color"`
	TextColor       string    `json:"textColor" db:"text_color"`
	DisplayFont     string    `json:"displayFont" db:"display_font"`
	HeadingFont     string    `json:"headingFont" db:"heading_font"`
	BodyFont        string    `json:"bodyFont" db:"body_font"`
	LogoPath        *string   `json:"logoPath,omitempty" db:"logo_path"`
	HeroImagePath   *string   `json:"heroImagePath,omitempty" db:"hero_image_path"`
	BackgroundStyle string    `json:"backgroundStyle" db:"background_style"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt       time.Time `json:"updatedAt" db:"updated_at"`
}

// ThemePreset represents a predefined theme configuration
type ThemePreset struct {
	Name            string `json:"name"`
	PrimaryColor    string `json:"primaryColor"`
	SecondaryColor  string `json:"secondaryColor"`
	AccentColor     string `json:"accentColor"`
	BgColor         string `json:"bgColor"`
	TextColor       string `json:"textColor"`
	DisplayFont     string `json:"displayFont"`
	HeadingFont     string `json:"headingFont"`
	BodyFont        string `json:"bodyFont"`
	BackgroundStyle string `json:"backgroundStyle"`
}

// ThemePresets contains all available theme presets
var ThemePresets = []ThemePreset{
	// ============================================
	// NEW PRESETS FROM STITCH (6 themes)
	// ============================================
	{
		Name:            "ethereal-gala",
		PrimaryColor:    "#b70049",
		SecondaryColor:  "#ff7290",
		AccentColor:     "#ff4e7c",
		BgColor:         "#fff4f7",
		TextColor:       "#48223a",
		DisplayFont:     "Great Vibes",
		HeadingFont:     "Playfair Display",
		BodyFont:        "Montserrat",
		BackgroundStyle: "watercolor",
	},
	{
		Name:            "autumnal-vows",
		PrimaryColor:    "#813a29",
		SecondaryColor:  "#58624b",
		AccentColor:     "#9f513e",
		BgColor:         "#fdf9f3",
		TextColor:       "#1c1c18",
		DisplayFont:     "Cormorant Garamond",
		HeadingFont:     "Noto Serif",
		BodyFont:        "Manrope",
		BackgroundStyle: "minimal",
	},
	{
		Name:            "kids-carnival",
		PrimaryColor:    "#705d00",
		SecondaryColor:  "#cae6ff",
		AccentColor:     "#bb0054",
		BgColor:         "#eeffdd",
		TextColor:       "#092100",
		DisplayFont:     "Fredoka One",
		HeadingFont:     "Baloo 2",
		BodyFont:        "Be Vietnam Pro",
		BackgroundStyle: "party",
	},
	{
		Name:            "monolith-editorial",
		PrimaryColor:    "#09090B",
		SecondaryColor:  "#A1A1AA",
		AccentColor:     "#71717A",
		BgColor:         "#f9f9f9",
		TextColor:       "#1b1b1b",
		DisplayFont:     "Newsreader",
		HeadingFont:     "Inter",
		BodyFont:        "Inter",
		BackgroundStyle: "minimal",
	},
	{
		Name:            "nocturne-elegance",
		PrimaryColor:    "#f1c97d",
		SecondaryColor:  "#d4ad65",
		AccentColor:     "#c084fc",
		BgColor:         "#131313",
		TextColor:       "#e5e2e1",
		DisplayFont:     "Cinzel",
		HeadingFont:     "Playfair Display",
		BodyFont:        "Crimson Pro",
		BackgroundStyle: "dark",
	},
	{
		Name:            "executive-suite",
		PrimaryColor:    "#1E3A8A",
		SecondaryColor:  "#0EA5E9",
		AccentColor:     "#6366F1",
		BgColor:         "#F0F5FF",
		TextColor:       "#1E293B",
		DisplayFont:     "Montserrat",
		HeadingFont:     "Raleway",
		BodyFont:        "Source Sans 3",
		BackgroundStyle: "minimal",
	},
	// ============================================
	// LEGACY PRESETS (keep for backward compatibility)
	// ============================================
	{
		Name:            "princess",
		PrimaryColor:    "#EC4899",
		SecondaryColor:  "#FBCFE8",
		AccentColor:     "#DB2777",
		BgColor:         "#FFF5F7",
		TextColor:       "#1E293B",
		DisplayFont:     "Great Vibes",
		HeadingFont:     "Playfair Display",
		BodyFont:        "Montserrat",
		BackgroundStyle: "watercolor",
	},
	{
		Name:            "elegant",
		PrimaryColor:    "#8B5CF6",
		SecondaryColor:  "#DDD6FE",
		AccentColor:     "#6D28D9",
		BgColor:         "#F5F3FF",
		TextColor:       "#1E293B",
		DisplayFont:     "Playfair Display",
		HeadingFont:     "Cinzel",
		BodyFont:        "Lato",
		BackgroundStyle: "minimal",
	},
	{
		Name:            "party",
		PrimaryColor:    "#F59E0B",
		SecondaryColor:  "#FDE68A",
		AccentColor:     "#D97706",
		BgColor:         "#FFFBEB",
		TextColor:       "#1E293B",
		DisplayFont:     "Fredoka One",
		HeadingFont:     "Nunito",
		BodyFont:        "Open Sans",
		BackgroundStyle: "party",
	},
	{
		Name:            "dark",
		PrimaryColor:    "#06B6D4",
		SecondaryColor:  "#67E8F9",
		AccentColor:     "#0891B2",
		BgColor:         "#0F172A",
		TextColor:       "#F8FAFC",
		DisplayFont:     "Inter",
		HeadingFont:     "Roboto",
		BodyFont:        "Inter",
		BackgroundStyle: "dark",
	},
	{
		Name:            "corporate",
		PrimaryColor:    "#3B82F6",
		SecondaryColor:  "#BFDBFE",
		AccentColor:     "#2563EB",
		BgColor:         "#EFF6FF",
		TextColor:       "#1E293B",
		DisplayFont:     "Montserrat",
		HeadingFont:     "Raleway",
		BodyFont:        "Source Sans Pro",
		BackgroundStyle: "minimal",
	},
	{
		Name:            "kids",
		PrimaryColor:    "#10B981",
		SecondaryColor:  "#A7F3D0",
		AccentColor:     "#059669",
		BgColor:         "#ECFDF5",
		TextColor:       "#1E293B",
		DisplayFont:     "Bubblegum Sans",
		HeadingFont:     "Comic Neue",
		BodyFont:        "Nunito",
		BackgroundStyle: "party",
	},
}

// GetPresetByName returns a theme preset by name
func GetPresetByName(name string) (ThemePreset, bool) {
	for _, preset := range ThemePresets {
		if preset.Name == name {
			return preset, true
		}
	}
	return ThemePresets[0], false // Return princess as default
}

// ApplyPreset creates a new Theme from a preset
func ApplyPreset(preset ThemePreset, eventID string) *Theme {
	return &Theme{
		EventID:         eventID,
		PrimaryColor:    preset.PrimaryColor,
		SecondaryColor:  preset.SecondaryColor,
		AccentColor:     preset.AccentColor,
		BgColor:         preset.BgColor,
		TextColor:       preset.TextColor,
		DisplayFont:     preset.DisplayFont,
		HeadingFont:     preset.HeadingFont,
		BodyFont:        preset.BodyFont,
		BackgroundStyle: preset.BackgroundStyle,
	}
}
