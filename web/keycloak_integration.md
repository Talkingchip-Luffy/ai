# Keycloak 认证集成方案

## 1. 现状分析

### 1.1 当前认证流程

- 前端通过 `/api/passport` 获取 JWT token
- 使用 app_code (如：wzkhlqFQTMRN8bmg) 标识应用
- 所有 API 请求都使用 JWT token 认证
- 主要 API：
  - `/api/site`：获取应用站点基本信息
  - `/api/parameters`：获取应用参数配置
  - `/api/meta`：获取应用元数据

### 1.2 存在的问题

- 缺少统一的身份认证
- 用户管理分散
- 安全性需要提升

### 1.3 后端集成尝试分析

#### 1.3.1 最初方案

- 尝试在后端 API 层面实现 Keycloak 认证
- 为 `/chat/` 路径添加认证拦截
- 通过路由重定向到 Keycloak 登录页

#### 1.3.2 遇到的问题

1. 路由冲突

   - 前端路由 `/chat/{code}` 是页面路由
   - 实际 API 请求都是 `/api/*` 格式
   - 后端拦截 `/chat/` 路径无法正确触发
2. 用户体验问题

   - 页面会先渲染再跳转
   - 造成界面闪烁
   - 用户体验不佳
3. 架构设计不合理

   - 前后端分离架构中，认证应该在前端入口处理
   - API 层应专注于资源访问控制
   - 违反了关注点分离原则

#### 1.3.3 调整决策

- 将认证逻辑迁移到前端
- 后端专注于 token 验证和授权
- 保持现有 API 的 JWT 认证体系
- 通过授权码流程集成 Keycloak

## 2. 集成方案

### 2.1 认证流程设计

```
前端                           Keycloak                        后端API
  |                               |                              |
  |--- 访问 /chat/{code} -------->|                              |
  |                               |                              |
  |<-- 重定向到Keycloak登录页 ----|                              |
  |                               |                              |
  |--- 用户登录 ----------------->|                              |
  |                               |                              |
  |<-- 返回授权码(auth code) -----|                              |
  |                               |                              |
  |---------------------- 携带授权码调用API ------------------>|
  |                               |                              |
  |                               |<-- 验证授权码 ------------->|
  |                               |                              |
  |<---------------------- 返回JWT token -------------------|
```

### 2.2 前端实现

```javascript
const AuthCheck = () => {
  useEffect(() => {
    // 1. 检查URL中是否有授权码
    const authCode = getAuthCodeFromUrl();
  
    if (!authCode) {
      // 2. 没有授权码，重定向到Keycloak
      redirectToKeycloak();
      return;
    }

    // 3. 有授权码，调用后端API验证
    validateAuthCode(authCode)
      .then(response => {
        // 4. 保存JWT token
        saveToken(response.token);
        // 5. 进入应用
        navigateToApp();
      })
      .catch(() => {
        // 6. 验证失败，重新认证
        redirectToKeycloak();
      });
  }, []);

  return <LoadingPage />;
};
```

### 2.3 后端实现

```python
class KeycloakAuthApi(Resource):
    def post(self):
        # 1. 获取授权码
        auth_code = request.json.get('auth_code')
      
        try:
            # 2. 验证授权码
            keycloak_token = keycloak_service.verify_auth_code(auth_code)
          
            # 3. 验证成功，创建或获取用户
            user = get_or_create_user(keycloak_token)
          
            # 4. 生成应用JWT token
            app_token = generate_app_token(user)
          
            return {
                'token': app_token,
                'user': user.to_dict()
            }
          
        except KeycloakAuthError:
            raise Unauthorized("Invalid authorization code")
```

## 3. 安全性考虑

### 3.1 授权码流程优势

- 使用授权码流程（Authorization Code Flow）
- 授权码是一次性的
- 授权码有效期短
- 比直接使用token更安全

### 3.2 后端验证保障

- 后端直接与Keycloak服务器验证授权码
- 避免伪造的授权码
- 确保认证过程的完整性

### 3.3 职责分离

- 认证过程在Keycloak完成
- 授权在后端完成
- 职责明确分离

## 4. 用户体验优化

### 4.1 认证流程优化

- 在前端路由层面处理认证
- 使用加载页面过渡
- 避免页面闪烁和不必要的跳转

### 4.2 Token管理

- 使用HttpOnly cookies存储token
- 设置适当的token过期时间
- 实现refresh token机制

### 4.3 会话超时处理

#### 4.3.1 前端实现

```javascript
// 会话超时检测
const SessionTimeoutCheck = () => {
  useEffect(() => {
    let sessionTimer;
  
    const checkSession = () => {
      const lastActivity = getLastActivityTime();
      const currentTime = new Date().getTime();
    
      // 如果超过1小时无活动，跳转到登录页
      if (currentTime - lastActivity > 60 * 60 * 1000) {
        redirectToLogin();
      }
    };
  
    // 每5分钟检查一次会话状态
    sessionTimer = setInterval(checkSession, 5 * 60 * 1000);
  
    // 用户活动时更新最后活动时间
    const updateActivity = () => {
      setLastActivityTime(new Date().getTime());
    };
  
    // 监听用户活动
    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('scroll', updateActivity);
  
    return () => {
      clearInterval(sessionTimer);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, []);
  
  return null;
};
```

#### 4.3.2 后端实现

```python
# Token配置
TOKEN_CONFIG = {
    'access_token_expire': 3600,  # 1小时
    'refresh_token_expire': 86400,  # 24小时
}

# Token生成时设置过期时间
def generate_token(user_data):
    access_token_expires = datetime.utcnow() + timedelta(seconds=TOKEN_CONFIG['access_token_expire'])
    refresh_token_expires = datetime.utcnow() + timedelta(seconds=TOKEN_CONFIG['refresh_token_expire'])
  
    access_token = create_token(
        data={"user": user_data, "exp": access_token_expires}
    )
    refresh_token = create_token(
        data={"user": user_data, "exp": refresh_token_expires}
    )
  
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
    }
```

#### 4.3.3 超时处理流程

1. 正常会话流程：

   - 用户登录成功后获取access_token和refresh_token
   - 前端定时检查会话状态
   - 用户有活动时自动更新最后活动时间
   - access_token过期前使用refresh_token自动刷新
2. 超时处理：

   - 如果用户超过1小时无活动，前端主动跳转到登录页
   - 如果access_token过期，尝试使用refresh_token获取新token
   - 如果refresh_token也过期，跳转到登录页
   - 后端API返回401时，前端清除token并跳转到登录页
3. 安全考虑：

   - token存储在HttpOnly cookie中防止XSS攻击
   - 使用refresh_token机制避免频繁登录
   - 后端严格校验token有效性
   - 支持手动注销立即使所有token失效

## 5. 后续工作

### 5.1 开发任务

- [ ] 实现前端认证检查组件
- [ ] 开发后端授权码验证API
- [ ] 集成Keycloak配置
- [ ] 实现token管理机制
- [ ] 实现会话超时检测和处理
- [ ] 实现refresh token机制

### 5.2 测试计划

- [ ] 单元测试覆盖
- [ ] 集成测试验证
- [ ] 安全性测试
- [ ] 用户体验测试

### 5.3 部署考虑

- [ ] Keycloak服务器配置
- [ ] 环境变量管理
- [ ] 监控告警配置
- [ ] 日志记录完善
