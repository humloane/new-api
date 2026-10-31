package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

func Playground(c *gin.Context) {
	playground(c, types.RelayFormatOpenAI)
}

// PreparePlaygroundImage runs after UserAuth and before distribution. Channel
// path filters, request validation and upstream adapters all see the same v1
// path, while outer middleware retains the original browser request.
func PreparePlaygroundImage(c *gin.Context) {
	if _, ok := middleware.GetSessionAuthIdentity(c); !ok || c.GetBool("use_access_token") {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "a dashboard login session is required", "type": "access_denied"}})
		return
	}
	original := c.Request
	c.Request = original.Clone(original.Context())
	c.Request.URL.Path = "/v1" + strings.TrimPrefix(original.URL.Path, "/pg")
	c.Request.URL.RawPath = ""
	defer func() {
		// Relay validation may replace the parsed form on a retry. Clean the
		// final form too, before restoring the outer browser request.
		if c.Request.MultipartForm != nil {
			_ = c.Request.MultipartForm.RemoveAll()
		}
		c.Request = original
	}()

	var request struct {
		Group string `json:"group"`
	}
	var err error
	if c.ContentType() == gin.MIMEMultipartPOSTForm {
		form, formErr := common.ParseMultipartFormReusable(c)
		err = formErr
		if err == nil {
			defer form.RemoveAll()
			// These scalar fields affect routing or the charged quantity. Do
			// not validate one value and then forward conflicting duplicates.
			for _, name := range []string{"group", "model", "n", "parameters"} {
				if len(form.Value[name]) > 1 {
					err = fmt.Errorf("%s must be provided once", name)
					break
				}
			}
			if values := form.Value["group"]; len(values) == 1 {
				request.Group = values[0]
			}
		}
	} else if c.ContentType() == gin.MIMEJSON {
		err = common.UnmarshalBodyReusable(c, &request)
	} else {
		err = errors.New("image requests require application/json or multipart/form-data")
	}
	if err == nil {
		_, err = helper.GetAndValidateRequest(c, types.RelayFormatOpenAIImage)
		if c.Request.MultipartForm != nil {
			defer c.Request.MultipartForm.RemoveAll()
		}
	}
	if err != nil {
		status := http.StatusBadRequest
		if common.IsRequestBodyTooLargeError(err) {
			status = http.StatusRequestEntityTooLarge
		}
		c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"message": err.Error(), "type": "invalid_request_error"}})
		return
	}
	usingGroup := common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
	if request.Group != "" {
		if !service.GroupInUserUsableGroups(usingGroup, request.Group) && request.Group != usingGroup {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": gin.H{"message": i18n.T(c, i18n.MsgDistributorGroupAccessDenied), "type": "access_denied"}})
			return
		}
		usingGroup = request.Group
		common.SetContextKey(c, constant.ContextKeyUsingGroup, usingGroup)
	}
	// The request limiter must use the validated selection, while UserGroup
	// remains the authenticated account group for authorization.
	common.SetContextKey(c, constant.ContextKeyTokenGroup, usingGroup)
	// Only this authenticated server-side route can mark a canonical request
	// as playground; client headers/body never control account/token billing.
	c.Set("playground_image", true)
	c.Next()
}

func PlaygroundImage(c *gin.Context) {
	playground(c, types.RelayFormatOpenAIImage)
}

func playground(c *gin.Context, format types.RelayFormat) {
	var newAPIError *types.NewAPIError

	defer func() {
		if newAPIError != nil {
			c.JSON(newAPIError.StatusCode, gin.H{
				"error": newAPIError.ToOpenAIError(common.UpstreamAddresses(c)...),
			})
		}
	}()

	useAccessToken := c.GetBool("use_access_token")
	if useAccessToken {
		newAPIError = types.NewError(errors.New(i18n.T(c, i18n.MsgRelayAccessTokenUnsupported)), types.ErrorCodeAccessDenied, types.ErrOptionWithSkipRetry())
		return
	}

	relayInfo, err := relaycommon.GenRelayInfo(c, format, nil, nil)
	if err != nil {
		newAPIError = types.NewError(err, types.ErrorCodeInvalidRequest, types.ErrOptionWithSkipRetry())
		return
	}

	userId := c.GetInt("id")

	// Write user context to ensure acceptUnsetRatio is available
	userCache, err := model.GetUserCache(userId)
	if err != nil {
		newAPIError = types.NewError(err, types.ErrorCodeQueryDataError, types.ErrOptionWithSkipRetry())
		return
	}
	userCache.WriteContext(c)

	tempToken := &model.Token{
		UserId: userId,
		Name:   fmt.Sprintf("playground-%s", relayInfo.UsingGroup),
		Group:  relayInfo.UsingGroup,
	}
	_ = middleware.SetupContextForToken(c, tempToken)

	Relay(c, format)
}
