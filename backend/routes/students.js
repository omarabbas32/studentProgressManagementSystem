const express = require('express');
const router = express.Router();
const dataService = require('../services/DataService');
const { ChapterEnum, LevelEnum } = require('../models/Enums');
const levelProgressService = require('../services/LevelProgressService');


router.get('/', (req, res) => {
    try {
        const students = dataService.loadStudents();
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET students by group
router.get('/group/:groupName', (req, res) => {
    try {
        const groupName = req.params.groupName;
        const students = dataService.loadStudents();
        // Case-insensitive comparison for group name
        const filtered = students.filter(s => s.group && s.group.toLowerCase() === groupName.toLowerCase());
        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




router.post('/sync-student', (req, res) => {
    try {
        const students = dataService.loadStudents();
        const StudentModel = require('../models/Student');

        const incoming = req.body;

        console.log("Incoming body:", incoming);

        // Find existing student to preserve currentChapter/currentLevel if not provided
        const existingStudent = students.find(s => s.studentId === incoming.Id);

        // Correct mapping from .NET → Node.js model
        const mappedStudent = new StudentModel({
            studentId: incoming.Id,         // Capital I
            name: incoming.Name,            // Capital N
            number: incoming.Phone1,        // Capital P
            parentNumber: incoming.Phone2,  // Capital P
            group: incoming.SumsGroup,          // Capital G

            // Keep old or initialize new
            assignedProblems: incoming.assignedProblems || [],
            attendances: incoming.attendances || [],
            remainingProblems: incoming.remainingProblems || [],
            solvedProblems: incoming.solvedProblems || [],
            completedLevels: incoming.completedLevels || [],

            chapterLevels: incoming.chapterLevels || (existingStudent?.chapterLevels || {})
        });


        const index = students.findIndex(s => s.studentId === mappedStudent.studentId);

        // Update progress BEFORE saving
        // This automatically checks if student should progress to next level/chapter
        levelProgressService.updateProgress(mappedStudent);

        if (index !== -1) {
            students[index] = {
                ...students[index],
                ...mappedStudent
            };
        } else {
            students.push(mappedStudent);
        }

        dataService.saveStudents(students);

        res.json({
            message: "Student synced successfully",
            student: {
                ...mappedStudent,
                chapterLevels: mappedStudent.chapterLevels
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});










// GET student by ID
router.get('/search-id', (req, res) => {
    try {
        const id = parseInt(req.query.id);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === id);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Normalize student data
        levelProgressService.normalizeStudentData(student);

        res.json({
            studentId: student.studentId,
            name: student.name,
            number: student.number,
            parentNumber: student.parentNumber,
            group: student.group,
            chapterLevels: student.chapterLevels || {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET students by name search
router.get('/search-name', (req, res) => {
    try {
        const name = req.query.name;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: "Name can't be null or empty." });
        }

        const students = dataService.loadStudents();
        const matchingStudents = students
            .filter(s => s.name.toLowerCase().includes(name.toLowerCase()))
            .map(s => ({
                studentId: s.studentId,
                name: s.name,
                number: s.number,
                parentNumber: s.parentNumber
            }));

        res.json(matchingStudents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET current week attendance count
router.get('/current-week-count/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: `Student with ID ${studentId} not found` });
        }

        // Define the current week range (Saturday to Thursday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const daysSinceSaturday = ((dayOfWeek - 6 + 7) % 7);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - daysSinceSaturday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5);

        const count = (student.attendances || [])
            .filter(a => {
                const weekDate = new Date(a.weekStartDate);
                weekDate.setHours(0, 0, 0, 0);
                return weekDate >= startOfWeek && weekDate <= endOfWeek && a.isPresent;
            }).length;

        res.json(count);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET attendance percentage
router.get('/attendance-percentage/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.json(0);
        }

        const percentage = (student.attendances || []).some(a => a.isPresent) ? 100 : 0;
        res.json(percentage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create student
router.post('/', (req, res) => {
    try {
        const students = dataService.loadStudents();
        const student = req.body;

        if (students.some(s => s.studentId === student.studentId)) {
            return res.status(400).json({ error: `Student with ID ${student.studentId} already exists` });
        }

        // Load all problems and assign their IDs to this student's remainingProblems
        const problems = dataService.loadProblems();
        console.log(`[DEBUG] Creating student ${student.studentId}: Found ${problems.length} problems to assign`);

        // Initialize arrays
        student.remainingProblems = [];
        student.solvedProblems = [];
        student.completedLevels = [];

        // Assign ALL existing problems to the new student's remainingProblems
        problems.forEach(p => {
            const problemId = p.id || p.problemId;
            if (problemId != null) {
                student.remainingProblems.push(problemId);
                console.log(`[DEBUG] Adding problem ID ${problemId} to student's remainingProblems`);
            }
        });

        console.log(`[DEBUG] Student ${student.studentId} initialized with ${student.remainingProblems.length} remaining problems`);
        console.log(`[DEBUG] Problem IDs assigned:`, student.remainingProblems);

        // If there are existing students, copy all their problems to the new student (backward compatibility)
        if (students.length > 0) {
            const existingProblems = students[0].assignedProblems || [];
            student.assignedProblems = existingProblems.map(p => ({
                problemId: p.problemId,
                book: p.book,
                page: p.page,
                numberOfProblem: p.numberOfProblem,
                level: p.level,
                chapter: p.chapter,
                assignedDate: new Date().toISOString(),
                isCompleted: false,
                completedDate: null
            }));
        } else {
            student.assignedProblems = [];
        }

        if (!student.attendances) {
            student.attendances = [];
        }

        students.push(student);
        dataService.saveStudents(students);

        console.log(`[DEBUG] Student ${student.studentId} created successfully. Remaining problems: ${student.remainingProblems.length}`);
        console.log(`[DEBUG] Student data:`, JSON.stringify({
            studentId: student.studentId,
            name: student.name,
            remainingProblems: student.remainingProblems,
            solvedProblems: student.solvedProblems,
            completedLevels: student.completedLevels
        }, null, 2));

        res.status(201).json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update student
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const students = dataService.loadStudents();
        const existingStudent = students.find(s => s.studentId === id);

        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = req.body;

        // Check if the new StudentId is already taken by another student
        if (student.studentId !== id && students.some(s => s.studentId === student.studentId)) {
            return res.status(400).json({ error: `Student with ID ${student.studentId} already exists` });
        }

        existingStudent.studentId = student.studentId;
        existingStudent.name = student.name;
        existingStudent.number = student.number;
        existingStudent.parentNumber = student.parentNumber;
        existingStudent.group = student.group;

        dataService.saveStudents(students);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE student
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const students = dataService.loadStudents();
        const index = students.findIndex(s => s.studentId === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Student not found' });
        }

        students.splice(index, 1);
        dataService.saveStudents(students);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST add problem to student
router.post('/:studentId/add-problem', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: `Student with ID ${studentId} not found` });
        }

        const problem = req.body;
        problem.assignedDate = new Date().toISOString();
        problem.isCompleted = false;
        problem.completedDate = null;

        if (!student.assignedProblems) {
            student.assignedProblems = [];
        }

        student.assignedProblems.push(problem);
        dataService.saveStudents(students);
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST assign problems to all students
router.post('/problems/assign', (req, res) => {
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
router.delete('/problems/:studentId/:chapter/:level', (req, res) => {
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
router.put('/problems/:studentId/:chapter/:level/complete', (req, res) => {
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

// GET student problems by chapter and level
router.get('/problems/:studentId/:chapter/:level', (req, res) => {
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

// DELETE remove specific problem
router.delete('/remove-problem/:studentId/:chapterIndex/:levelIndex/:problemId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapterIndex = parseInt(req.params.chapterIndex);
        const levelIndex = parseInt(req.params.levelIndex);
        const problemId = parseInt(req.params.problemId);

        if (chapterIndex < 0 || chapterIndex > 6 || levelIndex < 0 || levelIndex > 7) {
            return res.status(400).json({ error: 'Invalid chapter or level index' });
        }

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: `Student with ID ${studentId} not found` });
        }

        const problemIndex = (student.assignedProblems || []).findIndex(p =>
            p.problemId === problemId &&
            p.chapter === chapterIndex &&
            p.level === levelIndex
        );

        if (problemIndex === -1) {
            return res.status(404).json({ error: 'Problem not found with the specified criteria' });
        }

        student.assignedProblems.splice(problemIndex, 1);
        dataService.saveStudents(students);

        res.json({
            message: 'Problem removed successfully',
            studentId: studentId,
            problemId: problemId,
            chapter: chapterIndex,
            level: levelIndex
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST record attendance
router.post('/:studentId/attendance', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Get the current week's Monday and Sunday
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = (7 + (dayOfWeek - 1)) % 7;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        if (!student.attendances) {
            student.attendances = [];
        }

        // Check if attendance already recorded for this week
        const existingAttendanceIndex = student.attendances.findIndex(a => {
            const weekStartDate = new Date(a.weekStartDate);
            weekStartDate.setHours(0, 0, 0, 0);
            return weekStartDate.getTime() === weekStart.getTime();
        });

        const attendance = req.body;

        // Always set/update the actual attendance date
        attendance.date = attendance.date || new Date().toISOString();

        // Create new attendance record - ALWAYS create new, allowing multiple per week
        attendance.studentId = studentId;
        attendance.attendanceId =
            student.attendances.length > 0
                ? Math.max(...student.attendances.map(a => a.attendanceId || 0)) + 1
                : 1;

        attendance.weekStartDate = weekStart.toISOString();
        attendance.weekEndDate = weekEnd.toISOString();

        // Ensure date is included
        attendance.date = attendance.date || new Date().toISOString();

        student.attendances.push(attendance);

        dataService.saveStudents(students);
        return res.json(attendance);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// GET student attendance history
router.get('/:studentId/attendance', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const attendanceHistory = (student.attendances || [])
            .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
            .map(a => {
                const start = new Date(a.weekStartDate);
                const end = new Date(a.weekEndDate);
                return {
                    attendanceId: a.attendanceId,
                    week: `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')} - ${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`,
                    isPresent: a.isPresent,
                    notes: a.notes,
                    studentName: student.name
                };
            });

        res.json(attendanceHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET student attendance percentage
router.get('/:studentId/attendance/percentage', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const totalWeeks = (student.attendances || []).length;
        if (totalWeeks === 0) {
            return res.json({ percentage: 0, totalWeeks: 0, presentWeeks: 0 });
        }

        const presentWeeks = (student.attendances || []).filter(a => a.isPresent).length;
        const percentage = (presentWeeks / totalWeeks) * 100;

        res.json({
            percentage: Math.round(percentage * 100) / 100,
            totalWeeks,
            presentWeeks,
            absentWeeks: totalWeeks - presentWeeks
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET check level completion
router.get('/check-levels/:studentId/:chapter', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const chapter = parseInt(req.params.chapter);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: `Student with ID ${studentId} not found` });
        }

        // Get all possible level values (0-7)
        const allLevels = [0, 1, 2, 3, 4, 5, 6, 7];
        const result = allLevels.map(level => {
            const isEmpty = !(student.assignedProblems || []).some(p =>
                p.chapter === chapter && p.level === level
            );
            return isEmpty;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/add-problem', (req, res) => {
    try {
        const dto = req.body;

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === dto.studentId);

        if (!student) {
            return res.status(404).json({ error: `Student with ID ${dto.studentId} not found.` });
        }

        if (dto.chapterIndex < 0 || dto.chapterIndex > 6 || dto.levelIndex < 0 || dto.levelIndex > 7) {
            return res.status(400).json({ error: 'Invalid chapter or level index.' });
        }

        if (!student.assignedProblems) {
            student.assignedProblems = [];
        }

        const problem = {
            chapter: dto.chapterIndex,
            level: dto.levelIndex,
            book: dto.book,
            page: dto.page,
            numberOfProblem: dto.numberOfQuestion,
            assignedDate: new Date().toISOString(),
            isCompleted: false,
            completedDate: null
        };

        student.assignedProblems.push(problem);
        dataService.saveStudents(students);
        res.json({ message: 'Problem added successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all attendance history
router.get('/attendance', (req, res) => {
    try {
        const students = dataService.loadStudents();
        const allAttendance = students
            .flatMap(s => (s.attendances || []).map(a => ({
                ...a,
                studentId: s.studentId,
                studentName: s.name
            })))
            .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
            .map(a => {
                const start = new Date(a.weekStartDate);
                const end = new Date(a.weekEndDate);
                return {
                    attendanceId: a.attendanceId,
                    week: `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')} - ${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`,
                    isPresent: a.isPresent,
                    notes: a.notes,
                    studentId: a.studentId,
                    studentName: a.studentName || 'Unknown Student'
                };
            });

        res.json(allAttendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET attendance streak

router.get('/:studentId/streak', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        // Group attendances by week to calculate streak based on weeks
        const attendanceByWeek = {};

        (student.attendances || []).forEach(a => {
            const weekKey = a.weekStartDate; // Use weekStartDate as key
            if (!attendanceByWeek[weekKey]) {
                attendanceByWeek[weekKey] = {
                    date: new Date(a.weekStartDate),
                    isPresent: false,
                    weekStartDate: a.weekStartDate
                };
            }
            // If present in ANY record for this week, mark week as present
            if (a.isPresent) {
                attendanceByWeek[weekKey].isPresent = true;
            }
        });

        // Convert to array and sort by date descending
        let streak = Object.values(attendanceByWeek)
            .sort((a, b) => b.date - a.date)
            .slice(0, 4)
            .map(week => ({
                status: week.isPresent ? 'حضور' : 'غياب',
                date: week.date.toLocaleDateString('ar-EG')
            }));

        // Fill missing data
        while (streak.length < 4) {
            streak.push({
                status: 'لا يوجد بيانات',
                date: '---'
            });
        }

        res.json({ attendanceStreak: streak });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// GET student's problems with status (remaining/solved)
router.get('/:id/problems', (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const students = dataService.loadStudents();
        const problems = dataService.loadProblems();

        const student = students.find(s => s.studentId === studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

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

        // Map problems with status - show ALL problems (solved and remaining)
        const problemsWithStatus = problems.map(problem => {
            const problemId = problem.id || problem.problemId;
            const isSolved = student.solvedProblems && student.solvedProblems.includes(problemId);
            const isRemaining = student.remainingProblems && student.remainingProblems.includes(problemId);
            const levelKey = `${problem.chapter}-${problem.level}`;
            const isLevelCompleted = student.completedLevels && student.completedLevels.includes(levelKey);

            // Debug logging
            console.log(`[DEBUG] Problem ${problemId}: isSolved=${isSolved}, type=${typeof problemId}, solvedArray contains:`, student.solvedProblems);

            // A problem can be solved OR remaining, but not both
            // If solved, it's no longer remaining
            // If remaining, it's not solved yet
            return {
                ...problem,
                problemId: problemId,
                isSolved: isSolved,
                isRemaining: isRemaining && !isSolved, // Only remaining if not solved
                isLevelCompleted: isLevelCompleted
            };
        });

        res.json({
            studentId: student.studentId,
            studentName: student.name,
            remainingProblems: student.remainingProblems.length,
            solvedProblems: student.solvedProblems.length,
            completedLevels: student.completedLevels,
            problems: problemsWithStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT solve problem - Mark a problem as solved for a student
router.put('/:id/solve/:problemId', (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const problemId = parseInt(req.params.problemId);

        const students = dataService.loadStudents();
        const problems = dataService.loadProblems();

        const student = students.find(s => s.studentId === studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

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

        // Check if problem exists
        const problem = problems.find(p => (p.id || p.problemId) === problemId);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Check if already solved
        if (student.solvedProblems.includes(problemId)) {
            return res.status(400).json({ error: 'Problem is already marked as solved' });
        }

        // Remove from remainingProblems (if it exists there)
        const remainingIndex = student.remainingProblems.indexOf(problemId);
        if (remainingIndex !== -1) {
            student.remainingProblems.splice(remainingIndex, 1);
        }

        // Add to solvedProblems (problem moves from remaining to solved, NOT deleted)
        if (!student.solvedProblems.includes(problemId)) {
            student.solvedProblems.push(problemId);
        }

        console.log(`[DEBUG] Problem ${problemId} solved for student ${studentId}. Remaining: ${student.remainingProblems.length}, Solved: ${student.solvedProblems.length}`);

        // Update progress automatically after solving a problem
        // This will check if level is completed and move to next level if needed
        levelProgressService.updateProgress(student);

        // Find the student index to update in the array
        const studentIndex = students.findIndex(s => s.studentId === studentId);
        if (studentIndex !== -1) {
            students[studentIndex] = student;
        }

        dataService.saveStudents(students);

        res.json({
            message: 'Problem marked as solved',
            student: {
                studentId: student.studentId,
                name: student.name,
                remainingProblems: student.remainingProblems.length,
                solvedProblems: student.solvedProblems.length,
                completedLevels: student.completedLevels,
                currentChapter: student.currentChapter,
                currentLevel: student.currentLevel
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE remove problem from student
router.delete('/:id/problem/:problemId', (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const problemId = parseInt(req.params.problemId);

        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Initialize arrays if they don't exist
        if (!student.remainingProblems) {
            student.remainingProblems = [];
        }
        if (!student.solvedProblems) {
            student.solvedProblems = [];
        }

        // Remove from remainingProblems
        const remainingIndex = student.remainingProblems.indexOf(problemId);
        if (remainingIndex !== -1) {
            student.remainingProblems.splice(remainingIndex, 1);
        }

        // Remove from solvedProblems
        const solvedIndex = student.solvedProblems.indexOf(problemId);
        if (solvedIndex !== -1) {
            student.solvedProblems.splice(solvedIndex, 1);

            // Check if we need to remove a completed level
            const problems = dataService.loadProblems();
            const problem = problems.find(p => (p.id || p.problemId) === problemId);
            if (problem) {
                const levelKey = `${problem.chapter}-${problem.level}`;
                const levelIndex = student.completedLevels.indexOf(levelKey);
                if (levelIndex !== -1) {
                    // Re-check if all problems in level are solved
                    const problemsInLevel = problems.filter(p =>
                        p.chapter === problem.chapter && p.level === problem.level
                    );
                    const solvedProblemsInLevel = problemsInLevel.filter(p =>
                        student.solvedProblems.includes(p.id || p.problemId)
                    );

                    // If not all solved, remove from completedLevels
                    if (solvedProblemsInLevel.length !== problemsInLevel.length) {
                        student.completedLevels.splice(levelIndex, 1);
                    }
                }
            }
        }

        dataService.saveStudents(students);

        res.json({
            message: 'Problem removed from student',
            student: {
                studentId: student.studentId,
                name: student.name,
                remainingProblems: student.remainingProblems.length,
                solvedProblems: student.solvedProblems.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST finish level - Mark all problems in current chapter/level as solved
router.post('/:id/finish-level', (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const { chapter, level } = req.body;

        if (chapter === undefined || level === undefined) {
            return res.status(400).json({ error: 'Chapter and level are required' });
        }

        const students = dataService.loadStudents();
        const problems = dataService.loadProblems();

        const student = students.find(s => s.studentId === studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

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

        const chapterIndex = parseInt(chapter);
        const levelIndex = parseInt(level);

        // Get all problems for this chapter and level
        const problemsInLevel = problems.filter(p =>
            parseInt(p.chapter) === chapterIndex && parseInt(p.level) === levelIndex
        );

        if (problemsInLevel.length === 0) {
            return res.status(404).json({ error: 'No problems found for this chapter and level' });
        }

        let solvedCount = 0;
        // Mark all problems in this level as solved
        problemsInLevel.forEach(problem => {
            const problemId = problem.id || problem.problemId;

            // Remove from remainingProblems if exists
            const remainingIndex = student.remainingProblems.indexOf(problemId);
            if (remainingIndex !== -1) {
                student.remainingProblems.splice(remainingIndex, 1);
            }

            // Add to solvedProblems if not already there
            if (!student.solvedProblems.includes(problemId)) {
                student.solvedProblems.push(problemId);
                solvedCount++;
            }
        });

        // Update progress automatically (will move to next level if completed)
        levelProgressService.updateProgress(student);

        // Find the student index to update in the array
        const studentIndex = students.findIndex(s => s.studentId === studentId);
        if (studentIndex !== -1) {
            students[studentIndex] = student;
        }

        dataService.saveStudents(students);

        res.json({
            message: `تم إنهاء المستوى بنجاح! تم حل ${solvedCount} مسألة`,
            student: {
                studentId: student.studentId,
                name: student.name,
                remainingProblems: student.remainingProblems.length,
                solvedProblems: student.solvedProblems.length,
                completedLevels: student.completedLevels,
                currentChapter: student.currentChapter,
                currentLevel: student.currentLevel,
                chapterLevels: student.chapterLevels || {}
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

