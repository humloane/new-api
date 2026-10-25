package controller

import (
	"io/fs"
	"net"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

// seoSitemapPaths 是收录进 sitemap 的公开页面。
// 必须与 web/src/lib/site-seo.ts 的 SITE_PATHS 保持一致（Go 二进制会基于
// 后台"服务器地址"动态生成同一份 sitemap）。
// 尾斜杠必须与静态文件服务的规范形式一致：/about/、/rankings/、/pricing/
// 会 301 到无斜杠形式，收录必须使用 200 的最终 URL。
var seoSitemapPaths = []string{
	"/",
	"/about",
	"/privacy-policy",
	"/user-agreement",
	"/pricing",
	"/tutorial",
}

// seoDisallowedPaths 是禁止收录的内部页面与接口路径。
// 必须与 web/src/lib/site-seo.ts 的 DISALLOWED_PATHS 保持一致。
var seoDisallowedPaths = []string{
	"/api/",
	"/v1/",
	"/v1beta/",
	"/dashboard",
	"/keys",
	"/system-settings",
	"/_authenticated/",
	"/sign-in",
	"/sign-up",
	"/forgot-password",
	"/reset",
	"/otp",
	"/oauth/",
	"/setup",
}

// BuildRobotsTxt 生成 robots.txt。origin 为空时省略 Sitemap 行，
// 避免声明未配置域名的归属。
func BuildRobotsTxt(origin string) string {
	var b strings.Builder
	b.WriteString("User-agent: *\n")
	b.WriteString("Allow: /\n")
	for _, p := range seoDisallowedPaths {
		b.WriteString("Disallow: " + p + "\n")
	}
	if origin != "" {
		b.WriteString("Sitemap: " + origin + "/sitemap.xml\n")
	}
	return b.String()
}

// BuildSitemapXML 生成 sitemap.xml。lastMod 为空时省略 lastmod 字段。
func BuildSitemapXML(origin string, lastMod string) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	b.WriteString("\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">")
	for _, p := range seoSitemapPaths {
		b.WriteString("\n  <url><loc>" + origin + p + "</loc>")
		if lastMod != "" {
			b.WriteString("\n    <lastmod>" + lastMod + "</lastmod>")
		}
		b.WriteString("</url>\n")
	}
	b.WriteString("</urlset>\n")
	return b.String()
}

// parseSEOOrigin 把后台"服务器地址"规范化为纯站点源（scheme://host）。
// 该值是公开 SEO 资产（robots.txt / sitemap.xml）的域名来源，校验规则与
// web/src/lib/site-seo.ts 的 parseSiteOrigin 对齐：
//   - 仅 HTTPS（公开站点不允许 http origin）；
//   - 无凭据、无路径（允许末尾斜杠）、无查询、无片段；
//   - 主机不能是回环/本地地址（localhost、*.localhost、127.0.0.0/8、::1、
//     未指定地址、链路本地地址）或 mDNS 名（.local）。这样数据库未配置时
//     包默认值 http://localhost:3000 不会泄漏进公开 robots/sitemap。
//
// 私有网段 IP 不做一刀切拒绝：内网部署显式配置视为运维决策。
// 校验不通过时返回空串，由 serveSeoAsset 回退到构建期静态资产。
func parseSEOOrigin(serverAddress string) string {
	u, err := url.Parse(strings.TrimSpace(serverAddress))
	if err != nil {
		return ""
	}
	if u.Scheme != "https" {
		return ""
	}
	if u.User != nil || u.Host == "" ||
		(u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" {
		return ""
	}
	host := strings.ToLower(u.Hostname())
	if host == "" {
		return ""
	}
	if ip := net.ParseIP(host); ip != nil {
		if ip.IsLoopback() || ip.IsUnspecified() ||
			ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() {
			return ""
		}
	} else if host == "localhost" ||
		strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

// currentSEOOrigin 读取后台"服务器地址"，使其成为 SEO 域名（robots/sitemap）
// 的单一事实源；未配置、仍是默认值（http://localhost:3000）或格式非法时
// 返回空串。
//
// 域名双源约定（最小风险方案，不做架构重构）：前端 canonical / og / JSON-LD
// 使用构建期 web/site.config.json 的 publicSiteUrl；本函数控制 robots.txt /
// sitemap.xml。生产部署两个域名必须保持一致：后台改域名只影响 robots /
// sitemap，canonical 等页面 meta 需要重新构建前端才能更新。
func currentSEOOrigin() string {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	return parseSEOOrigin(system_setting.ServerAddress)
}

// serveSeoAsset 优先使用后台服务器地址动态生成 SEO 资源；未配置时回退到
// 构建期内嵌的静态文件（web/dist），保证两种部署方式下资源始终可用。
func serveSeoAsset(c *gin.Context, staticFS fs.FS, staticName, contentType string, build func(origin string) string) {
	origin := currentSEOOrigin()
	if origin != "" {
		c.Data(http.StatusOK, contentType, []byte(build(origin)))
		return
	}
	data, err := fs.ReadFile(staticFS, staticName)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	c.Data(http.StatusOK, contentType, data)
}

// ServeRobotsTxt 提供 /robots.txt。
func ServeRobotsTxt(staticFS fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		serveSeoAsset(c, staticFS, "robots.txt", "text/plain; charset=utf-8", BuildRobotsTxt)
	}
}

// ServeSitemap 提供 /sitemap.xml。项目没有可靠的页面内容更新时间数据源，
// 因此省略 lastmod（与构建期静态 sitemap 语义一致），不使用当前时间伪造。
func ServeSitemap(staticFS fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		serveSeoAsset(c, staticFS, "sitemap.xml", "application/xml; charset=utf-8",
			func(origin string) string {
				return BuildSitemapXML(origin, "")
			},
		)
	}
}
