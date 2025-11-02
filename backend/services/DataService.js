const fs = require('fs');
const path = require('path');

class DataService {
    constructor() {
        this.dataPath = path.join(__dirname, '../Data');
        this.studentsFilePath = path.join(this.dataPath, 'students.json');
        this.progressFilePath = path.join(this.dataPath, 'student_progress.json');
        this.problemsFilePath = path.join(this.dataPath, 'problems.json');
        this._ensureDataDirectory();
    }

    _ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    // Helper function to convert PascalCase to camelCase
    _convertToCamelCase(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => this._convertToCamelCase(item));
        } else if (obj !== null && typeof obj === 'object') {
            const converted = {};
            for (const key in obj) {
                const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
                converted[camelKey] = this._convertToCamelCase(obj[key]);
            }
            return converted;
        }
        return obj;
    }

    // Students JSON operations
    loadStudents() {
        try {
            if (!fs.existsSync(this.studentsFilePath)) {
                this.saveStudents([]);
                return [];
            }
            const data = fs.readFileSync(this.studentsFilePath, 'utf8');
            const parsed = JSON.parse(data);
            // Convert PascalCase to camelCase for compatibility
            return this._convertToCamelCase(parsed);
        } catch (error) {
            console.error('Error loading students:', error);
            return [];
        }
    }

    saveStudents(students) {
        try {
            fs.writeFileSync(this.studentsFilePath, JSON.stringify(students, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving students:', error);
            throw error;
        }
    }

    // Student progress JSON operations (thread-safe simulation)
    loadStudentProgress() {
        try {
            if (!fs.existsSync(this.progressFilePath)) {
                return {};
            }
            const data = fs.readFileSync(this.progressFilePath, 'utf8');
            return JSON.parse(data) || {};
        } catch (error) {
            console.error('Error loading student progress:', error);
            return {};
        }
    }

    saveStudentProgress(progress) {
        try {
            // Atomic write using temp file
            const tempFile = this.progressFilePath + '.tmp';
            fs.writeFileSync(tempFile, JSON.stringify(progress, null, 2), 'utf8');
            fs.renameSync(tempFile, this.progressFilePath);
        } catch (error) {
            console.error('Error saving student progress:', error);
            throw error;
        }
    }

    // Problems JSON operations
    loadProblems() {
        try {
            if (!fs.existsSync(this.problemsFilePath)) {
                this.saveProblems([]);
                return [];
            }
            const data = fs.readFileSync(this.problemsFilePath, 'utf8');
            return JSON.parse(data) || [];
        } catch (error) {
            console.error('Error loading problems:', error);
            return [];
        }
    }

    saveProblems(problems) {
        try {
            fs.writeFileSync(this.problemsFilePath, JSON.stringify(problems, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving problems:', error);
            throw error;
        }
    }
}

module.exports = new DataService();

