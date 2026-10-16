package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCacheControlPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(Cache())
	engine.GET("/*path", func(c *gin.Context) { c.Status(http.StatusOK) })

	tests := []struct {
		name   string
		path   string
		header string
	}{
		{"index page revalidates", "/", "no-cache"},
		{"robots.txt revalidates (dynamic domain source)", "/robots.txt", "no-cache"},
		{"sitemap.xml revalidates (dynamic domain source)", "/sitemap.xml", "no-cache"},
		{"static page keeps one-week cache", "/pricing/", "max-age=604800"},
		{"asset keeps one-week cache", "/assets/index.js", "max-age=604800"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, tt.path, nil))
			assert.Equal(t, http.StatusOK, recorder.Code)
			assert.Equal(t, tt.header, recorder.Header().Get("Cache-Control"))
		})
	}
}
