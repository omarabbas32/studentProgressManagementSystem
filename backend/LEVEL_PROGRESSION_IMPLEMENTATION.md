# Level Progression System Implementation

## Overview
This document describes the automatic level progression system for students. The system automatically updates a student's `currentLevel` and `currentChapter` based on their problem-solving progress.

## Key Features

1. **Automatic Level Progression**: When a student solves all problems in their current level, they automatically move to the next level.

2. **Chapter Progression**: When a student completes the Diamond level, they automatically move to the next chapter and reset to Yellow level.

3. **Current Level Calculation**: `currentLevel` is automatically set to the **last (highest) level where all problems are solved**.

4. **Automatic Updates**: Progress is automatically checked and updated whenever:
   - A student is synced via `/api/Students/sync-student`
   - A problem is solved via `/api/Students/:id/solve/:problemId`

## Files Created/Modified

### New Files
- `backend/services/LevelProgressService.js` - Main service class with all progression logic

### Modified Files
- `backend/models/Student.js` - Added `currentChapter` and `currentLevel` fields
- `backend/routes/students.js` - Integrated `updateProgress()` into sync and solve endpoints

## Service Functions

### `LevelProgressService` Methods

#### `updateProgress(student)`
**Main function** - Automatically updates student progress. Should be called before saving a student.

**Logic:**
1. Sets `currentLevel` to the highest level where all problems are solved
2. If current level is fully completed (all problems solved, no remaining), moves to next level
3. If Diamond level is completed, moves to next chapter

**Usage:**
```javascript
const levelProgressService = require('../services/LevelProgressService');
levelProgressService.updateProgress(student);
```

#### `moveToNextLevel(student)`
Moves student to the next level in the sequence:
- Yellow → Green → Red → Black → Blue → Gold → Platinum → Diamond
- Adds current level to `completedLevels`
- Clears `solvedProblems` and `remainingProblems` for the completed level

#### `moveToNextChapter(student)`
Moves student to the next chapter and resets to Yellow level:
- Ch1 → Ch2 → Ch3 → Ch4 → ModernPhysics → Ch8 → Kirchhoff
- Adds Diamond level to `completedLevels`
- Resets `currentLevel` to "Yellow"

#### `isLevelCompleted(student, chapter, level)`
Checks if all problems in a specific level are solved.

#### `isChapterCompleted(student, chapter)`
Checks if all 8 levels in a chapter are completed.

#### `getHighestCompletedLevel(student, chapter)`
Returns the highest level where all problems are solved for a given chapter.
This is used to set `currentLevel` = "last level where all problems are solved".

#### `normalizeStudentData(student)`
Ensures all required fields exist and initializes defaults:
- `remainingProblems: []`
- `solvedProblems: []`
- `completedLevels: []`
- `currentChapter: "Ch1"`
- `currentLevel: "Yellow"`

## Data Structure

### Student Object
```javascript
{
  studentId: 1,
  name: "Student Name",
  number: "1234567890",
  parentNumber: "0987654321",
  group: "Group A",
  
  // Problem arrays
  remainingProblems: [1, 2, 3],      // Problem IDs not yet solved
  solvedProblems: [4, 5, 6],         // Problem IDs that are solved
  completedLevels: ["0-0", "0-1"],  // Format: "chapter-level"
  
  // Level progression (NEW)
  currentChapter: "Ch1",             // Current chapter enum string
  currentLevel: "Yellow"             // Current level enum string (last level where all problems solved)
}
```

### Enums
```javascript
Chapters: ["Ch1", "Ch2", "Ch3", "Ch4", "ModernPhysics", "Ch8", "Kirchhoff"]
Levels: ["Yellow", "Green", "Red", "Black", "Blue", "Gold", "Platinum", "Diamond"]
```

## Behavior Rules

### 1. When Student Solves All Problems in Current Level
- ✅ Move to next level automatically
- ✅ Add current level to `completedLevels`
- ✅ Clear `solvedProblems` and `remainingProblems` for that level only
- ✅ Update `currentLevel` to next level

### 2. When Student Completes Diamond Level
- ✅ Move to next chapter automatically
- ✅ Reset `currentLevel` to "Yellow"
- ✅ Add Diamond to `completedLevels`

### 3. When Student Receives New Problems
- ✅ Do NOT change `currentLevel` or `currentChapter`
- ✅ Only update `remainingProblems` array

### 4. Current Level Calculation
- ✅ `currentLevel` = **Last (highest) level where all problems are solved**
- ✅ Automatically updated whenever progress is checked

## Integration Points

### Sync Endpoint (`POST /api/Students/sync-student`)
```javascript
// Before saving
levelProgressService.updateProgress(mappedStudent);
dataService.saveStudents(students);
```

### Solve Endpoint (`PUT /api/Students/:id/solve/:problemId`)
```javascript
// After marking problem as solved
levelProgressService.updateProgress(student);
dataService.saveStudents(students);
```

## Example Flow

1. **Student starts at Ch1, Yellow level**
   - `currentChapter: "Ch1"`
   - `currentLevel: "Yellow"`
   - Has problems in `remainingProblems`

2. **Student solves all Yellow problems**
   - All problems moved to `solvedProblems`
   - `remainingProblems` empty for Yellow
   - System automatically:
     - Sets `currentLevel: "Green"` (highest completed)
     - Adds "0-0" to `completedLevels` (Ch1-Yellow)
     - Clears Yellow problems from arrays

3. **Student completes Diamond level**
   - System automatically:
     - Moves to next chapter: `currentChapter: "Ch2"`
     - Resets level: `currentLevel: "Yellow"`
     - Adds "0-7" to `completedLevels` (Ch1-Diamond)

## Notes

- The system is **automatic** - no manual triggers needed
- Progress is checked **every time** a student is saved
- `currentLevel` always reflects the **actual progress** (highest completed level)
- Problems are only cleared for the level that was completed, not all problems
- The system preserves existing `currentChapter`/`currentLevel` when syncing if not provided

