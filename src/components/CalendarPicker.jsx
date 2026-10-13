import { useEffect, useMemo, useState } from "react";

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

function CalendarPicker({
  selectedDate,
  viewMode,
  onSelectDate,
  onSelectMonth,
}) {
  const initialDate = parseDate(selectedDate);

  const [isOpen, setIsOpen] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] =
    useState(false);

  const [viewYear, setViewYear] = useState(
    initialDate.getFullYear()
  );

  const [viewMonth, setViewMonth] = useState(
    initialDate.getMonth()
  );

  const [yearInput, setYearInput] = useState(
    String(initialDate.getFullYear())
  );

  useEffect(() => {
    const date = parseDate(selectedDate);

    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setYearInput(String(date.getFullYear()));
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);

    /*
     * JS:
     * Pazar = 0
     * Pazartesi = 1
     *
     * Biz takvimi Pazartesi ile başlatıyoruz.
     */
    const startOffset =
      firstDay.getDay() === 0
        ? 6
        : firstDay.getDay() - 1;

    const daysInCurrentMonth = new Date(
      viewYear,
      viewMonth + 1,
      0
    ).getDate();

    const daysInPreviousMonth = new Date(
      viewYear,
      viewMonth,
      0
    ).getDate();

    const days = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const day =
        daysInPreviousMonth - i;

      const date = new Date(
        viewYear,
        viewMonth - 1,
        day
      );

      days.push({
        date,
        day,
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= daysInCurrentMonth;
      day++
    ) {
      days.push({
        date: new Date(
          viewYear,
          viewMonth,
          day
        ),
        day,
        currentMonth: true,
      });
    }

    let nextDay = 1;

    while (days.length < 42) {
      days.push({
        date: new Date(
          viewYear,
          viewMonth + 1,
          nextDay
        ),
        day: nextDay,
        currentMonth: false,
      });

      nextDay++;
    }

    return days;
  }, [viewYear, viewMonth]);

  const changeMonth = (amount) => {
    const newDate = new Date(
      viewYear,
      viewMonth + amount,
      1
    );

    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth());
    setYearInput(
      String(newDate.getFullYear())
    );
  };

  const selectDay = (date) => {
    onSelectDate(formatDateForStorage(date));

    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());

    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  const selectToday = () => {
    const today = new Date();

    onSelectDate(formatDateForStorage(today));

    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());

    setYearInput(
      String(today.getFullYear())
    );

    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  const selectWholeMonth = () => {
    onSelectMonth(viewYear, viewMonth);

    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  const applyMonthYear = () => {
    const parsedYear = Number(yearInput);

    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 1
    ) {
      return;
    }

    setViewYear(parsedYear);
    setShowMonthYearPicker(false);
  };

  const selected = parseDate(selectedDate);

  const displayText =
    viewMode === "month"
      ? `${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`
      : formatLongDate(selected);

  return (
    <div className="calendar-picker">
      <button
        type="button"
        className="calendar-trigger"
        onClick={() => {
          setIsOpen((previous) => !previous);
          setShowMonthYearPicker(false);
        }}
      >
        <div className="calendar-trigger-left">
          <span className="calendar-symbol">
            ▣
          </span>

          <div>
            <small>
              {viewMode === "month"
                ? "Seçilen ay"
                : "Seçilen tarih"}
            </small>

            <strong>{displayText}</strong>
          </div>
        </div>

        <span
          className={`calendar-chevron ${
            isOpen ? "open" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="calendar-panel">
          <div className="calendar-navigation">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
            >
              ‹
            </button>

            <button
              type="button"
              className="calendar-month-title"
              onClick={() =>
                setShowMonthYearPicker(
                  (previous) => !previous
                )
              }
            >
              {MONTHS[viewMonth]} {viewYear}
              <span>⌄</span>
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
            >
              ›
            </button>
          </div>

          {showMonthYearPicker && (
            <div className="month-year-picker">
              <div className="month-picker-grid">
                {MONTHS.map((month, index) => (
                  <button
                    type="button"
                    key={month}
                    className={
                      index === viewMonth
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setViewMonth(index)
                    }
                  >
                    {month.substring(0, 3)}
                  </button>
                ))}
              </div>

              <div className="year-picker-row">
                <button
                  type="button"
                  onClick={() => {
                    const year =
                      Number(yearInput) - 1;

                    setYearInput(
                      String(year)
                    );
                    setViewYear(year);
                  }}
                >
                  −
                </button>

                <input
                  type="number"
                  value={yearInput}
                  onChange={(e) =>
                    setYearInput(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyMonthYear();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    const year =
                      Number(yearInput) + 1;

                    setYearInput(
                      String(year)
                    );
                    setViewYear(year);
                  }}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="apply-year-button"
                onClick={applyMonthYear}
              >
                Uygula
              </button>
            </div>
          )}

          {!showMonthYearPicker && (
            <>
              <div className="calendar-weekdays">
                {DAYS.map((day) => (
                  <span key={day}>
                    {day}
                  </span>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarDays.map(
                  (item, index) => {
                    const isSelected =
                      viewMode === "day" &&
                      sameDay(
                        item.date,
                        selected
                      );

                    const isToday =
                      sameDay(
                        item.date,
                        new Date()
                      );

                    return (
                      <button
                        type="button"
                        key={index}
                        className={[
                          "calendar-day",
                          !item.currentMonth
                            ? "outside"
                            : "",
                          isSelected
                            ? "selected"
                            : "",
                          isToday
                            ? "today"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          selectDay(item.date)
                        }
                      >
                        {item.day}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="calendar-actions">
                <button
                  type="button"
                  onClick={selectToday}
                >
                  Bugün
                </button>

                <button
                  type="button"
                  className={
                    viewMode === "month"
                      ? "active"
                      : ""
                  }
                  onClick={selectWholeMonth}
                >
                  Tüm Ay
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function parseDate(dateString) {
  if (!dateString) {
    return new Date();
  }

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDateForStorage(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sameDay(first, second) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function formatLongDate(date) {
  const text = new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }
  ).format(date);

  return (
    text.charAt(0).toLocaleUpperCase(
      "tr-TR"
    ) + text.slice(1)
  );
}

export default CalendarPicker;