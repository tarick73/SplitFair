# Django Backend API Integration

## Overview
This document describes the integration of Django backend authentication endpoints into the SplitFair frontend application.

## Backend Endpoints Integrated

### 1. Registration
- **Endpoint**: `POST /register/`
- **Method**: Form-encoded data
- **Fields**:
  - `username` (string)
  - `email` (string)
  - `password1` (string)
  - `password2` (string)
  - `csrfmiddlewaretoken` (auto-added)

### 2. Login
- **Endpoint**: `POST /login/`
- **Method**: Form-encoded data
- **Fields**:
  - `username` (string)
  - `password` (string)
  - `csrfmiddlewaretoken` (auto-added)

### 3. Logout
- **Endpoint**: `POST /logout/`
- **Method**: Form-encoded data
- **Fields**:
  - `csrfmiddlewaretoken` (auto-added)

### 4. CSRF Token
- **Endpoint**: `GET /`
- **Method**: GET
- **Purpose**: Fetches CSRF token for subsequent requests

## Implementation Details

### Files Modified

1. **src/services/api.js**
   - Complete rewrite to support Django's CSRF token authentication
   - Changed from JWT Bearer tokens to session-based auth with CSRF protection
   - Added automatic CSRF token management
   - Changed content type from JSON to form-encoded data for auth endpoints
   - Added `withCredentials: true` for cookie support

2. **src/components/Auth.jsx**
   - Updated login to use `username` instead of `email`
   - Updated form validation to require username for both login and register
   - Email field now only shows during registration
   - Fixed form submission to pass username to login API

3. **src/App.jsx**
   - Added CSRF token initialization on app startup
   - Uses `authService.init()` to fetch CSRF token before any auth operations

4. **src/pages/Dashboard.jsx**
   - Updated logout handler to be async
   - Properly handles logout errors

## Key Features

### CSRF Token Management
- **Automatic fetching**: CSRF token is fetched on app initialization
- **Cookie-based**: Token is read from `csrftoken` cookie set by Django
- **Auto-injection**: Token is automatically added to all POST/PUT/PATCH/DELETE requests
- **Auto-refresh**: If a 403 error occurs, the token is automatically refreshed

### Session-Based Authentication
- Uses Django session cookies instead of JWT tokens
- `withCredentials: true` ensures cookies are sent with requests
- Session is maintained by the backend

### User Data Storage
- User data is stored in `localStorage` as JSON
- Retrieved via `authService.getCurrentUser()`
- Cleared on logout or 401 errors

## API Service Methods

### `authService.init()`
Initializes the CSRF token. Called automatically on app startup.

```javascript
await authService.init();
```

### `authService.login(username, password)`
Logs in a user with username and password.

```javascript
const data = await authService.login('testuser', 'password123');
// Returns: { user: {...}, ...other data from backend }
```

### `authService.register(username, email, password)`
Registers a new user.

```javascript
const data = await authService.register('newuser', 'user@example.com', 'password123');
// Returns: { user: {...}, ...other data from backend }
```

### `authService.logout()`
Logs out the current user.

```javascript
await authService.logout();
```

### `authService.getCurrentUser()`
Gets the current user from localStorage.

```javascript
const user = authService.getCurrentUser();
// Returns: { username: '...', email: '...', ...} or null
```

### `authService.isAuthenticated()`
Checks if a user is authenticated.

```javascript
const isLoggedIn = authService.isAuthenticated();
// Returns: boolean
```

## Configuration

### Backend URL
Currently set to `http://localhost:8000`. To change:

**src/services/api.js** (line 3):
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

For production, consider using environment variables:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

Then create a `.env` file:
```
VITE_API_BASE_URL=https://your-production-api.com
```

## Django Backend Requirements

Your Django backend must:

1. **Enable CORS** with credentials support:
   ```python
   # settings.py
   CORS_ALLOW_CREDENTIALS = True
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",  # Vite dev server
       "http://localhost:3000",  # Alternative port
   ]
   ```

2. **Set CSRF settings**:
   ```python
   # settings.py
   CSRF_COOKIE_SAMESITE = 'Lax'
   CSRF_COOKIE_HTTPONLY = False  # Must be False for JS to read it
   CSRF_TRUSTED_ORIGINS = [
       "http://localhost:5173",
       "http://localhost:3000",
   ]
   ```

3. **Enable session cookies**:
   ```python
   # settings.py
   SESSION_COOKIE_SAMESITE = 'Lax'
   SESSION_COOKIE_HTTPONLY = True
   ```

4. **Return user data** in login/register responses:
   ```python
   # views.py
   return JsonResponse({
       'success': True,
       'user': {
           'username': user.username,
           'email': user.email,
           'id': user.id
       }
   })
   ```

## Testing

To test the integration:

1. **Start your Django backend**:
   ```bash
   python manage.py runserver
   ```

2. **Start the frontend dev server**:
   ```bash
   npm run dev
   ```

3. **Test registration**:
   - Navigate to the app (usually `http://localhost:5173`)
   - Click "Register"
   - Fill in username, email, and password
   - Submit the form

4. **Test login**:
   - Use the registered username and password
   - Submit the login form
   - You should be redirected to the dashboard

5. **Test logout**:
   - Click the "Logout" button on the dashboard
   - You should be redirected back to the auth page

## Common Issues

### CSRF Token Missing
**Symptom**: 403 Forbidden errors
**Solution**: Ensure Django is setting the CSRF cookie and `CSRF_COOKIE_HTTPONLY = False`

### CORS Errors
**Symptom**: Browser console shows CORS errors
**Solution**: Check Django CORS settings and ensure `CORS_ALLOW_CREDENTIALS = True`

### Session Not Persisting
**Symptom**: User is logged out after refresh
**Solution**:
- Ensure `withCredentials: true` in axios config
- Check that Django is setting session cookies
- Verify `SESSION_COOKIE_SAMESITE` is not 'Strict'

### 401 Errors
**Symptom**: Unauthorized errors for authenticated requests
**Solution**:
- Check that Django is using session authentication
- Verify the session cookie is being sent with requests
- Ensure the session hasn't expired

## Future Enhancements

Consider adding:
1. **Protected Routes**: Route guard to prevent unauthenticated access
2. **Token Refresh**: Automatic session renewal
3. **Error Messages**: Better error handling and user feedback
4. **Loading States**: Better UX during API calls
5. **Environment Config**: Use `.env` files for API URL configuration