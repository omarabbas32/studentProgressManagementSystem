function getCurrentWeekDates() {
    const today = new Date();
    const currentDay = today.getDay();

    // Calculate days to subtract to get to Saturday (week start)
    // Saturday is 6 in JavaScript (0 = Sunday, 6 = Saturday)
    let daysToSubtract;
    if (currentDay === 6) {
        daysToSubtract = 0;
    } else {
        daysToSubtract = (currentDay + 1) % 7;
    }

    const saturday = new Date(today);
    saturday.setDate(today.getDate() - daysToSubtract);
    saturday.setHours(0, 0, 0, 0);

    // The week runs Saturday -> Friday (inclusive). Friday is 6 days after Saturday.
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);

    return { startDate: saturday, endDate: friday };
}

function getCurrentWeekDatesForAttendance() {
    const today = new Date();
    const currentDay = today.getDay();

    // Calculate days to subtract to get to Saturday (week start)
    let daysToSubtract = ((currentDay - 6 + 7) % 7);
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - daysToSubtract);
    saturday.setHours(0, 0, 0, 0);

    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);

    return { startDate: saturday, endDate: friday };
}

module.exports = {
    getCurrentWeekDates,
    getCurrentWeekDatesForAttendance
};

