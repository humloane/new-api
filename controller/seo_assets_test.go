package controller

import (
	"encoding/xml"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseSEOOrigin(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", ""},
		{"bare https origin", "https://www.aimoxt.com", "https://www.aimoxt.com"},
		{"trailing slash and whitespace", " https://www.aimoxt.com/ ", "https://www.aimoxt.com"},
		{"http origin rejected", "http://www.aimoxt.com", ""},
		{"default localhost address rejected", "http://localhost:3000", ""},
		{"https localhost rejected", "https://localhost", ""},
		{"subdomain localhost rejected", "https://foo.localhost", ""},
		{"mDNS name rejected", "https://new-api.local", ""},
		{"127.0.0.1 rejected", "https://127.0.0.1:8443", ""},
		{"ipv6 loopback rejected", "https://[::1]", ""},
		{"unspecified address rejected", "https://0.0.0.0:8443", ""},
		{"link-local address rejected", "https://[fe80::1]", ""},
		{"private IP allowed as operator decision", "https://192.168.1.10", "https://192.168.1.10"},
		{"credentials rejected", "https://user:pass@example.com", ""},
		{"path rejected", "https://example.com/api", ""},
		{"query rejected", "https://example.com/?q=1", ""},
		{"fragment rejected", "https://example.com/#x", ""},
		{"invalid scheme rejected", "ftp://example.com", ""},
		{"invalid url rejected", "not a url", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, parseSEOOrigin(tt.in))
		})
	}
}

func TestBuildRobotsTxt(t *testing.T) {
	robots := BuildRobotsTxt("https://www.aimoxt.com")
	assert.True(t, strings.HasPrefix(robots, "User-agent: *\nAllow: /\n"))
	assert.Contains(t, robots, "Disallow: /_authenticated/")
	assert.Contains(t, robots, "Disallow: /api/")
	assert.Contains(t, robots, "Sitemap: https://www.aimoxt.com/sitemap.xml")
	// 公开营销页面不能被禁止收录
	assert.NotContains(t, robots, "Disallow: /pricing")
	assert.NotContains(t, robots, "Disallow: /rankings")

	empty := BuildRobotsTxt("")
	assert.NotContains(t, empty, "Sitemap:")
}

func TestBuildSitemapXML(t *testing.T) {
	sitemap := BuildSitemapXML("https://www.aimoxt.com", "2026-01-02")

	// XML 必须可被完整解析
	dec := xml.NewDecoder(strings.NewReader(sitemap))
	for {
		_, err := dec.Token()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
	}
	assert.Equal(t, len(seoSitemapPaths), strings.Count(sitemap, "<loc>"))
	for _, p := range seoSitemapPaths {
		assert.Contains(t, sitemap, "https://www.aimoxt.com"+p)
	}
	assert.Equal(t, len(seoSitemapPaths), strings.Count(sitemap, "<lastmod>"))

	noMod := BuildSitemapXML("https://www.aimoxt.com", "")
	assert.NotContains(t, noMod, "lastmod")
}

func TestServeSeoAssetHandlers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	withFiles := t.TempDir()
	staticRobots := "static-robots\n"
	staticSitemap := "static-sitemap\n"
	require.NoError(t, os.WriteFile(filepath.Join(withFiles, "robots.txt"), []byte(staticRobots), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(withFiles, "sitemap.xml"), []byte(staticSitemap), 0o644))
	emptyDir := t.TempDir()

	original := system_setting.ServerAddress
	t.Cleanup(func() {
		system_setting.ServerAddress = original
	})

	tests := []struct {
		name            string
		serverAddress   string
		path            string
		staticFS        fs.FS
		wantStatus      int
		wantBody        string
		wantContains    []string
		wantNotContains []string
	}{
		{
			name:            "robots.txt generated from admin server address",
			serverAddress:   "https://www.aimoxt.com",
			path:            "/robots.txt",
			staticFS:        os.DirFS(withFiles),
			wantStatus:      http.StatusOK,
			wantContains:    []string{"Sitemap: https://www.aimoxt.com/sitemap.xml"},
			wantNotContains: []string{"static-robots"},
		},
		{
			name:            "sitemap.xml generated from admin server address without fake lastmod",
			serverAddress:   "https://www.aimoxt.com/",
			path:            "/sitemap.xml",
			staticFS:        os.DirFS(withFiles),
			wantStatus:      http.StatusOK,
			wantContains:    []string{"<loc>https://www.aimoxt.com/pricing</loc>"},
			wantNotContains: []string{"static-sitemap", "lastmod"},
		},
		{
			name:          "unconfigured address falls back to static robots.txt",
			serverAddress: "not-configured",
			path:          "/robots.txt",
			staticFS:      os.DirFS(withFiles),
			wantStatus:    http.StatusOK,
			wantBody:      staticRobots,
		},
		{
			name:          "empty address falls back to static sitemap.xml",
			serverAddress: "",
			path:          "/sitemap.xml",
			staticFS:      os.DirFS(withFiles),
			wantStatus:    http.StatusOK,
			wantBody:      staticSitemap,
		},
		{
			name:          "default localhost address falls back to static robots.txt",
			serverAddress: "http://localhost:3000",
			path:          "/robots.txt",
			staticFS:      os.DirFS(withFiles),
			wantStatus:    http.StatusOK,
			wantBody:      staticRobots,
		},
		{
			name:          "default localhost address falls back to static sitemap.xml",
			serverAddress: "http://localhost:3000",
			path:          "/sitemap.xml",
			staticFS:      os.DirFS(withFiles),
			wantStatus:    http.StatusOK,
			wantBody:      staticSitemap,
		},
		{
			name:          "missing static asset returns 404",
			serverAddress: "",
			path:          "/robots.txt",
			staticFS:      os.DirFS(emptyDir),
			wantStatus:    http.StatusNotFound,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			system_setting.ServerAddress = tt.serverAddress
			var handler gin.HandlerFunc
			if tt.path == "/robots.txt" {
				handler = ServeRobotsTxt(tt.staticFS)
			} else {
				handler = ServeSitemap(tt.staticFS)
			}

			// 通过真实 gin 引擎执行，保证状态码与生产请求路径一致
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, tt.path, nil)
			engine := gin.New()
			engine.GET(tt.path, handler)
			engine.ServeHTTP(recorder, request)

			assert.Equal(t, tt.wantStatus, recorder.Code)
			if tt.wantBody != "" {
				assert.Equal(t, tt.wantBody, recorder.Body.String())
			}
			for _, s := range tt.wantContains {
				assert.Contains(t, recorder.Body.String(), s)
			}
			for _, s := range tt.wantNotContains {
				assert.NotContains(t, recorder.Body.String(), s)
			}
		})
	}
}
