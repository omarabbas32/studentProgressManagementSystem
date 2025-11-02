const express = require('express');
const router = express.Router();
const dataService = require('../services/DataService');
const { ChapterEnum, LevelEnum } = require('../models/Enums');

// POST /problems - Add a new problem
router.post('/', (req, res) => {
    try {
        const problems = dataService.loadProblems();
        const students = dataService.loadStudents();

        // Generate new problem ID
        let nextProblemId = 1;
        if (problems.length > 0) {
            nextProblemId = Math.max(...problems.map(p => p.id || 0)) + 1;
        }

        // Create new problem
        const newProblem = {
            id: nextProblemId,
            book: req.body.book,
            page: req.body.page,
            numberOfProblem: req.body.numberOfProblem,
            level: req.body.level,
            chapter: req.body.chapter,
            createdAt: new Date().toISOString()
        };

        // Save problem to problems file
        problems.push(newProblem);
        dataService.saveProblems(problems);

        // Update all students
        students.forEach(student => {
            // Initialize arrays if they don't exist
            if (!student.remainingProblems) {
                student.remainingProblems = [];
            }
            if (!student.solvedProblems) {
                student.solvedProblems = [];
            }
            if (!student.completedLevels) {
                student.completedLevels = [];
            }

            // Add problem ID to remainingProblems
            if (!student.remainingProblems.includes(nextProblemId)) {
                student.remainingProblems.push(nextProblemId);
            }

            // Check if this problem's level was completed, and remove it if so
            const levelKey = `${newProblem.chapter}-${newProblem.level}`;
            const levelIndex = student.completedLevels.indexOf(levelKey);
            if (levelIndex !== -1) {
                // Remove from completedLevels because a new problem was added to this level
                student.completedLevels.splice(levelIndex, 1);
            }
        });

        // Save updated students
        dataService.saveStudents(students);

        res.status(201).json({
            message: 'Problem added successfully',
            problem: newProblem,
            studentsUpdated: students.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /problems - Get all problems
router.get('/', (req, res) => {
    try {
        const problems = dataService.loadProblems();
        res.json(problems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /problems/:id - Get a specific problem
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const problems = dataService.loadProblems();
        const problem = problems.find(p => p.id === id);

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        res.json(problem);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

