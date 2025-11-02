# Frontend-Backend Integration Guide

## Changes Made

### Backend Routes
- Updated routes to use **PascalCase** to match C# frontend expectations:
  - `/api/Students` (instead of `/api/students`)
  - `/api/Problem` (instead of `/api/problem`)
  - `/api/Attendance` (instead of `/api/attendance`)
  - `/api/Download` (instead of `/api/download`)
  - `/api/UpdatingLevel` (instead of `/api/updatinglevel`)
  - `/api/Warning` (instead of `/api/warning`)

### Frontend URLs Updated
All frontend files now point to: `http://localhost:5000`

Files updated:
- `index.html` - Changed from `https://localhost:5232/api` to `http://localhost:5000/api`
- `profile.html` - Changed from `https://localhost:7163/api` to `http://localhost:5000` (fixed double `/api` issue)
- `problem.html` - Changed from `https://localhost:7163` and `http://localhost:5232` to `http://localhost:5000`
- `questions.html` - Changed from `http://localhost:5232` to `http://localhost:5000`
- `std_questions.html` - Changed from `http://localhost:5232` to `http://localhost:5000`
- `level.html` - Changed from `http://localhost:5232` to `http://localhost:5000`
- `download.html` - Changed from `https://localhost:5232` to `http://localhost:5000`

### New Endpoint Added
- `/api/UpdatingLevel/update-question-count` - Added as a stub endpoint (called by frontend but doesn't need to do anything specific)

## How to Run

1. **Start the Backend:**
   ```bash
   cd backend
   npm install  # First time only
   npm start    # Or npm run dev for development
   ```

2. **Open Frontend:**
   - Simply open `frontend-problems_system - v2/index.html` in your browser
   - Or serve it using a local server (recommended):
     ```bash
     # Using Python
     cd "frontend-problems_system - v2"
     python -m http.server 8000
     
     # Then open: http://localhost:8000/index.html
     ```

## API Compatibility

The Node.js backend maintains full compatibility with the original C# API:
- All endpoints match the C# routes
- Request/response formats are identical
- Property names are automatically converted between PascalCase and camelCase
- Excel exports work the same way

## Testing

1. Backend should start on `http://localhost:5000`
2. Frontend should connect to `http://localhost:5000/api`
3. Test endpoints:
   - Search for students
   - View student profiles
   - Add problems
   - Record attendance
   - Download Excel files

## Troubleshooting

- **CORS errors**: Backend already has CORS enabled for all origins
- **Port conflicts**: Change `PORT` environment variable or update frontend URLs
- **Data not loading**: Ensure `backend/Data/students.json` exists or create it
- **Excel downloads not working**: Check browser console for errors

