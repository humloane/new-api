package controller

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlaygroundImageRelay(t *testing.T) {
	// Initialize the model's dialect-specific column names through the existing
	// isolated relay fixture before installing the session/auth fixture.
	modelManagementDB(t, "sqlite", "")
	user, identity := setupSecurityEnrollmentTest(t)
	require.NoError(t, model.DB.AutoMigrate(&model.Channel{}, &model.Ability{}, &model.Token{}))
	require.NoError(t, model.LOG_DB.AutoMigrate(&model.Log{}))
	previousMemory, previousBatch, previousCount := common.MemoryCacheEnabled, common.BatchUpdateEnabled, constant.CountToken
	previousPrice := ratio_setting.ModelPrice2JSONString()
	previousGroups := setting.UserUsableGroups2JSONString()
	previousRatios := ratio_setting.GroupRatio2JSONString()
	previousRateLimitEnabled := setting.ModelRequestRateLimitEnabled
	setting.ModelRequestRateLimitEnabled = false
	common.MemoryCacheEnabled, common.BatchUpdateEnabled, constant.CountToken = false, false, false
	require.NoError(t, ratio_setting.UpdateModelPriceByJSONString(`{"playground-image-test":0.01}`))
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","vip":"VIP"}`))
	require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"default":1,"vip":2}`))
	t.Cleanup(func() {
		setting.ModelRequestRateLimitEnabled = previousRateLimitEnabled
		common.MemoryCacheEnabled, common.BatchUpdateEnabled, constant.CountToken = previousMemory, previousBatch, previousCount
		require.NoError(t, ratio_setting.UpdateModelPriceByJSONString(previousPrice))
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
		require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(previousRatios))
	})
	const startingQuota = 1000000
	require.NoError(t, model.DB.Model(user).Updates(map[string]any{"quota": startingQuota, "setting": `{"billing_preference":"wallet_only"}`}).Error)
	require.NoError(t, model.PublishUserAuthCache(user.Id))
	other := &model.User{Username: "other-image-user", AffCode: "other-image", Quota: startingQuota, Group: "default", Status: common.UserStatusEnabled, Role: common.RoleCommonUser}
	require.NoError(t, model.DB.Create(other).Error)
	accessToken, _, err := service.IssueAccessToken(identity)
	require.NoError(t, err)
	pat := "nap_playground-image-test"
	require.NoError(t, model.DB.Create(&model.UserAccessToken{UserId: user.Id, TokenHash: model.AccessTokenFingerprint(pat), Name: "image-test", Scopes: `["*"]`}).Error)
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		assert.Equal(t, "Bearer fake-upstream-key", r.Header.Get("Authorization"))
		if r.URL.Path == "/v1/images/edits" {
			require.NoError(t, r.ParseMultipartForm(1024))
			defer r.MultipartForm.RemoveAll()
			assert.Equal(t, "playground-image-test", r.FormValue("model"))
			assert.Equal(t, "2", r.FormValue("n"))
			file, _, fileErr := r.FormFile("image")
			require.NoError(t, fileErr)
			defer file.Close()
			data, readErr := io.ReadAll(file)
			require.NoError(t, readErr)
			assert.Equal(t, "test-image", string(data))
		} else {
			assert.Equal(t, "/v1/images/generations", r.URL.Path)
			var request dto.ImageRequest
			require.NoError(t, common.DecodeJson(r.Body, &request))
			assert.Equal(t, "playground-image-test", request.Model)
			assert.EqualValues(t, 2, *request.N)
		}
		w.Header().Set("Content-Type", "application/json")
		// One delivered image settles below the requested/reserved two.
		_, _ = io.WriteString(w, `{"created":1,"data":[{"b64_json":"aW1hZ2U="}]}`)
	}))
	defer upstream.Close()
	channel := &model.Channel{Type: constant.ChannelTypeOpenAI, Key: "fake-upstream-key", Name: "playground-image-test", Models: "playground-image-test", Group: "default,vip", Status: common.ChannelStatusEnabled, BaseURL: &upstream.URL}
	require.NoError(t, model.DB.Create(channel).Error)
	for _, group := range []string{"default", "vip"} {
		require.NoError(t, model.DB.Create(&model.Ability{Group: group, Model: "playground-image-test", ChannelId: channel.Id, Enabled: true}).Error)
	}
	service.InitHttpClient()
	router := gin.New()
	router.Use(middleware.BodyStorageCleanup())
	var restoredPath string
	router.Use(func(c *gin.Context) {
		c.Next()
		restoredPath = c.Request.URL.Path
	})
	for _, path := range []string{"/pg/images/generations", "/pg/images/edits"} {
		router.POST(path, middleware.UserAuth(), PreparePlaygroundImage, middleware.ModelRequestRateLimit(), middleware.Distribute(), PlaygroundImage)
	}
	request := func(path, contentType string, body io.Reader, auth string) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(http.MethodPost, path, body)
		r.Header.Set("Content-Type", contentType)
		if auth != "" {
			r.Header.Set("Authorization", "Bearer "+auth)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, r)
		assert.Equal(t, path, restoredPath, "canonical clone must be restored for outer middleware")
		return response
	}
	jsonBody := `{"model":"playground-image-test","prompt":"a flower","n":2,"group":"vip"}`
	t.Run("generation charges session owner and selected group", func(t *testing.T) {
		response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(jsonBody), accessToken)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		assert.Contains(t, response.Body.String(), `"b64_json":"aW1hZ2U="`)
		var account model.User
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-10000, account.Quota)
		var log model.Log
		require.NoError(t, model.LOG_DB.Where("user_id = ? AND type = ?", user.Id, model.LogTypeConsume).Last(&log).Error)
		assert.Equal(t, 10000, log.Quota)
		assert.Equal(t, "vip", log.Group)
		assert.Zero(t, log.TokenId)
	})
	t.Run("multipart edit preserves upload and settles wallet", func(t *testing.T) {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		for key, value := range map[string]string{"model": "playground-image-test", "prompt": "paint blue", "n": "2", "group": "default"} {
			require.NoError(t, writer.WriteField(key, value))
		}
		file, fileErr := writer.CreateFormFile("image", "test.png")
		require.NoError(t, fileErr)
		_, err := io.WriteString(file, "test-image")
		require.NoError(t, err)
		require.NoError(t, writer.Close())
		response := request("/pg/images/edits", writer.FormDataContentType(), &body, accessToken)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var account model.User
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-15000, account.Quota)
	})
	t.Run("failures cannot call upstream or charge account", func(t *testing.T) {
		for _, test := range []struct {
			name, auth, body string
			status           int
		}{
			{"anonymous", "", jsonBody, http.StatusUnauthorized},
			{"dashboard PAT", pat, jsonBody, http.StatusForbidden},
			{"forbidden group", accessToken, `{"model":"playground-image-test","group":"root-only"}`, http.StatusForbidden},
			{"oversized n", accessToken, fmt.Sprintf(`{"model":"playground-image-test","n":%d}`, dto.MaxImageN+1), http.StatusBadRequest},
			{"negative n", accessToken, `{"model":"playground-image-test","n":-1}`, http.StatusBadRequest},
			{"parameters count", accessToken, fmt.Sprintf(`{"model":"playground-image-test","parameters":{"n":%d}}`, dto.MaxImageN+1), http.StatusBadRequest},
		} {
			t.Run(test.name, func(t *testing.T) {
				response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(test.body), test.auth)
				assert.Equal(t, test.status, response.Code, response.Body.String())
			})
		}
		for _, n := range []string{strconv.Itoa(dto.MaxImageN + 1), "-1", "18446744073709551615"} {
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			require.NoError(t, writer.WriteField("model", "playground-image-test"))
			require.NoError(t, writer.WriteField("n", n))
			require.NoError(t, writer.Close())
			response := request("/pg/images/edits", writer.FormDataContentType(), &body, accessToken)
			assert.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
		}
		var duplicate bytes.Buffer
		writer := multipart.NewWriter(&duplicate)
		require.NoError(t, writer.WriteField("model", "playground-image-test"))
		require.NoError(t, writer.WriteField("n", "1"))
		require.NoError(t, writer.WriteField("n", strconv.Itoa(dto.MaxImageN+1)))
		require.NoError(t, writer.Close())
		response := request("/pg/images/edits", writer.FormDataContentType(), &duplicate, accessToken)
		assert.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
		var forbidden bytes.Buffer
		writer = multipart.NewWriter(&forbidden)
		require.NoError(t, writer.WriteField("model", "playground-image-test"))
		require.NoError(t, writer.WriteField("group", "root-only"))
		require.NoError(t, writer.Close())
		response = request("/pg/images/edits", writer.FormDataContentType(), &forbidden, accessToken)
		assert.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
		t.Run("bounded body storage", func(t *testing.T) {
			previousLimit := constant.MaxRequestBodyMB
			constant.MaxRequestBodyMB = 1
			defer func() { constant.MaxRequestBodyMB = previousLimit }()
			response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(strings.Repeat(" ", (1<<20)+1)), accessToken)
			assert.Equal(t, http.StatusRequestEntityTooLarge, response.Code, response.Body.String())
		})
		assert.EqualValues(t, 2, calls.Load())
		var account model.User
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-15000, account.Quota)
	})
	t.Run("image stream preserves completion events and billing", func(t *testing.T) {
		body := strings.Replace(jsonBody, `"n":2`, `"n":2,"stream":true`, 1)
		response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(body), accessToken)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		assert.Contains(t, response.Header().Get("Content-Type"), "text/event-stream")
		assert.Contains(t, response.Body.String(), "image_generation.completed")
		assert.Contains(t, response.Body.String(), "aW1hZ2U=")
		var account model.User
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-25000, account.Quota)
	})
	t.Run("selected group request limit rejects without upstream or charge", func(t *testing.T) {
		previousMinutes := setting.ModelRequestRateLimitDurationMinutes
		previousTotal, previousSuccess := setting.ModelRequestRateLimitCount, setting.ModelRequestRateLimitSuccessCount
		previousRedis, previousClient := common.RedisEnabled, common.RDB
		redisServer := miniredis.RunT(t)
		client := redis.NewClient(&redis.Options{Addr: redisServer.Addr()})
		common.RedisEnabled, common.RDB = true, client
		setting.ModelRequestRateLimitMutex.Lock()
		previousLimits := setting.ModelRequestRateLimitGroup
		setting.ModelRequestRateLimitGroup = map[string][2]int{"default": {0, 0}, "vip": {0, 1}}
		setting.ModelRequestRateLimitMutex.Unlock()
		setting.ModelRequestRateLimitEnabled = true
		setting.ModelRequestRateLimitDurationMinutes = 1
		setting.ModelRequestRateLimitCount, setting.ModelRequestRateLimitSuccessCount = 0, 0
		t.Cleanup(func() {
			common.RedisEnabled, common.RDB = previousRedis, previousClient
			require.NoError(t, client.Close())
			setting.ModelRequestRateLimitEnabled = false
			setting.ModelRequestRateLimitDurationMinutes = previousMinutes
			setting.ModelRequestRateLimitCount, setting.ModelRequestRateLimitSuccessCount = previousTotal, previousSuccess
			setting.ModelRequestRateLimitMutex.Lock()
			setting.ModelRequestRateLimitGroup = previousLimits
			setting.ModelRequestRateLimitMutex.Unlock()
		})
		response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(jsonBody), accessToken)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		assert.EqualValues(t, 4, calls.Load())
		var account model.User
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-35000, account.Quota)
		var consumeLogs int64
		require.NoError(t, model.LOG_DB.Model(&model.Log{}).Where("user_id = ? AND type = ?", user.Id, model.LogTypeConsume).Count(&consumeLogs).Error)
		for _, path := range []string{"/pg/images/generations", "/pg/images/edits"} {
			response = request(path, gin.MIMEJSON, strings.NewReader(jsonBody), accessToken)
			assert.Equal(t, http.StatusTooManyRequests, response.Code, response.Body.String())
		}
		assert.EqualValues(t, 4, calls.Load(), "rate-limited requests must not reach upstream")
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-35000, account.Quota)
		var logsAfterRejection int64
		require.NoError(t, model.LOG_DB.Model(&model.Log{}).Where("user_id = ? AND type = ?", user.Id, model.LogTypeConsume).Count(&logsAfterRejection).Error)
		assert.Equal(t, consumeLogs, logsAfterRejection)
		// The account's default group has an independent unlimited quota.
		body := strings.Replace(jsonBody, `"group":"vip"`, `"group":"default"`, 1)
		response = request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(body), accessToken)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		assert.EqualValues(t, 5, calls.Load())
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, startingQuota-40000, account.Quota)
	})
	t.Run("insufficient wallet cannot call upstream", func(t *testing.T) {
		require.NoError(t, model.DB.Model(user).Update("quota", 1).Error)
		require.NoError(t, model.PublishUserAuthCache(user.Id))
		response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(jsonBody), accessToken)
		assert.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
		assert.EqualValues(t, 5, calls.Load())
		var account model.User
		require.NoError(t, model.DB.First(&account, user.Id).Error)
		assert.Equal(t, 1, account.Quota)
	})
	t.Run("revoked session cannot relay", func(t *testing.T) {
		_, err := model.RevokeUserSession(user.Id, identity.SessionID, "image-test")
		require.NoError(t, err)
		response := request("/pg/images/generations", gin.MIMEJSON, strings.NewReader(jsonBody), accessToken)
		assert.Equal(t, http.StatusUnauthorized, response.Code, response.Body.String())
		assert.EqualValues(t, 5, calls.Load())
	})
	var tokenCount int64
	require.NoError(t, model.DB.Model(&model.Token{}).Count(&tokenCount).Error)
	assert.Zero(t, tokenCount, "playground never creates a user key")
	var otherAccount model.User
	require.NoError(t, model.DB.First(&otherAccount, other.Id).Error)
	assert.Equal(t, startingQuota, otherAccount.Quota)
}
