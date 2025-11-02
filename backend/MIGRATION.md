# Migration Guide from C# to Node.js

This document explains the key differences and migration notes when moving from the C# ASP.NET Core application to this Node.js/Express.js version.

## Key Changes

### Property Naming
- **C# uses PascalCase**: `StudentId`, `Name`, `AssignedProblems`, etc.
- **Node.js uses camelCase**: `studentId`, `name`, `assignedProblems`, etc.

The `DataService` automatically converts PascalCase JSON data to camelCase when loading, ensuring compatibility with existing data files.

### Data Files
If you have existing data files from the C# application:
1. Copy `ProblemsDorra/Data/students.json` to `backend/Data/students.json`
2. Copy `ProblemsDorra/bin/Debug/net8.0/Data/student_progress.json` to `backend/Data/student_progress.json` (if it exists)

The Node.js application will automatically convert the property names on first load.

### API Endpoints
All API endpoints remain the same. The Node.js version maintains full compatibility with the original C# API structure:
- `/api/students` - Student management
- `/api/problem` - Problem management  
- `/api/attendance` - Attendance tracking
- `/api/download` - Excel exports
- `/api/updatinglevel` - Level progression
- `/api/warning` - Warning system

### Port Configuration
- **C#**: Typically runs on port 5000 or 5001 (configured in `launchSettings.json`)
- **Node.js**: Defaults to port 5000, configurable via `PORT` environment variable

### Excel Generation
- **C#**: Uses ClosedXML library
- **Node.js**: Uses ExcelJS library
- Same output format and functionality

## Running Both Versions
You can run both the C# and Node.js versions simultaneously on different ports:
- C# version: `http://localhost:5000` or `http://localhost:5001`
- Node.js version: `http://localhost:5000` (or set `PORT=3000` for example)

## Testing
After migration, test all endpoints to ensure:
1. Data loads correctly (property names are converted)
2. All CRUD operations work
3. Excel exports generate correctly
4. Attendance tracking functions properly
5. Level progression saves/loads correctly

