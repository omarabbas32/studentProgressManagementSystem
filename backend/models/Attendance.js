class Attendance {
  constructor(data = {}) {
    this.attendanceId = data.attendanceId || null;
    this.studentId = data.studentId || null;
    this.weekStartDate = data.weekStartDate || null;
    this.weekEndDate = data.weekEndDate || null;
    this.isPresent = data.isPresent || false;
    this.notes = data.notes ?? "";
    
    this.date = data.date || null;
  }
}

module.exports = Attendance;
