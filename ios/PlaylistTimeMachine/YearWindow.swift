import Foundation

struct YearLimits: Codable, Equatable {
    let min: Int
    let max: Int
}

enum YearWindow {
    static let minimumGraduationYear = 1955
    static let yearsBefore = 5
    static let yearsAfter = 5

    static func currentYear(now: Date = Date()) -> Int {
        Calendar(identifier: .gregorian).component(.year, from: now)
    }

    static func limits(now: Date = Date(), chartMin: Int? = nil, chartMax: Int? = nil) -> YearLimits {
        let nowYear = currentYear(now: now)
        var minYear = minimumGraduationYear
        var maxYear = nowYear
        if let chartMin {
            minYear = max(minYear, chartMin - yearsBefore)
        }
        if let chartMax {
            maxYear = min(maxYear, chartMax + yearsAfter)
        }
        if maxYear < minYear { maxYear = minYear }
        return YearLimits(min: minYear, max: maxYear)
    }

    static func isValid(_ year: Int, limits: YearLimits) -> Bool {
        year >= limits.min && year <= limits.max
    }

    static func message(_ year: Int, limits: YearLimits, nowYear: Int = currentYear()) -> String {
        if year > nowYear {
            return "Use the year you graduated high school. \(year) hasn’t happened yet."
        }
        if year > limits.max || year < limits.min {
            return "The chart library doesn’t cover the years around \(year). Use a year from \(limits.min) through \(limits.max)."
        }
        return "Enter the year you graduated high school, from \(limits.min) through \(limits.max)."
    }

    static func emptyChartMessage(_ year: Int) -> String {
        "The chart library has no No. 1s for the years around \(year)."
    }

    static func window(_ graduationYear: Int) -> (start: Int, end: Int) {
        (graduationYear - yearsBefore, graduationYear + yearsAfter)
    }

    static func defaultTitle(_ graduationYear: Int) -> String {
        "Class of \(graduationYear)"
    }

    static func description(start: Int, end: Int) -> String {
        "Number one hits from \(start) through \(end), the popular songs of the time. Made at playlisttimemachine.com"
    }

    static func clipTitle(_ value: String) -> String {
        let cleaned = String(value.unicodeScalars.compactMap { scalar -> Character? in
            guard scalar.value > 0x1f else { return nil }
            return Character(scalar)
        })
        let collapsed = cleaned.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        return String(collapsed.prefix(80))
    }

    static func cleanTitle(_ value: String, graduationYear: Int) -> String {
        let clipped = clipTitle(value)
        return clipped.isEmpty ? defaultTitle(graduationYear) : clipped
    }

    static func typedYear(_ text: String) -> Int? {
        guard text.count == 4, text.allSatisfy({ $0.isASCII && $0.isNumber }), let year = Int(text) else { return nil }
        return year
    }
}
