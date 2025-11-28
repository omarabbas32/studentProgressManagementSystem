const dataService = require('./DataService');
const { ChapterEnum, LevelEnum } = require('../models/Enums');

/**
 * Level Progress Service
 * Handles automatic level and chapter progression for students
 */
class LevelProgressService {
    constructor() {
        this.Chapters = ["Ch1", "Ch2", "Ch3", "Ch4", "ModernPhysics", "Ch8", "Kirchhoff"];
        this.Levels = ["Yellow", "Green", "Red", "Black", "Blue", "Gold", "Platinum", "Diamond"];
    }

    /**
     * Normalize student data - ensure all required fields exist
     * @param {Object} student - Student object
     * @returns {Object} Normalized student
     */
    normalizeStudentData(student) {
        if (!student) {
            throw new Error('Student cannot be null or undefined');
        }

        // Initialize arrays if they don't exist
        student.remainingProblems = student.remainingProblems || [];
        student.solvedProblems = student.solvedProblems || [];
        student.completedLevels = student.completedLevels || [];

        // Initialize chapterLevels if it doesn't exist (SOURCE OF TRUTH)
        if (!student.chapterLevels) {
            student.chapterLevels = {};
        }

        // Ensure every chapter has a level in chapterLevels
        this.Chapters.forEach(chapter => {
            if (!student.chapterLevels[chapter]) {
                student.chapterLevels[chapter] = this.Levels[0]; // Default to Yellow
            }
        });

        return student;
    }

    /**
     * Check if a level is completed for a student
     * A level is completed when all problems in that level are solved
     * @param {Object} student - Student object
     * @param {string} chapter - Chapter enum string (e.g., "Ch1")
     * @param {string} level - Level enum string (e.g., "Yellow")
     * @returns {boolean} True if level is completed
     */
    isLevelCompleted(student, chapter, level) {
        const problems = dataService.loadProblems();
        const chapterIndex = this.Chapters.indexOf(chapter);
        const levelIndex = this.Levels.indexOf(level);

        if (chapterIndex === -1 || levelIndex === -1) {
            return false;
        }

        // Get all problems for this chapter and level
        const problemsInLevel = problems.filter(p =>
            parseInt(p.chapter) === chapterIndex && parseInt(p.level) === levelIndex
        );

        if (problemsInLevel.length === 0) {
            return false; // No problems in this level, cannot be completed
        }

        // Check if all problems in this level are solved
        const allSolved = problemsInLevel.every(problem => {
            const problemId = problem.id || problem.problemId;
            return student.solvedProblems && student.solvedProblems.includes(problemId);
        });

        return allSolved;
    }

    /**
     * Check if a chapter is completed (all 8 levels completed)
     * @param {Object} student - Student object
     * @param {string} chapter - Chapter enum string
     * @returns {boolean} True if chapter is completed
     */
    isChapterCompleted(student, chapter) {
        return this.Levels.every(level => this.isLevelCompleted(student, chapter, level));
    }

    /**
     * Calculate the highest completed level for a given chapter
     * Returns the last level where all problems are solved
     * @param {Object} student - Student object
     * @param {string} chapter - Chapter enum string
     * @returns {string|null} Level name or null if no level is completed
     */
    getHighestCompletedLevel(student, chapter) {
        let highestLevel = null;

        // Check levels from highest to lowest (Diamond to Yellow)
        for (let i = this.Levels.length - 1; i >= 0; i--) {
            const level = this.Levels[i];
            if (this.isLevelCompleted(student, chapter, level)) {
                highestLevel = level;
                break;
            }
        }

        return highestLevel;
    }

    /**
     * Move student to the next level for a specific chapter
     * @param {Object} student - Student object
     * @param {string} chapter - Chapter to move level for
     * @returns {boolean} True if moved to next level
     */
    moveToNextLevel(student, chapter) {
        const currentLevelName = student.chapterLevels[chapter] || this.Levels[0];
        const currentLevelIndex = this.Levels.indexOf(currentLevelName);

        if (currentLevelIndex === -1) {
            console.warn(`Invalid current level for chapter ${chapter}: ${currentLevelName}, resetting to Yellow`);
            student.chapterLevels[chapter] = this.Levels[0];
            return false;
        }

        // If already at the last level (Diamond), cannot move to next level
        if (currentLevelIndex >= this.Levels.length - 1) {
            return false;
        }

        const nextLevelIndex = currentLevelIndex + 1;
        const nextLevel = this.Levels[nextLevelIndex];
        const chapterIndex = this.Chapters.indexOf(chapter);

        // Add current level to completedLevels if not already there
        const levelKey = `${chapterIndex}-${currentLevelIndex}`;
        if (!student.completedLevels.includes(levelKey)) {
            student.completedLevels.push(levelKey);
        }

        // Clear solvedProblems and remainingProblems for the OLD level (before moving)
        // This prevents the old level from being considered again
        this._clearProblemsForLevel(student, chapterIndex, currentLevelIndex);

        // Move to next level
        student.chapterLevels[chapter] = nextLevel;

        console.log(`Student ${student.studentId} moved from ${currentLevelName} to ${nextLevel} in ${chapter}`);
        return true;
    }

    /**
     * Move student to the next chapter
     * Resets level to Yellow
     * @param {Object} student - Student object
     * @returns {boolean} True if moved to next chapter
     */
    moveToNextChapter(student) {
        const currentChapterIndex = this.Chapters.indexOf(student.currentChapter);

        if (currentChapterIndex === -1) {
            console.warn(`Invalid current chapter: ${student.currentChapter}, resetting to Ch1`);
            student.currentChapter = this.Chapters[0];
            return false;
        }

        // If already at the last chapter, cannot move to next chapter
        if (currentChapterIndex >= this.Chapters.length - 1) {
            return false;
        }

        const nextChapterIndex = currentChapterIndex + 1;
        const currentChapter = student.currentChapter;
        const nextChapter = this.Chapters[nextChapterIndex];

        // Add Diamond level to completedLevels if not already there
        const diamondLevelKey = `${currentChapterIndex}-${this.Levels.length - 1}`;
        if (!student.completedLevels.includes(diamondLevelKey)) {
            student.completedLevels.push(diamondLevelKey);
        }

        // Clear solvedProblems and remainingProblems for the OLD chapter's Diamond level (before moving)
        this._clearProblemsForLevel(student, currentChapterIndex, this.Levels.length - 1);

        // Move to next chapter and reset to Yellow
        student.currentChapter = nextChapter;
        // Do NOT reset level for the new chapter here, it should be handled by chapterLevels
        // But for legacy support we might need to set currentLevel
        student.currentLevel = student.chapterLevels[nextChapter] || this.Levels[0];

        console.log(`Student ${student.studentId} moved from ${currentChapter} to ${nextChapter}`);
        return true;
    }

    /**
     * Clear remainingProblems for a specific level/chapter
     * Only removes problems that belong to the specified level and chapter
     * NOTE: We do NOT clear solvedProblems - those should be kept as history
     * @param {Object} student - Student object
     * @param {number} chapterIndex - Chapter index
     * @param {number} levelIndex - Level index
     */
    _clearProblemsForLevel(student, chapterIndex, levelIndex) {
        const problems = dataService.loadProblems();

        if (chapterIndex === -1 || levelIndex === -1) {
            return;
        }

        // Get all problem IDs for this level/chapter
        const problemsInLevel = problems
            .filter(p => parseInt(p.chapter) === chapterIndex && parseInt(p.level) === levelIndex)
            .map(p => p.id || p.problemId)
            .filter(id => id != null);

        // Only remove from remainingProblems - keep solvedProblems as history
        student.remainingProblems = student.remainingProblems.filter(
            id => !problemsInLevel.includes(id)
        );
    }

    /**
     * Clear solvedProblems and remainingProblems for the current level/chapter
     * Only removes problems that belong to the current level and chapter
     * @param {Object} student - Student object
     */
    _clearProblemsForCurrentLevel(student) {
        const chapterIndex = this.Chapters.indexOf(student.currentChapter);
        const levelIndex = this.Levels.indexOf(student.currentLevel);
        this._clearProblemsForLevel(student, chapterIndex, levelIndex);
    }

    /**
     * Check if all problems in remainingProblems for a specific chapter/level are solved
     * @param {Object} student - Student object
     * @param {string} chapter - Chapter name
     * @param {string} level - Level name
     * @returns {boolean} True if remainingProblems is empty for current level
     */
    _isLevelFullySolved(student, chapter, level) {
        const problems = dataService.loadProblems();
        const chapterIndex = this.Chapters.indexOf(chapter);
        const levelIndex = this.Levels.indexOf(level);

        if (chapterIndex === -1 || levelIndex === -1) {
            return false;
        }

        // Get all problems for current level/chapter
        const problemsInCurrentLevel = problems.filter(p =>
            parseInt(p.chapter) === chapterIndex && parseInt(p.level) === levelIndex
        );

        if (problemsInCurrentLevel.length === 0) {
            return false; // No problems in this level
        }

        // Check if all problems in current level are solved
        const allSolved = problemsInCurrentLevel.every(problem => {
            const problemId = problem.id || problem.problemId;
            return student.solvedProblems && student.solvedProblems.includes(problemId);
        });

        // Also check if remainingProblems has no problems from current level
        const remainingInCurrentLevel = student.remainingProblems.filter(problemId => {
            const problem = problems.find(p => (p.id || p.problemId) === problemId);
            return problem &&
                parseInt(problem.chapter) === chapterIndex &&
                parseInt(problem.level) === levelIndex;
        });

        return allSolved && remainingInCurrentLevel.length === 0;
    }

    /**
     * Update student progress automatically
     * This is the main function that should be called before saving a student
     * It checks if the student should progress to the next level or chapter
     * 
     * Logic:
     * 1. Iterate through all chapters
     * 2. For each chapter, set level to highest completed
     * 3. Check if current level for that chapter is fully solved, if so move to next
     * 
     * @param {Object} student - Student object (will be modified in place)
     * @returns {Object} Updated student with progression applied
     */
    updateProgress(student) {
        if (!student) {
            throw new Error('Student cannot be null or undefined');
        }

        // Normalize student data first
        this.normalizeStudentData(student);

        // Iterate over all chapters to update their levels independently
        this.Chapters.forEach(chapter => {
            // Step 1: Set level to the highest completed level for this chapter
            const highestCompleted = this.getHighestCompletedLevel(student, chapter);
            if (highestCompleted) {
                student.chapterLevels[chapter] = highestCompleted;
            } else {
                // If no level is completed, ensure it has a default if missing
                if (!student.chapterLevels[chapter]) {
                    student.chapterLevels[chapter] = this.Levels[0];
                }
            }

            // Step 2: Check if current level for this chapter is fully solved
            // Use a max iterations counter to prevent infinite loops
            let maxIterations = 10;
            let iterations = 0;

            while (iterations < maxIterations) {
                iterations++;

                const currentLevel = student.chapterLevels[chapter];

                // Check if current level is fully completed
                const isFullySolved = this._isLevelFullySolved(student, chapter, currentLevel);
                const isCompleted = this.isLevelCompleted(student, chapter, currentLevel);

                if (!isFullySolved && !isCompleted) {
                    break;
                }

                // If Diamond level is completed, just stop - chapters are independent
                // No automatic chapter progression
                if (currentLevel === "Diamond") {
                    break;
                } else {
                    // Move to next level
                    const moved = this.moveToNextLevel(student, chapter);
                    if (moved) {
                        continue;
                    } else {
                        break;
                    }
                }
            }
        });

        return student;
    }
}

module.exports = new LevelProgressService();
