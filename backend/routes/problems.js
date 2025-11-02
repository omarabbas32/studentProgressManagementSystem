const express = require('express');
const router = express.Router();
const dataService = require('../services/DataService');
const { ChapterEnum, LevelEnum } = require('../models/Enums');

// POST assign problems to all students
router.post('/assign', (req, res) => {
    try {
        const students = dataService.loadStudents();

        if (students.length === 0) {
            return res.status(400).json({ error: 'No students found in the system' });
        }

        const problem = req.body;
        let nextProblemId = 1;

        // Find max problem ID
        students.forEach(s => {
            (s.assignedProblems || []).forEach(p => {
                if (p.problemId >= nextProblemId) {
                    nextProblemId = p.problemId + 1;
                }
            });
        });

        students.forEach(student => {
            if (!student.assignedProblems) {
                student.assignedProblems = [];
            }

            const newProblem = {
                problemId: nextProblemId++,
                book: problem.book,
                page: problem.page,
                numberOfProblem: problem.numberOfProblem,
                level: problem.level,
                chapter: problem.chapter,
                assignedDate: new Date().toISOString(),
                isCompleted: false
            };
            student.assignedProblems.push(newProblem);
        });

        dataService.saveStudents(students);
        res.json({ message: `Problems assigned to ${students.length} students` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE remove problems by chapter and level
router.delete('/:studentId/:chapter/:level', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapter = parseInt(req.params.chapter);
        const level = parseInt(req.params.level);

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const problemsToRemove = (student.assignedProblems || [])
            .filter(p => p.chapter === chapter && p.level === level);

        if (problemsToRemove.length === 0) {
            return res.status(404).json({ 
                error: `No problems found for student ${studentId} in Chapter ${chapter} and Level ${level}` 
            });
        }

        student.assignedProblems = student.assignedProblems.filter(
            p => !(p.chapter === chapter && p.level === level)
        );

        dataService.saveStudents(students);
        res.json({ 
            message: `Removed ${problemsToRemove.length} problems for student ${studentId} in Chapter ${chapter} and Level ${level}` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT mark problems as completed
router.put('/:studentId/:chapter/:level/complete', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapter = parseInt(req.params.chapter);
        const level = parseInt(req.params.level);

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const problems = (student.assignedProblems || [])
            .filter(p => p.chapter === chapter && p.level === level && !p.isCompleted);

        if (problems.length === 0) {
            return res.status(404).json({ 
                error: `No uncompleted problems found for student ${studentId} in Chapter ${chapter} and Level ${level}` 
            });
        }

        problems.forEach(problem => {
            problem.isCompleted = true;
            problem.completedDate = new Date().toISOString();
        });

        dataService.saveStudents(students);
        res.json({ 
            message: `Marked ${problems.length} problems as completed for student ${studentId} in Chapter ${chapter} and Level ${level}` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all problems by chapter and level (MUST come before /:studentId/:chapter/:level)
router.get('/all/:chapter/:level', (req, res) => {
    try {
        const chapter = parseInt(req.params.chapter);
        const level = parseInt(req.params.level);

        console.log(`[DEBUG] Loading problems for chapter=${chapter}, level=${level}`);

        // Try new centralized problems system first
        const problems = dataService.loadProblems();
        console.log(`[DEBUG] Loaded ${problems.length} problems from centralized file`);
        
        if (problems && problems.length > 0) {
            // Filter by chapter and level from centralized problems file
            const filteredProblems = problems.filter(p => {
                const pChapter = parseInt(p.chapter);
                const pLevel = parseInt(p.level);
                const match = pChapter === chapter && pLevel === level;
                if (match) {
                    console.log(`[DEBUG] Found matching problem: id=${p.id}, chapter=${pChapter}, level=${pLevel}`);
                }
                return match;
            });

            console.log(`[DEBUG] Filtered to ${filteredProblems.length} problems`);

            const result = filteredProblems.map(p => ({
                problemId: p.id || p.problemId,
                book: p.book || '',
                page: p.page || 0,
                numberOfProblem: p.numberOfProblem || 0,
                level: parseInt(p.level),
                chapter: parseInt(p.chapter),
                assignedDate: p.createdAt || p.assignedDate || new Date().toISOString(),
                isCompleted: false,
                completedDate: null
            }));

            console.log(`[DEBUG] Returning ${result.length} problems`);
            return res.json(result);
        }

        // Fallback to old system: get from students' assignedProblems
        const students = dataService.loadStudents();
        console.log(`[DEBUG] No centralized problems, falling back to students (${students.length} students)`);

        if (students.length === 0) {
            // No students and no problems - return empty array
            console.log(`[DEBUG] No students, returning empty array`);
            return res.json([]);
        }

        // First get all distinct problems across all students
        const problemMap = new Map();
        students.forEach(s => {
            (s.assignedProblems || []).forEach(p => {
                if (p.chapter === chapter && p.level === level) {
                    const key = `${p.book}-${p.page}-${p.numberOfProblem}`;
                    if (!problemMap.has(key)) {
                        problemMap.set(key, p);
                    }
                }
            });
        });

        const distinctProblems = Array.from(problemMap.values());

        const result = distinctProblems.map(p => ({
            problemId: p.problemId,
            book: p.book,
            page: p.page,
            numberOfProblem: p.numberOfProblem,
            level: p.level,
            chapter: p.chapter,
            assignedDate: p.assignedDate,
            isCompleted: p.isCompleted,
            completedDate: p.completedDate
        }));

        console.log(`[DEBUG] Returning ${result.length} problems from old system`);
        res.json(result);
    } catch (error) {
        console.error(`[ERROR] Error loading problems:`, error);
        res.status(500).json({ error: error.message });
    }
});

// GET student problems by chapter and level (MUST come after /all/:chapter/:level)
router.get('/:studentId/:chapter/:level', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapter = parseInt(req.params.chapter);
        const level = parseInt(req.params.level);

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const problems = (student.assignedProblems || [])
            .filter(p => p.chapter === chapter && p.level === level);

        res.json(problems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE remove problem
router.delete('/remove', (req, res) => {
    try {
        const request = req.body;

        if (!request.book) {
            return res.status(400).json({ error: 'Book is required' });
        }

        const students = dataService.loadStudents();
        let modifiedCount = 0;

        students.forEach(student => {
            const originalCount = (student.assignedProblems || []).length;

            student.assignedProblems = (student.assignedProblems || []).filter(p =>
                !(p.book === request.book &&
                  p.page === request.page &&
                  p.numberOfProblem === request.numberOfProblem &&
                  p.level === request.level &&
                  p.chapter === request.chapter)
            );

            if (student.assignedProblems.length < originalCount) {
                modifiedCount++;
            }
        });

        dataService.saveStudents(students);

        if (modifiedCount === 0) {
            return res.status(404).json({ message: 'No problems found matching the criteria' });
        }

        res.json({
            message: `Problem removed from ${modifiedCount} student(s)`,
            modifiedCount
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save changes', details: error.message });
    }
});

module.exports = router;

