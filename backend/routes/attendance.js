const express = require('express');
const Attendance = require('../models/Attendance');
const router = express.Router();
const dataService = require('../services/DataService');
const { getCurrentWeekDatesForAttendance } = require('../utils/weekHelper');

// GET absent students for current week
router.get('/absent/current-week', (req, res) => {
    try {
        const { startDate, endDate } = getCurrentWeekDatesForAttendance();
        const students = dataService.loadStudents();

        const absentStudents = students
            .filter(s => !(s.attendances || []).some(a => {
                const weekStart = new Date(a.weekStartDate);
                weekStart.setHours(0, 0, 0, 0);
                return weekStart.getTime() === startDate.getTime() && a.isPresent;
            }))
            .map(s => ({
                studentId: s.studentId,
                name: s.name,
                number: s.number,
                parentNumber: s.parentNumber,
                group: s.group
            }));

        res.json({
            weekStart: startDate,
            weekEnd: endDate,
            absentStudents
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST record attendance
router.post('/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
        }

        const { startDate, endDate } = getCurrentWeekDatesForAttendance();

        if (!student.attendances) {
            student.attendances = [];
        }

        // Check if attendance already recorded for this week
        const existingAttendanceIndex = student.attendances.findIndex(a => {
            const weekStartDate = new Date(a.weekStartDate);
            weekStartDate.setHours(0, 0, 0, 0);
            return weekStartDate.getTime() === startDate.getTime();
        });

        const attendance = req.body;

        if (existingAttendanceIndex !== -1) {
            // Update existing attendance
            student.attendances[existingAttendanceIndex].isPresent = attendance.isPresent;
            student.attendances[existingAttendanceIndex].notes = attendance.notes || '';
        } else {
            // Create new attendance record
            attendance.studentId = studentId;
            attendance.attendanceId = student.attendances.length > 0
                ? Math.max(...student.attendances.map(a => a.attendanceId || 0)) + 1
                : 1;
            attendance.weekStartDate = startDate.toISOString();
            attendance.weekEndDate = endDate.toISOString();
            attendance.notes = attendance.notes || '';
            student.attendances.push(attendance);
        }

        // Mark absent students if needed (Friday check)
        const today = new Date();
        if (today.getDay() === 5 && today >= endDate) { // Friday and week has passed
            students.forEach(s => {
                const hasAttendance = (s.attendances || []).some(a => {
                    const weekStart = new Date(a.weekStartDate);
                    weekStart.setHours(0, 0, 0, 0);
                    return weekStart.getTime() === startDate.getTime() && a.isPresent;
                });

                if (!hasAttendance) {
                    if (!s.attendances) {
                        s.attendances = [];
                    }
                    const absentAttendance = {
                        studentId: s.studentId,
                        attendanceId: s.attendances.length > 0
                            ? Math.max(...s.attendances.map(a => a.attendanceId || 0)) + 1
                            : 1,
                        weekStartDate: startDate.toISOString(),
                        weekEndDate: endDate.toISOString(),
                        isPresent: false,
                        notes: 'Absent automatically (no attendance recorded)'
                    };
                    s.attendances.push(absentAttendance);
                }
            });
        }

        dataService.saveStudents(students);

        const finalAttendance = student.attendances.find(a => {
            const weekStart = new Date(a.weekStartDate);
            weekStart.setHours(0, 0, 0, 0);
            return weekStart.getTime() === startDate.getTime();
        });

        res.json(finalAttendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET student attendance
router.get('/:studentId', (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const students = dataService.loadStudents();
        const student = students.find(s => s.studentId === studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const attendance = (student.attendances || [])
            .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
            .map(a => {
                const start = new Date(a.weekStartDate);
                const end = new Date(a.weekEndDate);
                return {
                    attendanceId: a.attendanceId,
                    week: `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')} - ${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`,
                    isPresent: a.isPresent,
                    notes: a.notes
                };
            });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /attendance/date/:date
router.get('/date/:date', (req, res) => {
    const date = req.params.date; // يجب أن يكون في شكل YYYY-MM-DD
    const students = dataService.loadStudents();


    const attendanceToday = students.map(student => {
        const attendance = (student.attendances || []).find(a => a.date === date);
        if (attendance) {
            return {
                studentId: student.studentId,
                name: student.name,
                group: student.group,
                notes: attendance.notes,
                isPresent: attendance.isPresent
            };
        } else {
            return {
                studentId: student.studentId,
                name: student.name,
                group: student.group,
                notes: "",
                isPresent: false
            };
        }
    });

    res.json(attendanceToday);
});
// PUT /attendance/:studentId/:date
router.put('/:studentId/:date', (req, res) => {
    const studentId = parseInt(req.params.studentId);
    const date = req.params.date;
    const { note } = req.body;

    const students = dataService.loadStudents();
    const student = students.find(s => s.studentId === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let attendance = (student.attendances || []).find(a => a.date === date);

    if (!attendance) {
        // لو مفيش حضور لليوم، نضيف واحد جديد
        attendance = new Attendance({
            studentId,
            date,
            isPresent: true,
            notes: note
        });
        student.attendances.push(attendance);
    } else {
        // بس نعدل الملاحظة
        attendance.notes = note;
    }

    dataService.saveStudents(students);
    res.json(attendance);
});


module.exports = router;

