package middleware

import (
	"github.com/gin-gonic/gin"
)

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		// robots.txt / sitemap.xml 由后台"服务器地址"动态生成，改域名后
		// 内容立即变化，必须走重新验证而不是长期缓存。
		switch c.Request.RequestURI {
		case "/", "/robots.txt", "/sitemap.xml":
			c.Header("Cache-Control", "no-cache")
		default:
			c.Header("Cache-Control", "max-age=604800") // one week
		}
		c.Header("Cache-Version", "b688f2fb5be447c25e5aa3bd063087a83db32a288bf6a4f35f2d8db310e40b14")
		c.Next()
	}
}
