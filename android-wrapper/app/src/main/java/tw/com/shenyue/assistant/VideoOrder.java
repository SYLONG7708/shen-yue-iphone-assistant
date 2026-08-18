package tw.com.shenyue.assistant;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Stable newest-first ordering for camera files whose filesystem time is missing or stale. */
final class VideoOrder {
    private static final long MIN_REASONABLE_TIME_MS = 946684800000L; // 2000-01-01 UTC
    private static final long MAX_REASONABLE_TIME_MS = 4133980799000L; // 2100-12-31 UTC
    private static final Pattern FOUR_DIGIT_DATE_TIME = Pattern.compile(
            "(?<!\\d)(20\\d{2})[-_./]?(0[1-9]|1[0-2])[-_./]?([0-2]\\d|3[01])(?:[T _.-]?([01]\\d|2[0-3])[-_.:]?([0-5]\\d)[-_.:]?([0-5]\\d))?(?!\\d)"
    );
    private static final Pattern TWO_DIGIT_DATE_TIME = Pattern.compile(
            "(?<!\\d)(2\\d)(0[1-9]|1[0-2])([0-2]\\d|3[01])(?:[_T .-]?([01]\\d|2[0-3])([0-5]\\d)([0-5]\\d))(?!\\d)"
    );
    private static final Pattern EPOCH_MILLIS = Pattern.compile("(?<!\\d)(1[0-9]{12})(?!\\d)");
    private static final Pattern EPOCH_SECONDS = Pattern.compile("(?<!\\d)(1[0-9]{9})(?!\\d)");

    private VideoOrder() {}

    static long sortTimestamp(String fileName, String path, long storageTimestamp) {
        long nameTimestamp = timestampFromText(fileName);
        if (nameTimestamp == 0L) nameTimestamp = timestampFromText(path);
        if (nameTimestamp > 0L) return nameTimestamp;
        return isReasonableTimestamp(storageTimestamp) ? storageTimestamp : 0L;
    }

    static String sortBasis(String fileName, String path, long storageTimestamp) {
        if (timestampFromText(fileName) > 0L || timestampFromText(path) > 0L) return "filename-time";
        if (isReasonableTimestamp(storageTimestamp)) return "storage-time";
        return "natural-sequence";
    }

    static long timestampFromText(String value) {
        String text = value == null ? "" : value;
        long parsed = parseDateTime(text, FOUR_DIGIT_DATE_TIME, false);
        if (parsed > 0L) return parsed;
        parsed = parseDateTime(text, TWO_DIGIT_DATE_TIME, true);
        if (parsed > 0L) return parsed;

        Matcher millis = EPOCH_MILLIS.matcher(text);
        while (millis.find()) {
            try {
                long candidate = Long.parseLong(millis.group(1));
                if (isReasonableTimestamp(candidate)) return candidate;
            } catch (NumberFormatException ignored) {
                // Continue looking for another candidate.
            }
        }

        Matcher seconds = EPOCH_SECONDS.matcher(text);
        while (seconds.find()) {
            try {
                long candidate = Long.parseLong(seconds.group(1)) * 1000L;
                if (isReasonableTimestamp(candidate)) return candidate;
            } catch (NumberFormatException ignored) {
                // Continue looking for another candidate.
            }
        }
        return 0L;
    }

    static int compareNewestFirst(
            long leftTimestamp,
            String leftName,
            String leftPath,
            long rightTimestamp,
            String rightName,
            String rightPath
    ) {
        int timestamp = Long.compare(rightTimestamp, leftTimestamp);
        if (timestamp != 0) return timestamp;
        int name = naturalCompare(rightName, leftName);
        if (name != 0) return name;
        return naturalCompare(rightPath, leftPath);
    }

    static int naturalCompare(String leftValue, String rightValue) {
        String left = leftValue == null ? "" : leftValue;
        String right = rightValue == null ? "" : rightValue;
        int leftIndex = 0;
        int rightIndex = 0;

        while (leftIndex < left.length() && rightIndex < right.length()) {
            char leftChar = left.charAt(leftIndex);
            char rightChar = right.charAt(rightIndex);
            if (Character.isDigit(leftChar) && Character.isDigit(rightChar)) {
                int leftEnd = leftIndex;
                int rightEnd = rightIndex;
                while (leftEnd < left.length() && Character.isDigit(left.charAt(leftEnd))) leftEnd += 1;
                while (rightEnd < right.length() && Character.isDigit(right.charAt(rightEnd))) rightEnd += 1;

                int leftSignificant = leftIndex;
                int rightSignificant = rightIndex;
                while (leftSignificant < leftEnd - 1 && left.charAt(leftSignificant) == '0') leftSignificant += 1;
                while (rightSignificant < rightEnd - 1 && right.charAt(rightSignificant) == '0') rightSignificant += 1;

                int leftDigits = leftEnd - leftSignificant;
                int rightDigits = rightEnd - rightSignificant;
                if (leftDigits != rightDigits) return Integer.compare(leftDigits, rightDigits);
                for (int index = 0; index < leftDigits; index += 1) {
                    char leftDigit = left.charAt(leftSignificant + index);
                    char rightDigit = right.charAt(rightSignificant + index);
                    if (leftDigit != rightDigit) return Character.compare(leftDigit, rightDigit);
                }
                int runLength = Integer.compare(leftEnd - leftIndex, rightEnd - rightIndex);
                if (runLength != 0) return runLength;
                leftIndex = leftEnd;
                rightIndex = rightEnd;
                continue;
            }

            char foldedLeft = Character.toLowerCase(leftChar);
            char foldedRight = Character.toLowerCase(rightChar);
            if (foldedLeft != foldedRight) return Character.compare(foldedLeft, foldedRight);
            leftIndex += 1;
            rightIndex += 1;
        }
        return Integer.compare(left.length() - leftIndex, right.length() - rightIndex);
    }

    private static long parseDateTime(String text, Pattern pattern, boolean twoDigitYear) {
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            try {
                int year = Integer.parseInt(matcher.group(1));
                if (twoDigitYear) year += 2000;
                int month = Integer.parseInt(matcher.group(2));
                int day = Integer.parseInt(matcher.group(3));
                int hour = parseOptional(matcher.group(4));
                int minute = parseOptional(matcher.group(5));
                int second = parseOptional(matcher.group(6));
                Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.US);
                calendar.clear();
                calendar.setLenient(false);
                calendar.set(year, month - 1, day, hour, minute, second);
                long candidate = calendar.getTimeInMillis();
                if (isReasonableTimestamp(candidate)) return candidate;
            } catch (Exception ignored) {
                // Invalid date-shaped number; continue with the next candidate.
            }
        }
        return 0L;
    }

    private static int parseOptional(String value) {
        return value == null || value.length() == 0 ? 0 : Integer.parseInt(value);
    }

    private static boolean isReasonableTimestamp(long value) {
        return value >= MIN_REASONABLE_TIME_MS && value <= MAX_REASONABLE_TIME_MS;
    }
}
