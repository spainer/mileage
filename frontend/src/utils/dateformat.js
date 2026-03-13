const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
})

export function formatDate(date) {
    if (!date) return ""
    return DATE_FORMATTER.format(date)
}

export function dateToApi(date) {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${year}-${month}-${day}`
}

export const DATEPICKER_FORMAT = "dd.mm.yy"