# Quick Start Guide - Video Hosting Application

## Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL
- FFmpeg (for thumbnail generation)
- AWS S3 bucket credentials

---

## Installation

### 1. Install FFmpeg (Required for Thumbnails)

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your settings
cat > .env << EOL
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost/video_hosting
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
EOL

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Access the Application

1. Open browser to `http://localhost:5173`
2. Register a new account
3. You'll be redirected to the home page
4. Start uploading videos!

---

## Generating Thumbnails

After uploading videos, generate thumbnails:

```bash
cd backend
python manage.py generate_thumbnails
```

**Options:**
- `--video-id <uuid>` - Generate for specific video
- `--force` - Regenerate all thumbnails

---

## Key URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **Admin Panel:** http://localhost:8000/admin

---

## Application Flow

1. **Register/Login** → `/register` or `/login`
2. **Home Page** → `/home` (see all videos)
3. **Upload Video** → Click "Upload" button in navbar
4. **Watch Video** → Click any video card
5. **View Channel** → Click avatar or username
6. **My Channel** → Click avatar dropdown → "My Channel"
7. **Search** → Use search bar in navbar
8. **Logout** → Click avatar dropdown → "Logout"

---

## Features Available

✅ User registration & authentication
✅ JWT token management with auto-refresh
✅ Video upload to AWS S3
✅ Automatic thumbnail generation (FFmpeg)
✅ Home page with all videos (paginated)
✅ Video search
✅ Video watch page with player
✅ Channel pages
✅ View tracking
✅ Video deletion
✅ Responsive design

---

## Default Users & Testing

No default users are created. Register accounts as needed.

**Test Video Sources:**
- https://sample-videos.com/
- https://test-videos.co.uk/

---

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Run migrations: `python manage.py migrate`

### Frontend won't start
- Delete `node_modules` and run `npm install` again
- Check Node version: `node --version` (should be 16+)

### Videos not uploading
- Check AWS credentials in .env
- Verify S3 bucket exists and permissions are correct
- Check browser console for errors

### Thumbnails not generating
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check video file is valid
- Look for error messages in terminal

### Authentication issues
- Clear browser localStorage
- Check token expiration settings in backend
- Verify API_BASE_URL in frontend

---

## Environment Variables

### Backend (.env)
```
SECRET_KEY=<django-secret-key>
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost/dbname
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_STORAGE_BUCKET_NAME=<bucket-name>
AWS_S3_REGION_NAME=<region>
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (optional .env)
```
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123","first_name":"Test","last_name":"User"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# List videos (requires token)
curl -X GET http://localhost:8000/api/videos/ \
  -H "Authorization: Bearer <your-access-token>"
```

---

## Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- **Frontend:** Vite automatically reloads on file changes
- **Backend:** Django runserver reloads on Python file changes

### Database Reset
```bash
cd backend
python manage.py flush
python manage.py migrate
```

### View Logs
- **Backend:** Check terminal running `runserver`
- **Frontend:** Check browser console (F12)

---

## Production Deployment

### Backend
1. Set `DEBUG=False`
2. Configure proper database (not SQLite)
3. Set up Celery for async tasks
4. Use gunicorn/uwsgi
5. Set up HTTPS
6. Configure S3 bucket CORS

### Frontend
1. Build: `npm run build`
2. Serve `dist` folder with nginx/Apache
3. Update API_BASE_URL to production
4. Enable HTTPS

---

## Support & Documentation

- **Full Documentation:** See `PROJECT_DOCUMENTATION.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Issue Tracker:** GitHub Issues
- **API Reference:** http://localhost:8000/api/docs (if configured)

---

## License

[Your License Here]

---

**Ready to go!** 🚀
