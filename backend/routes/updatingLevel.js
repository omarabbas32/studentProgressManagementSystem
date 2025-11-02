const express = require('express');
const router = express.Router();
const dataService = require('../services/DataService');

// GET current level
router.get('/current-level/:studentId/:chapterId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapterId = parseInt(req.params.chapterId);
        const data = dataService.loadStudentProgress();
        const level = calculateNextLevel(data, studentId, chapterId);
        res.json(level);
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

        const currentData = dataService.loadStudentProgress();
        updateStudentProgress(currentData, request);
        dataService.saveStudentProgress(currentData);

        res.json({
            message: 'Level saved successfully.',
            currentLevel: request.newLevel
        });
    } catch (error) {
        res.status(500).json({ error: `Error saving level: ${error.message}` });
    }
});

// GET student progress
router.get('/student-progress/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const data = dataService.loadStudentProgress();
        const progress = data[studentId];
        
        if (progress && progress.chapterLevels) {
            res.json(progress.chapterLevels);
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

function updateStudentProgress(data, request) {
    if (!data[request.studentId]) {
        data[request.studentId] = {
            studentId: request.studentId,
            chapterLevels: {}
        };
    }
    data[request.studentId].chapterLevels[request.chapterId] = request.newLevel;
}

function calculateNextLevel(data, studentId, chapterId) {
    if (!data[studentId] || !data[studentId].chapterLevels || !data[studentId].chapterLevels[chapterId]) {
        return 0;
    }
    const level = data[studentId].chapterLevels[chapterId];
    return Math.min(level + 1, 7);
}

module.exports = router;

