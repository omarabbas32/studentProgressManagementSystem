class Student {
    constructor(data = {}) {
        this.studentId = data.studentId;
        this.name = data.name;
        this.number = data.number;
        this.parentNumber = data.parentNumber;
        this.group = data.group;

        // Keep old structure for backward compatibility
        this.assignedProblems = data.assignedProblems || [];
        this.attendances = data.attendances || [];

        // New structure for problem-solving system
        this.remainingProblems = data.remainingProblems || [];
        this.solvedProblems = data.solvedProblems || [];
        this.completedLevels = data.completedLevels || [];

        // Level progression fields
        this.chapterLevels = data.chapterLevels || {}; // { "Ch1": "Yellow", "Ch2": "Red" }
    }
}

module.exports = Student;
