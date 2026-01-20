# Video Hosting Application - Complete Documentation

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Authentication System](#authentication-system)
- [Video Upload Workflow](#video-upload-workflow)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [Frontend Architecture](#frontend-architecture)
- [Security Features](#security-features)

---

## Overview

This is a full-stack video hosting application similar to YouTube, built with Django REST Framework (backend) and React (frontend). It allows users to register, login, upload videos to AWS S3, and manage their video content.

**Key Features:**
- User authentication with JWT tokens
- Direct video upload to AWS S3 using presigned URLs
- Video listing and playback
- User profiles with subscriber counts
- Protected routes and authorization

---

## Technology Stack

### Backend
- **Framework:** Django 6.0.1
- **API:** Django REST Framework 3.16.1
- **Authentication:** djangorestframework-simplejwt 5.5.1
- **Storage:** AWS S3 (boto3)
- **Database:** PostgreSQL (psycopg2-binary)
- **CORS:** django-cors-headers 4.9.0

### Frontend
- **Framework:** React 19.2.0
- **Build Tool:** Vite
- **Routing:** React Router 7.11.0
- **HTTP Client:** Axios 1.13.2

---

## Project Structure

```
video_hosting_app/
│
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   └── base.py          # Django settings & configuration
│   │   ├── urls.py               # Root URL routing
│   │   ├── wsgi.py               # WSGI application entry
│   │   └── asgi.py               # ASGI application entry
│   │
│   ├── apps/
│   │   ├── users/
│   │   │   ├── models.py         # Custom User model
│   │   │   ├── views.py          # Registration/Login views
│   │   │   ├── serializers.py    # User data serialization
│   │   │   └── urls.py           # Auth endpoints
│   │   │
│   │   └── videos/
│   │       ├── models.py         # Video model
│   │       ├── views.py          # Video CRUD operations
│   │       ├── serializers.py    # Video data serialization
│   │       └── urls.py           # Video endpoints
│   │
│   ├── manage.py                 # Django management script
│   └── requirements.txt          # Python dependencies
│
└── frontend/
    └── src/
        ├── App.jsx               # Main app & routing
        ├── components/
        │   ├── Register.jsx      # Registration form
        │   ├── Login.jsx         # Login form
        │   ├── Dashboard.jsx     # User dashboard
        │   ├── VideoUpload.jsx   # Video upload interface
        │   └── VideoList.jsx     # Video listing
        │
        └── services/
            ├── auth.js           # Authentication logic
            └── video.js          # Video API calls
```

---

## Authentication System

### User Model

The application uses a **custom User model** that extends Django's `AbstractUser`:

```python
# backend/apps/users/models.py
class User(AbstractUser):
    email = models.EmailField(unique=True)           # Used for login
    username = models.CharField(max_length=150)
    profile_picture = models.URLField(blank=True)
    bio = models.TextField(max_length=500, blank=True)
    subscriber_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"  # Login with email instead of username
    REQUIRED_FIELDS = ["username"]
```

### Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend (Register.jsx)
    participant Backend (UserViewSet)
    participant Database

    User->>Frontend (Register.jsx): Fill registration form
    Note over User: Email, Username, Password,<br/>First Name, Last Name

    Frontend (Register.jsx)->>Backend (UserViewSet): POST /api/auth/register/
    Note over Frontend (Register.jsx),Backend (UserViewSet): {email, username, password,<br/>first_name, last_name}

    Backend (UserViewSet)->>Backend (UserViewSet): Validate data (min 8 char password)
    Backend (UserViewSet)->>Database: Create new User
    Database-->>Backend (UserViewSet): User created

    Backend (UserViewSet)->>Backend (UserViewSet): Generate JWT tokens
    Note over Backend (UserViewSet): Access token (60 min)<br/>Refresh token (7 days)

    Backend (UserViewSet)-->>Frontend (Register.jsx): Return user data + tokens
    Frontend (Register.jsx)->>Frontend (Register.jsx): Store tokens in localStorage
    Frontend (Register.jsx)->>User: Redirect to Dashboard
```

### Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend (Login.jsx)
    participant Backend (TokenObtainPairView)
    participant Database

    User->>Frontend (Login.jsx): Enter email & password

    Frontend (Login.jsx)->>Backend (TokenObtainPairView): POST /api/auth/login/
    Note over Frontend (Login.jsx),Backend (TokenObtainPairView): {email, password}

    Backend (TokenObtainPairView)->>Database: Query User by email
    Database-->>Backend (TokenObtainPairView): User record

    Backend (TokenObtainPairView)->>Backend (TokenObtainPairView): Verify password
    Backend (TokenObtainPairView)->>Backend (TokenObtainPairView): Generate JWT tokens

    Backend (TokenObtainPairView)-->>Frontend (Login.jsx): Return access + refresh tokens
    Frontend (Login.jsx)->>Frontend (Login.jsx): Store in localStorage
    Frontend (Login.jsx)->>User: Redirect to Dashboard
```

### JWT Token Management

**Token Lifecycle:**
- **Access Token:** Valid for 60 minutes
- **Refresh Token:** Valid for 7 days

**Auto-Refresh Mechanism:**

```mermaid
sequenceDiagram
    participant Frontend
    participant Axios Interceptor
    participant Backend API
    participant Token Refresh Endpoint

    Frontend->>Backend API: API request with expired access token
    Backend API-->>Axios Interceptor: 401 Unauthorized

    Axios Interceptor->>Token Refresh Endpoint: POST /api/auth/token/refresh/
    Note over Axios Interceptor,Token Refresh Endpoint: {refresh: <refresh_token>}

    alt Refresh token valid
        Token Refresh Endpoint-->>Axios Interceptor: New access token
        Axios Interceptor->>Axios Interceptor: Update localStorage
        Axios Interceptor->>Backend API: Retry original request
        Backend API-->>Frontend: Success response
    else Refresh token expired/invalid
        Token Refresh Endpoint-->>Axios Interceptor: 401 Error
        Axios Interceptor->>Axios Interceptor: Clear localStorage
        Axios Interceptor->>Frontend: Redirect to login
    end
```

**Implementation in `frontend/src/services/auth.js`:**
```javascript
// Axios request interceptor adds Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Axios response interceptor handles 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshed = await authService.refreshToken();
      if (refreshed) {
        // Retry original request
        return apiClient(error.config);
      } else {
        // Redirect to login
        authService.logout();
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Video Upload Workflow

The video upload process uses a **three-step architecture** to efficiently handle large files:

### Step 1: Create Video Metadata & Get Presigned URL

```mermaid
sequenceDiagram
    participant User
    participant Frontend (VideoUpload.jsx)
    participant Backend (VideoViewSet)
    participant Database
    participant AWS S3

    User->>Frontend (VideoUpload.jsx): Select video file & fill form
    Note over User: Title, Description, Video File

    Frontend (VideoUpload.jsx)->>Frontend (VideoUpload.jsx): Validate file is video format
    Frontend (VideoUpload.jsx)->>Frontend (VideoUpload.jsx): Extract file size & extension

    Frontend (VideoUpload.jsx)->>Backend (VideoViewSet): POST /api/videos/
    Note over Frontend (VideoUpload.jsx),Backend (VideoViewSet): {title, description,<br/>file_size, file_extension}

    Backend (VideoViewSet)->>Backend (VideoViewSet): Verify JWT authentication
    Backend (VideoViewSet)->>Database: Create Video record (status: "processing")
    Database-->>Backend (VideoViewSet): Video ID (UUID)

    Backend (VideoViewSet)->>Backend (VideoViewSet): Generate S3 key
    Note over Backend (VideoViewSet): videos/{user_id}/{uuid}.{ext}

    Backend (VideoViewSet)->>AWS S3: Generate presigned PUT URL
    Note over Backend (VideoViewSet),AWS S3: Valid for 1 hour
    AWS S3-->>Backend (VideoViewSet): Presigned upload URL

    Backend (VideoViewSet)-->>Frontend (VideoUpload.jsx): Return response
    Note over Backend (VideoViewSet),Frontend (VideoUpload.jsx): {video_id, upload_url, s3_key}
```

### Step 2: Direct Upload to S3

```mermaid
sequenceDiagram
    participant Frontend (VideoUpload.jsx)
    participant AWS S3

    Frontend (VideoUpload.jsx)->>AWS S3: PUT video file to presigned URL
    Note over Frontend (VideoUpload.jsx),AWS S3: Direct client-to-S3 transfer<br/>No backend involvement

    loop Upload Progress
        AWS S3-->>Frontend (VideoUpload.jsx): Progress updates
        Frontend (VideoUpload.jsx)->>Frontend (VideoUpload.jsx): Update progress bar
    end

    AWS S3-->>Frontend (VideoUpload.jsx): Upload complete (200 OK)
```

### Step 3: Mark Upload Complete

```mermaid
sequenceDiagram
    participant Frontend (VideoUpload.jsx)
    participant Backend (VideoViewSet)
    participant Database

    Frontend (VideoUpload.jsx)->>Backend (VideoViewSet): POST /api/videos/{id}/upload_complete/

    Backend (VideoViewSet)->>Backend (VideoViewSet): Verify user owns video
    Note over Backend (VideoViewSet): Check video.user == request.user

    Backend (VideoViewSet)->>Database: Update video status to "ready"
    Database-->>Backend (VideoViewSet): Updated video record

    Backend (VideoViewSet)-->>Frontend (VideoUpload.jsx): Success response
    Frontend (VideoUpload.jsx)->>Frontend (VideoUpload.jsx): Show success message
    Frontend (VideoUpload.jsx)->>Frontend (VideoUpload.jsx): Navigate to dashboard
```

### Complete Upload Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIDEO UPLOAD FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────┐         ┌──────────┐         ┌─────────┐         ┌─────────┐
│  User   │         │ Frontend │         │ Backend │         │  AWS S3 │
└────┬────┘         └────┬─────┘         └────┬────┘         └────┬────┘
     │                   │                    │                    │
     │  1. Select video  │                    │                    │
     │──────────────────>│                    │                    │
     │                   │                    │                    │
     │  2. Fill form     │                    │                    │
     │  (title, desc)    │                    │                    │
     │──────────────────>│                    │                    │
     │                   │                    │                    │
     │                   │ 3. Create metadata │                    │
     │                   │    (POST /videos/) │                    │
     │                   │───────────────────>│                    │
     │                   │                    │                    │
     │                   │                    │ 4. Save to DB      │
     │                   │                    │    (status:        │
     │                   │                    │     processing)    │
     │                   │                    │                    │
     │                   │                    │ 5. Generate        │
     │                   │                    │    presigned URL   │
     │                   │                    │───────────────────>│
     │                   │                    │                    │
     │                   │ 6. Return:         │<───────────────────│
     │                   │    - video_id      │                    │
     │                   │    - upload_url    │                    │
     │                   │    - s3_key        │                    │
     │                   │<───────────────────│                    │
     │                   │                    │                    │
     │                   │ 7. PUT file to presigned URL            │
     │                   │────────────────────────────────────────>│
     │                   │                    │                    │
     │                   │ 8. Upload progress │                    │
     │                   │<────────────────────────────────────────│
     │  9. Show progress │                    │                    │
     │<──────────────────│                    │                    │
     │                   │                    │                    │
     │                   │ 10. Upload success │                    │
     │                   │<────────────────────────────────────────│
     │                   │                    │                    │
     │                   │ 11. Mark complete  │                    │
     │                   │    (POST upload_   │                    │
     │                   │     complete)      │                    │
     │                   │───────────────────>│                    │
     │                   │                    │                    │
     │                   │                    │ 12. Update status  │
     │                   │                    │     to "ready"     │
     │                   │                    │                    │
     │                   │ 13. Success        │                    │
     │                   │<───────────────────│                    │
     │                   │                    │                    │
     │  14. Show success │                    │                    │
     │<──────────────────│                    │                    │
     │                   │                    │                    │
```

### Why This Architecture?

**Benefits of Direct S3 Upload:**
1. **Reduced Backend Load:** Large video files don't pass through Django server
2. **Faster Uploads:** Direct client-to-S3 connection
3. **Scalability:** Backend doesn't need to handle file I/O
4. **Security:** Presigned URLs expire after 1 hour
5. **Progress Tracking:** Frontend can monitor upload progress directly

---

## Database Models

### User Model Schema

```
┌─────────────────────────────────────────────────────────┐
│                        User                              │
├──────────────────────┬──────────────────────────────────┤
│ Field                │ Type                             │
├──────────────────────┼──────────────────────────────────┤
│ id                   │ AutoField (Primary Key)          │
│ email                │ EmailField (unique, indexed)     │
│ username             │ CharField(150)                   │
│ password             │ CharField(128) [hashed]          │
│ first_name           │ CharField(150)                   │
│ last_name            │ CharField(150)                   │
│ profile_picture      │ URLField (blank)                 │
│ bio                  │ TextField (max 500, blank)       │
│ subscriber_count     │ IntegerField (default=0)         │
│ created_at           │ DateTimeField (auto_now_add)     │
│ is_active            │ BooleanField (default=True)      │
│ is_staff             │ BooleanField (default=False)     │
│ is_superuser         │ BooleanField (default=False)     │
└──────────────────────┴──────────────────────────────────┘

Constraints:
  - USERNAME_FIELD = "email" (login with email)
  - REQUIRED_FIELDS = ["username"]
  - email must be unique
```

### Video Model Schema

```
┌─────────────────────────────────────────────────────────┐
│                       Video                              │
├──────────────────────┬──────────────────────────────────┤
│ Field                │ Type                             │
├──────────────────────┼──────────────────────────────────┤
│ id                   │ UUIDField (Primary Key)          │
│ user                 │ ForeignKey(User, CASCADE)        │
│ title                │ CharField(255)                   │
│ description          │ TextField (blank)                │
│ s3_key               │ CharField(500)                   │
│ thumbnail_s3_key     │ CharField(500, blank)            │
│ duration             │ IntegerField (seconds, null)     │
│ file_size            │ BigIntegerField (bytes, null)    │
│ resolution           │ CharField(20, blank)             │
│ status               │ CharField(20)                    │
│                      │   Choices: processing/ready/     │
│                      │            failed                │
│ views_count          │ IntegerField (default=0)         │
│ likes_count          │ IntegerField (default=0)         │
│ created_at           │ DateTimeField (auto_now_add)     │
│ updated_at           │ DateTimeField (auto_now)         │
└──────────────────────┴──────────────────────────────────┘

Relationships:
  - user: CASCADE delete (deleting user deletes all videos)

Status Flow:
  "processing" → "ready" (normal flow)
  "processing" → "failed" (error handling)
```

### Entity Relationship Diagram

```
┌──────────────────────┐              ┌──────────────────────┐
│       User           │              │       Video          │
├──────────────────────┤              ├──────────────────────┤
│ id (PK)              │         ┌────│ id (PK)              │
│ email (unique)       │         │    │ user_id (FK)         │
│ username             │         │    │ title                │
│ password             │         │    │ description          │
│ first_name           │         │    │ s3_key               │
│ last_name            │         │    │ thumbnail_s3_key     │
│ profile_picture      │         │    │ duration             │
│ bio                  │         │    │ file_size            │
│ subscriber_count     │         │    │ resolution           │
│ created_at           │         │    │ status               │
│ is_active            │         │    │ views_count          │
│ is_staff             │         │    │ likes_count          │
│ is_superuser         │         │    │ created_at           │
└──────────────────────┘         │    │ updated_at           │
           │                     │    └──────────────────────┘
           │                     │
           │ 1                   │
           │                     │
           │         owns        │
           └─────────────────────┘
                     *
              (one user can have
               many videos)
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|---------------|--------------|----------|
| POST | `/api/auth/register/` | Register new user | No | `{email, username, password, first_name, last_name}` | `{user, access, refresh}` |
| POST | `/api/auth/login/` | Login & get tokens | No | `{email, password}` | `{access, refresh}` |
| POST | `/api/auth/token/refresh/` | Refresh access token | No | `{refresh}` | `{access}` |

**Example Registration Request:**
```json
POST /api/auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "secure123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Example Registration Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "profile_picture": "",
    "bio": "",
    "subscriber_count": 0,
    "created_at": "2026-01-20T10:30:00Z"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Video Endpoints

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|---------------|--------------|----------|
| GET | `/api/videos/` | List all videos | No | - | `[{video}, ...]` |
| POST | `/api/videos/` | Create video metadata | Yes | `{title, description, file_size, file_extension}` | `{video_id, upload_url, s3_key}` |
| GET | `/api/videos/{id}/` | Get video details | No | - | `{video}` |
| GET | `/api/videos/my_videos/` | Get current user's videos | Yes | - | `[{video}, ...]` |
| POST | `/api/videos/{id}/upload_complete/` | Mark upload complete | Yes | - | `{video}` |

**Example Video Creation Request:**
```json
POST /api/videos/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "title": "My First Video",
  "description": "This is a test video upload",
  "file_size": 52428800,
  "file_extension": "mp4"
}
```

**Example Video Creation Response:**
```json
{
  "video_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "upload_url": "https://my-bucket.s3.amazonaws.com/videos/1/a1b2c3d4.mp4?AWSAccessKeyId=...",
  "s3_key": "videos/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4"
}
```

**Example Upload Complete Request:**
```json
POST /api/videos/a1b2c3d4-e5f6-7890-abcd-ef1234567890/upload_complete/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Example Upload Complete Response:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user": 1,
  "title": "My First Video",
  "description": "This is a test video upload",
  "s3_key": "videos/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4",
  "status": "ready",
  "views_count": 0,
  "likes_count": 0,
  "created_at": "2026-01-20T11:00:00Z",
  "updated_at": "2026-01-20T11:05:00Z"
}
```

---

## Frontend Architecture

### Component Hierarchy

```
App.jsx
├── BrowserRouter
    ├── Routes
        ├── Route "/" → Login.jsx
        ├── Route "/register" → Register.jsx
        └── ProtectedRoute "/dashboard" → Dashboard.jsx
            ├── User Profile Display
            ├── VideoUpload.jsx
            └── VideoList.jsx
```

### Component Breakdown

#### 1. **App.jsx** - Main Application
```javascript
// Routing configuration
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
  </Routes>
</BrowserRouter>
```

**ProtectedRoute Component:**
- Checks for `accessToken` in localStorage
- If authenticated: renders child component
- If not authenticated: redirects to `/login`

#### 2. **Register.jsx** - User Registration
**Features:**
- Form with fields: email, username, password, first_name, last_name
- Client-side validation
- Calls `authService.register()`
- On success: stores tokens, redirects to dashboard
- Error handling with user feedback

#### 3. **Login.jsx** - User Authentication
**Features:**
- Form with fields: email, password
- Calls `authService.login()`
- On success: stores tokens, redirects to dashboard
- Error handling with user feedback
- Link to registration page

#### 4. **Dashboard.jsx** - User Dashboard
**Features:**
- Displays current user's profile information
- Shows subscriber count
- Includes VideoUpload component
- Includes VideoList component (user's videos)
- Logout functionality
- Placeholder sections for future features (subscriptions, comments, search, analytics)

#### 5. **VideoUpload.jsx** - Video Upload Interface
**Features:**
- File input (accepts video formats only)
- Form fields: title, description
- File size and extension extraction
- Three-step upload process:
  1. Create metadata → get presigned URL
  2. Upload to S3 with progress tracking
  3. Mark as complete
- Progress bar showing upload percentage
- Success/error message display

**Upload Process Code Flow:**
```javascript
1. User selects file
   └→ Extract file_size and file_extension

2. User submits form
   └→ POST /api/videos/ {title, description, file_size, file_extension}
      └→ Receive {video_id, upload_url, s3_key}

3. Upload to S3
   └→ PUT to upload_url
      └→ onUploadProgress: update progress bar

4. On S3 success
   └→ POST /api/videos/{video_id}/upload_complete/
      └→ Show success message
      └→ Redirect to dashboard or refresh video list
```

#### 6. **VideoList.jsx** - Video Display
**Features:**
- Fetches videos from `/api/videos/my_videos/`
- Displays video thumbnails, titles, descriptions
- Generates presigned GET URLs for video playback
- Video player with controls
- Shows video metadata (views, likes, created date)

### Service Layer

#### **auth.js** - Authentication Service
```javascript
authService = {
  register(userData)      // POST /api/auth/register/
  login(credentials)      // POST /api/auth/login/
  logout()                // Clear localStorage
  refreshToken()          // POST /api/auth/token/refresh/
  getCurrentUser()        // Returns user from localStorage
  isAuthenticated()       // Checks for valid access token
}
```

#### **video.js** - Video Service
```javascript
videoService = {
  createVideo(metadata)           // POST /api/videos/
  uploadToS3(url, file, onProgress) // PUT to presigned URL
  markComplete(videoId)           // POST /api/videos/{id}/upload_complete/
  getMyVideos()                   // GET /api/videos/my_videos/
  getVideoById(id)                // GET /api/videos/{id}/
  getAllVideos()                  // GET /api/videos/
  generatePlaybackUrl(s3_key)     // Generate presigned GET URL
}
```

### State Management

**Current Implementation:** Component-level state with `useState`

**Storage:**
- `localStorage`: Stores JWT tokens and user data
  - `accessToken`: JWT access token
  - `refreshToken`: JWT refresh token
  - `user`: Serialized user object

---

## Security Features

### 1. Authentication & Authorization

**JWT Token Security:**
- Access tokens expire after 60 minutes
- Refresh tokens expire after 7 days
- Tokens stored in localStorage (client-side)
- Bearer token authentication on every request
- Automatic token refresh on 401 errors

**Backend Authorization:**
```python
# Only authenticated users can upload videos
permission_classes = [IsAuthenticatedOrReadOnly]

# Users can only modify their own videos
def get_queryset(self):
    if self.action == 'my_videos':
        return Video.objects.filter(user=self.request.user)
    return Video.objects.all()
```

### 2. Password Security

**Requirements:**
- Minimum 8 characters (enforced in serializer)
- Passwords hashed using Django's default PBKDF2 algorithm
- Never returned in API responses

**Implementation:**
```python
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user  # Password auto-hashed by create_user()
```

### 3. AWS S3 Security

**Presigned URL Security:**
- URLs expire after 1 hour
- Generated server-side (AWS credentials never exposed to frontend)
- Separate URLs for upload (PUT) and download (GET)
- Scoped to specific S3 keys (users can't access arbitrary files)

**Implementation:**
```python
def generate_presigned_upload_url(s3_key):
    return s3_client.generate_presigned_url(
        'put_object',
        Params={'Bucket': bucket_name, 'Key': s3_key},
        ExpiresIn=3600  # 1 hour
    )
```

### 4. CORS Configuration

**Allowed Origins:**
- Development: `http://localhost:5173` (Vite dev server)
- Configured in `backend/config/settings/base.py`

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
```

### 5. Input Validation

**Backend Validation:**
- Django REST Framework serializers validate all input
- Required fields enforced
- Data type validation (email format, UUID format, etc.)
- Custom validators (password length, file size limits)

**Frontend Validation:**
- File type checking (videos only)
- Form field validation before submission
- Error message display for user feedback

### 6. User Isolation

**Video Access Control:**
- Each video has a `user` foreign key
- `my_videos` endpoint filters by `request.user`
- `upload_complete` verifies video ownership before updating

```python
@action(detail=True, methods=['post'])
def upload_complete(self, request, pk=None):
    video = self.get_object()
    if video.user != request.user:
        return Response(status=403)  # Forbidden
    # Mark as ready...
```

### 7. Protected Routes (Frontend)

**ProtectedRoute Component:**
```javascript
function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## Application Workflow Summary

### Complete User Journey

```
1. NEW USER REGISTRATION
   ┌──────────────────────────────────────────────────┐
   │ User → Register Form → Backend → Database        │
   │ ↓                                                 │
   │ Receive JWT Tokens → Store in localStorage       │
   │ ↓                                                 │
   │ Redirect to Dashboard                            │
   └──────────────────────────────────────────────────┘

2. RETURNING USER LOGIN
   ┌──────────────────────────────────────────────────┐
   │ User → Login Form → Backend Auth → Verify        │
   │ ↓                                                 │
   │ Receive JWT Tokens → Store in localStorage       │
   │ ↓                                                 │
   │ Redirect to Dashboard                            │
   └──────────────────────────────────────────────────┘

3. VIDEO UPLOAD
   ┌──────────────────────────────────────────────────┐
   │ Dashboard → VideoUpload Component                │
   │ ↓                                                 │
   │ Select File + Fill Form (title, description)     │
   │ ↓                                                 │
   │ POST /api/videos/ → Get presigned URL            │
   │ ↓                                                 │
   │ PUT file to S3 → Monitor progress                │
   │ ↓                                                 │
   │ POST upload_complete → Update status to "ready"  │
   │ ↓                                                 │
   │ Refresh VideoList → Show new video               │
   └──────────────────────────────────────────────────┘

4. VIDEO VIEWING
   ┌──────────────────────────────────────────────────┐
   │ Dashboard → VideoList Component                  │
   │ ↓                                                 │
   │ GET /api/videos/my_videos/ → Fetch user videos   │
   │ ↓                                                 │
   │ For each video: Generate presigned GET URL       │
   │ ↓                                                 │
   │ Display video player with S3 URL as source       │
   │ ↓                                                 │
   │ User watches video                               │
   └──────────────────────────────────────────────────┘

5. SESSION MANAGEMENT
   ┌──────────────────────────────────────────────────┐
   │ Every API request → Axios interceptor            │
   │ ↓                                                 │
   │ Add Bearer token to Authorization header         │
   │ ↓                                                 │
   │ If 401 response → Attempt token refresh          │
   │ ├─ Success → Retry original request              │
   │ └─ Failure → Logout & redirect to login          │
   └──────────────────────────────────────────────────┘
```

---

## Future Features (Placeholders in Dashboard)

The dashboard shows placeholders for upcoming features:

1. **Subscriptions Management**
   - Subscribe/unsubscribe to other users
   - View subscriber list
   - Subscription feed

2. **Comments System**
   - Add comments to videos
   - Reply to comments
   - Moderate comments

3. **Video Search**
   - Search videos by title, description
   - Filter by user, date, popularity
   - Search autocomplete

4. **Analytics**
   - View counts over time
   - Audience demographics
   - Traffic sources
   - Engagement metrics

---

## Development Setup

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables Required
```
# Backend (.env)
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost/dbname
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-s3-bucket-name
AWS_S3_REGION_NAME=your-region

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Key Takeaways

1. **Custom User Model:** Uses email for authentication instead of username
2. **JWT Authentication:** 60-minute access tokens with 7-day refresh tokens
3. **Direct S3 Upload:** Efficient video upload using presigned URLs
4. **Three-Step Upload:** Metadata creation → S3 upload → Mark complete
5. **Protected Routes:** Frontend authentication guards
6. **Auto Token Refresh:** Axios interceptors handle token lifecycle
7. **User Isolation:** Users can only access/modify their own videos
8. **Scalable Architecture:** Backend doesn't handle video file I/O

---

## File Locations Reference

**Backend:**
- Settings: `backend/config/settings/base.py`
- User Model: `backend/apps/users/models.py`
- User Views: `backend/apps/users/views.py`
- Video Model: `backend/apps/videos/models.py`
- Video Views: `backend/apps/videos/views.py`
- URL Config: `backend/config/urls.py`

**Frontend:**
- Main App: `frontend/src/App.jsx`
- Auth Service: `frontend/src/services/auth.js`
- Video Service: `frontend/src/services/video.js`
- Login: `frontend/src/components/Login.jsx`
- Register: `frontend/src/components/Register.jsx`
- Dashboard: `frontend/src/components/Dashboard.jsx`
- Upload: `frontend/src/components/VideoUpload.jsx`
- List: `frontend/src/components/VideoList.jsx`

---

*Documentation generated on 2026-01-20*
