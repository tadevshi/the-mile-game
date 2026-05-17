import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: Date | null) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  minDate?: Date;
}

export const CustomDatePicker = forwardRef<DatePicker, CustomDatePickerProps>(
  ({ value, onChange, error, placeholder = 'DD/MM/YYYY', className = '', minDate }, _ref) => {
    // Convert YYYY-MM-DD string to Date for react-datepicker
    const dateValue = value ? new Date(value + 'T00:00:00') : null;

    const handleChange = (date: Date | null) => {
      onChange(date);
    };

    // Custom input component with calendar icon
    const CustomInput = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
      ({ value, onClick, ...props }, innerRef) => (
        <div className="relative">
          <input
            ref={innerRef}
            type="text"
            value={value}
            readOnly
            onClick={onClick}
            className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-200 focus:outline-none cursor-pointer ${className}`}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
              borderColor: error ? 'var(--color-error)' : 'var(--color-border)',
              color: 'var(--color-on-background)',
            }}
            placeholder={placeholder}
            {...props}
          />
          <Calendar
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: 'var(--color-on-surface-muted)' }}
          />
        </div>
      )
    );

    CustomInput.displayName = 'CustomInput';

    return (
      <>
        <DatePicker
          selected={dateValue}
          onChange={handleChange}
          dateFormat="dd/MM/yyyy"
          placeholderText={placeholder}
          minDate={minDate}
          popperContainer={({ children }) => <div style={{ zIndex: 9999 }}>{children}</div>}
          customInput={<CustomInput />}
          wrapperClassName="w-full"
        />

        {/* Custom styles for react-datepicker */}
        <style>{`
          .react-datepicker-popper {
            z-index: 9999 !important;
          }

          .react-datepicker {
            font-family: var(--font-body, 'Montserrat', sans-serif) !important;
            background: var(--color-surface, #FFF5F7) !important;
            border: 2px solid var(--color-border, #FBCFE8) !important;
            border-radius: 1rem !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
            padding: 1rem !important;
          }

          .react-datepicker__header {
            background: transparent !important;
            border-bottom: 1px solid var(--color-border, #FBCFE8) !important;
            padding-bottom: 0.75rem !important;
          }

          .react-datepicker__current-month {
            color: var(--color-on-background, #2D1B24) !important;
            font-weight: 600 !important;
            font-size: 1rem !important;
          }

          .react-datepicker__day-name {
            color: var(--color-on-surface-muted, #7a4e68) !important;
            font-weight: 500 !important;
            font-size: 0.75rem !important;
            text-transform: uppercase !important;
          }

          .react-datepicker__navigation {
            top: 0.75rem !important;
          }

          .react-datepicker__navigation--previous,
          .react-datepicker__navigation--next {
            border-color: var(--color-primary, #DB2777) !important;
            color: var(--color-primary, #DB2777) !important;
          }

          .react-datepicker__navigation--previous:hover,
          .react-datepicker__navigation--next:hover {
            background: var(--color-secondary, #FBCFE8) !important;
            border-radius: 50% !important;
          }

          .react-datepicker__navigation-icon::before {
            border-color: var(--color-primary, #DB2777) !important;
          }

          .react-datepicker__day {
            color: var(--color-on-background, #2D1B24) !important;
            width: 2.5rem !important;
            height: 2.5rem !important;
            line-height: 2.5rem !important;
            border-radius: 0.75rem !important;
            transition: all 0.2s ease !important;
          }

          .react-datepicker__day:hover {
            background: var(--color-secondary, #FBCFE8) !important;
            color: var(--color-primary, #DB2777) !important;
          }

          .react-datepicker__day--selected,
          .react-datepicker__day--keyboard-selected {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
            font-weight: 600 !important;
          }

          .react-datepicker__day--selected:hover,
          .react-datepicker__day--keyboard-selected:hover {
            background: var(--color-accent, #DB2777) !important;
          }

          .react-datepicker__day--today {
            border: 2px solid var(--color-primary, #DB2777) !important;
            color: var(--color-primary, #DB2777) !important;
            font-weight: 600 !important;
          }

          .react-datepicker__day--outside-month {
            color: var(--color-on-surface-muted, #7a4e68) !important;
            opacity: 0.5 !important;
          }

          .react-datepicker__day--disabled {
            color: var(--color-on-surface-muted, #7a4e68) !important;
            opacity: 0.3 !important;
          }

          .react-datepicker__day--in-range,
          .react-datepicker__day--in-selecting-range {
            background: var(--color-secondary, #FBCFE8) !important;
            color: var(--color-primary, #DB2777) !important;
          }

          .react-datepicker__day--in-range:hover,
          .react-datepicker__day--in-selecting-range:hover {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
          }

          .react-datepicker__day--range-start,
          .react-datepicker__day--range-end {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
          }

          .react-datepicker__day--range-start:hover,
          .react-datepicker__day--range-end:hover {
            background: var(--color-accent, #DB2777) !important;
          }

          .react-datepicker__day--selected.react-datepicker__day--in-range,
          .react-datepicker__day--keyboard-selected.react-datepicker__day--in-range {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
          }

          .react-datepicker__month-text {
            color: var(--color-on-background, #2D1B24) !important;
            padding: 0.5rem 1rem !important;
            border-radius: 0.5rem !important;
          }

          .react-datepicker__month-text:hover {
            background: var(--color-secondary, #FBCFE8) !important;
            color: var(--color-primary, #DB2777) !important;
          }

          .react-datepicker__month-text--selected {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
          }

          .react-datepicker__year-text {
            color: var(--color-on-background, #2D1B24) !important;
            padding: 0.5rem 1rem !important;
            border-radius: 0.5rem !important;
          }

          .react-datepicker__year-text:hover {
            background: var(--color-secondary, #FBCFE8) !important;
            color: var(--color-primary, #DB2777) !important;
          }

          .react-datepicker__year-text--selected {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
          }

          .react-datepicker__time-container {
            border-top: 1px solid var(--color-border, #FBCFE8) !important;
          }

          .react-datepicker__time-box {
            background: var(--color-surface, #FFF5F7) !important;
          }

          .react-datepicker__time-list-item {
            color: var(--color-on-background, #2D1B24) !important;
          }

          .react-datepicker__time-list-item:hover {
            background: var(--color-secondary, #FBCFE8) !important;
          }

          .react-datepicker__time-list-item--selected {
            background: var(--color-primary, #DB2777) !important;
            color: white !important;
          }

          .react-datepicker__close-icon::after {
            background: var(--color-primary, #DB2777) !important;
          }

          /* Dark mode support */
          .dark .react-datepicker,
          .theme-dark .react-datepicker {
            background: var(--color-bg, #2D1B24) !important;
            border-color: var(--color-on-surface-muted, rgba(255,255,255,0.1)) !important;
          }

          .dark .react-datepicker__header,
          .theme-dark .react-datepicker__header {
            border-bottom-color: rgba(255,255,255,0.1) !important;
          }

          .dark .react-datepicker__current-month,
          .theme-dark .react-datepicker__current-month {
            color: var(--color-text, #FFF5F7) !important;
          }

          .dark .react-datepicker__day-name,
          .theme-dark .react-datepicker__day-name {
            color: rgba(255,255,255,0.6) !important;
          }

          .dark .react-datepicker__day,
          .theme-dark .react-datepicker__day {
            color: var(--color-text, #FFF5F7) !important;
          }

          .dark .react-datepicker__day:hover,
          .theme-dark .react-datepicker__day:hover {
            background: rgba(255,255,255,0.1) !important;
          }

          .dark .react-datepicker__day--today,
          .theme-dark .react-datepicker__day--today {
            border-color: var(--color-primary, #EC4899) !important;
            color: var(--color-primary, #EC4899) !important;
          }

          .dark .react-datepicker__day--outside-month,
          .theme-dark .react-datepicker__day--outside-month {
            color: rgba(255,255,255,0.4) !important;
          }

          .dark .react-datepicker__day--disabled,
          .theme-dark .react-datepicker__day--disabled {
            color: rgba(255,255,255,0.2) !important;
          }
        `}</style>
      </>
    );
  }
);

CustomDatePicker.displayName = 'CustomDatePicker';