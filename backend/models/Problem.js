class Problem {
    constructor(data = {}) {
        this.problemId = data.problemId || null;
        this.book = data.book || '';
        this.page = data.page || null;
        this.numberOfProblem = data.numberOfProblem || null;
        this.level = data.level !== undefined ? data.level : null;
        this.chapter = data.chapter !== undefined ? data.chapter : null;
        this.assignedDate = data.assignedDate || null;
        this.completedDate = data.completedDate || null;
        this.isCompleted = data.isCompleted || false;
    }
}

module.exports = Problem;

