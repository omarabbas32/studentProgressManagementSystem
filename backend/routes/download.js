const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const dataService = require('../services/DataService');
const { getCurrentWeekDates } = require('../utils/weekHelper');

// GET empty problems Excel
router.get('/empty-problems-excel/:chapter/:level', async (req, res) => {
    try {
        const chapter = parseInt(req.params.chapter);
        const level = parseInt(req.params.level);
        const students = dataService.loadStudents();

        const studentsWithEmpty = students.filter(s =>
            !(s.assignedProblems || []).some(p =>
                p.chapter === chapter && p.level === level
            )
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Students');

        // Headers
        worksheet.getRow(1).values = ['الكود', 'الاسم', 'الرقم', 'رقم ولي الأمر', 'المجموعة'];

        // Data rows
        studentsWithEmpty.forEach((student, index) => {
            const row = worksheet.getRow(index + 2);
            row.values = [
                student.studentId,
                student.name,
                student.number,
                student.parentNumber,
                student.group
            ];
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=EmptyProblems_Chapter${chapter}_Level${level}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET students who completed a specific level
router.get('/completed-level-excel/:chapter/:level', async (req, res) => {
    try {
        const chapter = parseInt(req.params.chapter);
        const level = parseInt(req.params.level);
        const students = dataService.loadStudents();

        // Filter students who have completed this level
        // completedLevels format: "chapter-level" e.g. "0-1"
        const levelKey = `${chapter}-${level}`;

        const completedStudents = students.filter(s =>
            (s.completedLevels || []).includes(levelKey)
        );

        if (completedStudents.length === 0) {
            return res.status(404).json({ error: 'No students found who completed this level.' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Completed_Level');

        // Headers
        worksheet.getRow(1).values = ['الكود', 'الاسم', 'الرقم', 'رقم ولي الأمر', 'المجموعة'];

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Data rows
        completedStudents.forEach((student, index) => {
            const row = worksheet.getRow(index + 2);
            row.values = [
                student.studentId,
                student.name,
                student.number,
                student.parentNumber,
                student.group
            ];
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Completed_Chapter${chapter}_Level${level}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET absent students Excel for current week
router.get('/absent/current-week', async (req, res) => {
    try {
        const { startDate, endDate } = getCurrentWeekDates();
        const students = dataService.loadStudents();

        const absentStudents = students
            .filter(s => !(s.attendances || []).some(a => {
                const weekStart = new Date(a.weekStartDate);
                weekStart.setHours(0, 0, 0, 0);
                return weekStart >= startDate && weekStart <= endDate && a.isPresent;
            }))
            .map(s => ({
                studentId: s.studentId,
                name: s.name,
                number: s.number,
                parentNumber: s.parentNumber,
                group: s.group
            }));

        if (absentStudents.length === 0) {
            return res.status(404).json({ error: 'No students were absent this week.' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Absent_Students_Week_${formatDate(startDate, 'MMdd')}`);

        // Headers
        worksheet.getRow(1).values = [
            'Student ID',
            'Name',
            'Phone Number',
            'Parent Number',
            'Group',
            'Week',
            'Status'
        ];

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add data
        absentStudents.forEach((student, index) => {
            const row = worksheet.getRow(index + 2);
            row.values = [
                student.studentId,
                student.name,
                student.number,
                student.parentNumber,
                student.group,
                `${formatDate(startDate, 'MM/dd')} - ${formatDate(endDate, 'MM/dd')}`,
                'Absent'
            ];
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        const fileName = `Absent_Students_Week_${formatDate(startDate, 'MMdd')}_to_${formatDate(endDate, 'MMdd')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET absent students Excel for specific day
router.get('/absent/current-week/:day', async (req, res) => {
    try {
        const day = parseInt(req.params.day);
        const { startDate, endDate } = getCurrentWeekDates();
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const targetDate = new Date(currentYear, currentMonth - 1, day);

        if (targetDate < startDate || targetDate > endDate) {
            return res.status(400).json({
                error: `Date ${day} is not within the current week (${formatDate(startDate, 'MM/dd')} to ${formatDate(endDate, 'MM/dd')})`
            });
        }

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

        if (absentStudents.length === 0) {
            return res.status(404).json({ error: 'No students were absent this week' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Absent_Students_${formatDate(startDate, 'MMdd')}`);

        // Headers
        worksheet.getRow(1).values = [
            'Student ID',
            'Name',
            'Phone Number',
            'Parent Number',
            'Group',
            'Week',
            'Status'
        ];

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add data
        absentStudents.forEach((student, index) => {
            const row = worksheet.getRow(index + 2);
            row.values = [
                student.studentId,
                student.name,
                student.number,
                student.parentNumber,
                student.group,
                `${formatDate(startDate, 'MM/dd')} - ${formatDate(endDate, 'MM/dd')}`,
                'Absent'
            ];
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        const fileName = `Absent_Students_${formatDate(startDate, 'MMdd')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to format dates
function formatDate(date, format) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();

    if (format === 'MM/dd') {
        return `${month}/${day}`;
    } else if (format === 'MMdd') {
        return `${month}${day}`;
    }
    return `${month}/${day}/${year}`;
}

module.exports = router;

