const normalizeDeletedScheduleIds = (values) => [...new Set(
    (Array.isArray(values) ? values : [])
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0)
)];

module.exports = { normalizeDeletedScheduleIds };
