
export const getChinaTimestamp = (): string => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Shanghai",
        year: "2-digit", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(p => [p.type, p.value]));
    // en-US format is MM/DD/YY, so we reorder to YY-MM-DD.
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

