package services

// MediaSessionCookieName is the cookie that carries the account identity to
// the native browser media requests. A native element such as an image or a
// video cannot send an Authorization header, so the identity travels in this
// cookie. It lives here because both the media route and the middleware that
// issues it need the same name.
const MediaSessionCookieName = "eventhub_media_session"
