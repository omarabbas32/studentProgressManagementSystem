# New Problem-Solving System Explanation

## How the System Works Now

### Initial Setup

**Option 1: Start with Problems First (Recommended)**
1. Add problems using `POST /api/problems` - these are stored centrally in `Data/problems.json`
2. When you add a problem, it automatically:
   - Saves to the problems file
   - Adds the problem ID to ALL students' `remainingProblems` array
   - Removes the level from `completedLevels` if it was previously completed (because a new problem was added)

**Option 2: Start with a Student First**
1. Add a student using `POST /api/Students`
2. The system automatically:
   - Loads all existing problems
   - Adds all problem IDs to the new student's `remainingProblems` array
   - Initializes `solvedProblems` as empty `[]`
   - Initializes `completedLevels` as empty `[]`

### Problem Solving Flow

1. **View Student's Problems**: `GET /api/Students/:id/problems`
   - Returns all problems with status (isSolved, isRemaining, isLevelCompleted)
   
2. **Mark Problem as Solved**: `PUT /api/Students/:id/solve/:problemId`
   - Removes problem ID from `remainingProblems`
   - Adds problem ID to `solvedProblems`
   - Checks if all problems in that level are solved
   - If yes, adds level to `completedLevels` (format: "chapter-level", e.g., "0-1")

3. **Remove Problem from Student**: `DELETE /api/Students/:id/problem/:problemId`
   - Removes from `remainingProblems` or `solvedProblems`
   - If removed from `solvedProblems`, re-checks level completion status

### Data Structure

**Problems File (`Data/problems.json`):**
```json
[
  {
    "id": 1,
    "book": "الكتاب",
    "page": 10,
    "numberOfProblem": 5,
    "level": 0,
    "chapter": 1,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

**Student Structure:**
```json
{
  "studentId": 1,
  "name": "أحمد",
  "remainingProblems": [1, 2, 3],  // Array of problem IDs
  "solvedProblems": [4, 5],        // Array of problem IDs
  "completedLevels": ["1-0", "2-1"] // Array of "chapter-level" strings
}
```

### Key Features

- **Centralized Problems**: All problems stored in one file, referenced by ID
- **Automatic Assignment**: New problems automatically assigned to all students
- **Level Completion**: Automatically tracks when all problems in a level are solved
- **Backward Compatible**: Old `assignedProblems` structure still works

### API Endpoints

**Problems:**
- `POST /api/problems` - Add new problem (updates all students)
- `GET /api/problems` - Get all problems
- `GET /api/problems/:id` - Get specific problem

**Students:**
- `POST /api/Students` - Create student (auto-assigns all problems)
- `GET /api/Students/:id/problems` - Get student's problems with status
- `PUT /api/Students/:id/solve/:problemId` - Mark problem as solved
- `DELETE /api/Students/:id/problem/:problemId` - Remove problem from student

