const express = require('express');
const router = express.Router();
const dataService = require('../services/DataService');

// GET student warnings
router.get('/student/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Get current month's attendance
        const monthAttendance = (student.attendances || []).filter(a => {
            const date = new Date(a.weekStartDate);
            return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
        });

        // Calculate attendance metrics
        const totalWeeks = monthAttendance.length;
        const presentWeeks = monthAttendance.filter(a => a.isPresent).length;
        const absentWeeks = totalWeeks - presentWeeks;
        const attendanceRate = totalWeeks > 0 ? (presentWeeks / totalWeeks) * 100 : 0;

        // Analyze attendance pattern
        const attendancePattern = [];
        if (absentWeeks >= 2) {
            attendancePattern.push(`Absent for ${absentWeeks} weeks`);
        }
        if (presentWeeks < totalWeeks / 2) {
            attendancePattern.push('Low attendance rate');
        }

        // Generate make-up recommendations based on attendance
        const makeUpRecommendations = [];
        if (absentWeeks > 0) {
            makeUpRecommendations.push(`Schedule ${absentWeeks} make-up sessions`);
            if (absentWeeks >= 2) {
                makeUpRecommendations.push('Consider additional support');
            }
        }

        // Analyze problem completion
        const uncompletedProblems = (student.assignedProblems || [])
            .filter(p => !p.isCompleted)
            .reduce((acc, p) => {
                const key = `${p.level}-${p.chapter}`;
                if (!acc[key]) {
                    acc[key] = { level: p.level, chapter: p.chapter, count: 0 };
                }
                acc[key].count++;
                return acc;
            }, {});

        const uncompletedProblemsList = Object.values(uncompletedProblems);

        // Generate problem completion warnings
        const problemWarnings = [];
        uncompletedProblemsList.forEach(group => {
            if (group.count >= 3) {
                problemWarnings.push(`Level ${group.level}: ${group.count} uncompleted problems in Chapter ${group.chapter}`);
            }
        });

        // Determine overall warning status
        let warningStatus = 'Good Standing';
        if (absentWeeks >= 2 || problemWarnings.length > 0) {
            warningStatus = 'High Risk';
        } else if (absentWeeks === 1 || uncompletedProblemsList.reduce((sum, p) => sum + p.count, 0) >= 5) {
            warningStatus = 'Medium Risk';
        } else if (absentWeeks === 0 && uncompletedProblemsList.reduce((sum, p) => sum + p.count, 0) > 0) {
            warningStatus = 'Low Risk';
        }

        res.json({
            studentId: student.studentId,
            studentName: student.name,
            currentMonth: `${currentMonth}/${currentYear}`,
            attendance: {
                totalWeeks,
                presentWeeks,
                absentWeeks,
                attendanceRate: Math.round(attendanceRate * 100) / 100,
                pattern: attendancePattern
            },
            makeUpRecommendations,
            problemWarnings,
            warningStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

