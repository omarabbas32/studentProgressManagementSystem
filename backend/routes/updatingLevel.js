const express = require('express');
const router = express.Router();
const dataService = require('../services/DataService');

// GET current level
router.get('/current-level/:studentId/:chapterId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapterId = req.params.chapterId;

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.json(0); // Default if student not found
        }

        // Ensure chapterLevels exists
        if (!student.chapterLevels) {
            student.chapterLevels = {};
        }

        const Levels = ["Yellow", "Green", "Red", "Black", "Blue", "Gold", "Platinum", "Diamond"];
        const Chapters = ["Ch1", "Ch2", "Ch3", "Ch4", "ModernPhysics", "Ch8", "Kirchhoff"];

        // Convert chapterId to proper format
        let chapterKey;
        if (typeof chapterId === 'number') {
            chapterKey = Chapters[chapterId];
        } else if (typeof chapterId === 'string') {
            const parsed = parseInt(chapterId);
            if (!isNaN(parsed) && parsed >= 0 && parsed < Chapters.length) {
                chapterKey = Chapters[parsed];
            } else {
                chapterKey = chapterId; // Already a chapter key like "Ch1"
            }
        }

        const level = student.chapterLevels[chapterKey] || "Yellow"; // Default to Yellow

        // Convert level name to index for frontend
        let levelIndex = 0;
        if (typeof level === 'string') {
            levelIndex = Levels.indexOf(level);
            if (levelIndex === -1) levelIndex = 0;
        } else {
            levelIndex = level; // Assume it's already a number if legacy
        }

        console.log(`[UpdatingLevel] Getting level for student ${studentId}, chapterId: ${chapterId}, chapterKey: ${chapterKey}, level: ${level}, levelIndex: ${levelIndex}`);

        res.json(levelIndex);
    } catch (error) {
        res.status(500).json({ error: `Error retrieving level: ${error.message}` });
    }
});

// POST save level
router.post('/save-level', (req, res) => {
    try {
        const request = req.body;

        if (!validateRequest(request)) {
            return res.status(400).json({ error: 'Invalid request. Level must be between 0 and 7.' });
        }

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === request.studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (!student.chapterLevels) {
            student.chapterLevels = {};
        }

        const Levels = ["Yellow", "Green", "Red", "Black", "Blue", "Gold", "Platinum", "Diamond"];
        const Chapters = ["Ch1", "Ch2", "Ch3", "Ch4", "ModernPhysics", "Ch8", "Kirchhoff"];

        const newLevelName = Levels[request.newLevel];

        // Convert chapterId to proper format
        // ALWAYS use the canonical chapter key from Chapters array
        let chapterKey;
        if (typeof request.chapterId === 'number') {
            chapterKey = Chapters[request.chapterId];
        } else if (typeof request.chapterId === 'string') {
            // If it's already a string, check if it's a number string or chapter key
            const parsed = parseInt(request.chapterId);
            if (!isNaN(parsed) && parsed >= 0 && parsed < Chapters.length) {
                chapterKey = Chapters[parsed];
            } else {
                // It's a chapter key string - normalize it to match our canonical format
                // Find the matching chapter (case-insensitive)
                const normalizedKey = Chapters.find(ch => ch.toLowerCase() === request.chapterId.toLowerCase());
                chapterKey = normalizedKey || request.chapterId; // Use normalized or fallback to original
            }
        }

        console.log(`[UpdatingLevel] Saving level for student ${request.studentId}, chapterId: ${request.chapterId}, chapterKey: ${chapterKey}, newLevel: ${newLevelName}`);

        // IMPORTANT: Clean up any duplicate keys with different casing
        // Remove lowercase versions if they exist
        const lowercaseKey = chapterKey.toLowerCase();
        if (student.chapterLevels[lowercaseKey] && lowercaseKey !== chapterKey) {
            delete student.chapterLevels[lowercaseKey];
            console.log(`[UpdatingLevel] Removed duplicate lowercase key: ${lowercaseKey}`);
        }

        student.chapterLevels[chapterKey] = newLevelName;

        dataService.saveStudents(students);

        res.json({
            message: 'Level saved successfully.',
            currentLevel: request.newLevel,
            chapterKey: chapterKey
        });
    } catch (error) {
        res.status(500).json({ error: `Error saving level: ${error.message}` });
    }
});

// GET student progress
router.get('/student-progress/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (student && student.chapterLevels) {
            // Convert values to indices if needed?
            // The previous code returned the object as is.
            // If the object contained numbers, it returned numbers.
            // Now it contains strings.
            // If the frontend expects numbers, we should map them.

            const Levels = ["Yellow", "Green", "Red", "Black", "Blue", "Gold", "Platinum", "Diamond"];
            const progress = {};
            for (const [chapter, level] of Object.entries(student.chapterLevels)) {
                if (typeof level === 'string') {
                    progress[chapter] = Levels.indexOf(level);
                } else {
                    progress[chapter] = level;
                }
            }
            res.json(progress);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ error: `Error retrieving progress: ${error.message}` });
    }
});

// POST update question count (stub endpoint - can be implemented if needed)
router.post('/update-question-count', (req, res) => {
    try {
        // This endpoint is called but may not need to do anything
        // It's used when deleting questions to update counts
        // For now, just return success
        res.json({ message: 'Question count updated' });
    } catch (error) {
        res.status(500).json({ error: `Error updating question count: ${error.message}` });
    }
});

// Helper functions
function validateRequest(request) {
    if (!request) {
        return false;
    }
    if (request.newLevel < 0 || request.newLevel > 7) {
        return false;
    }
    return true;
}

module.exports = router;

