# Student Problems Management System - Node.js Backend

This is a Node.js/Express.js backend application refactored from a C# ASP.NET Core application. It provides a RESTful API for managing students, problems, attendance, and generating reports.

## Features

- **Student Management**: CRUD operations for students
- **Problem Management**: Assign and track problems for students
- **Attendance Tracking**: Record and monitor student attendance
- **Level Progression**: Track student progress through different levels
- **Excel Exports**: Generate Excel reports for absent students and empty problems
- **Warnings System**: Monitor student performance and attendance patterns

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:5000` by default.

## API Endpoints

### Students (`/api/students`)
- `GET /` - Get all students
- `GET /search-id?id={id}` - Get student by ID
- `GET /search-name?name={name}` - Search students by name
- `GET /current-week-count/:studentId` - Get current week attendance count
- `GET /attendance-percentage/:studentId` - Get attendance percentage
- `POST /` - Create a new student
- `PUT /:id` - Update student
- `DELETE /:id` - Delete student
- `POST /:studentId/add-problem` - Add problem to student
- `POST /problems/assign` - Assign problems to all students
- `DELETE /problems/:studentId/:chapter/:level` - Remove problems by chapter and level
- `PUT /problems/:studentId/:chapter/:level/complete` - Mark problems as completed
- `GET /problems/:studentId/:chapter/:level` - Get student problems by chapter and level
- `DELETE /remove-problem/:studentId/:chapterIndex/:levelIndex/:problemId` - Remove specific problem
- `POST /:studentId/attendance` - Record attendance
- `GET /:studentId/attendance` - Get student attendance history
- `GET /:studentId/attendance/percentage` - Get student attendance percentage
- `GET /check-levels/:studentId/:chapter` - Check level completion
- `POST /add-problem` - Add problem using DTO
- `GET /attendance` - Get all attendance history
- `GET /:studentId/streak` - Get attendance streak

### Problems (`/api/problem`)
- `POST /assign` - Assign problems to all students
- `DELETE /:studentId/:chapter/:level` - Remove problems by chapter and level
- `PUT /:studentId/:chapter/:level/complete` - Mark problems as completed
- `GET /:studentId/:chapter/:level` - Get student problems by chapter and level
- `GET /all/:chapter/:level` - Get all problems by chapter and level
- `DELETE /remove` - Remove problem from all students

### Attendance (`/api/attendance`)
- `GET /absent/current-week` - Get absent students for current week
- `POST /:studentId` - Record attendance
- `GET /:studentId` - Get student attendance

### Download (`/api/download`)
- `GET /empty-problems-excel/:chapter/:level` - Download Excel of students with empty problems
- `GET /absent/current-week` - Download Excel of absent students for current week
- `GET /absent/current-week/:day` - Download Excel of absent students for specific day

### Updating Level (`/api/updatinglevel`)
- `GET /current-level/:studentId/:chapterId` - Get current level
- `POST /save-level` - Save level
- `GET /student-progress/:studentId` - Get student progress

### Warning (`/api/warning`)
- `GET /student/:studentId` - Get student warnings

## Data Storage

The application uses JSON files for data storage:
- `Data/students.json` - Stores student data, problems, and attendance
- `Data/student_progress.json` - Stores student level progression

These files are created automatically if they don't exist.

## Environment Variables

You can set the following environment variables:
- `PORT` - Server port (default: 5000)

Example:
```bash
PORT=3000 npm start
```

## Project Structure

```
backend/
├── Data/                  # JSON data files
├── models/                # Data models
│   ├── Student.js
│   ├── Problem.js
│   ├── Attendance.js
│   └── Enums.js
├── routes/                 # Express routes
│   ├── students.js
│   ├── problems.js
│   ├── attendance.js
│   ├── download.js
│   ├── updatingLevel.js
│   └── warning.js
├── services/              # Business logic services
│   └── DataService.js
├── utils/                 # Utility functions
│   └── weekHelper.js
├── server.js              # Main application file
├── package.json
└── README.md
```

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **exceljs**: Excel file generation
- **nodemon**: Development auto-reload (dev dependency)

## Migration from C#

The original C# application used:
- ASP.NET Core Web API
- ClosedXML/EPPlus for Excel
- Newtonsoft.Json for JSON

This Node.js version provides:
- Express.js framework
- ExcelJS for Excel generation
- Native JSON support

All API endpoints maintain the same structure and response format for compatibility with existing frontend applications.

## License

ISC

