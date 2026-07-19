"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar w-fit rounded-xl bg-white p-3 text-gray-900 dark:bg-slate-950 dark:text-white",
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white p-0 text-gray-700 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white p-0 text-gray-700 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
          defaultClassNames.button_next
        ),
        month_caption: cn("flex h-8 w-full items-center justify-center px-10", defaultClassNames.month_caption),
        dropdowns: cn("flex h-8 w-full items-center justify-center gap-1.5 text-sm font-semibold", defaultClassNames.dropdowns),
        dropdown_root: cn("relative rounded-lg", defaultClassNames.dropdown_root),
        dropdown: cn("absolute inset-0 cursor-pointer opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-semibold",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-lg text-sm [&>svg]:h-3.5 [&>svg]:w-3.5",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn("flex-1 select-none rounded-lg text-center text-xs font-medium text-gray-500 dark:text-slate-400", defaultClassNames.weekday),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-8 select-none", defaultClassNames.week_number_header),
        week_number: cn("flex w-8 items-center justify-center text-xs text-gray-500 dark:text-slate-400", defaultClassNames.week_number),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-lg"
            : "[&:first-child[data-selected=true]_button]:rounded-l-lg",
          "[&:last-child[data-selected=true]_button]:rounded-r-lg",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-lg bg-blue-100 dark:bg-blue-950/40", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-blue-50 dark:bg-blue-950/20", defaultClassNames.range_middle),
        range_end: cn("rounded-r-lg bg-blue-100 dark:bg-blue-950/40", defaultClassNames.range_end),
        today: cn("rounded-lg bg-gray-100 dark:bg-slate-800", defaultClassNames.today),
        outside: cn("text-gray-400 dark:text-slate-600", defaultClassNames.outside),
        disabled: cn("text-gray-300 opacity-50 dark:text-slate-700", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(rootClassName)} {...rootProps} />
        ),
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("h-4 w-4", chevronClassName)} {...chevronProps} />
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("h-4 w-4", chevronClassName)} {...chevronProps} />
          }

          return <ChevronDownIcon className={cn("h-4 w-4", chevronClassName)} {...chevronProps} />
        },
        DayButton: (dayButtonProps) => (
          <CalendarDayButton locale={locale} {...dayButtonProps} />
        ),
        WeekNumber: ({ children, ...weekNumberProps }) => (
          <td {...weekNumberProps}>
            <div className="flex h-8 w-8 items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus()
    }
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative z-10 flex aspect-square h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-sm font-medium text-gray-900 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 dark:text-white dark:hover:bg-slate-800",
        "data-[selected-single=true]:bg-blue-600 data-[selected-single=true]:text-white",
        "data-[range-start=true]:rounded-l-lg data-[range-start=true]:bg-blue-600 data-[range-start=true]:text-white",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-blue-100 data-[range-middle=true]:text-blue-900 dark:data-[range-middle=true]:bg-blue-950/50 dark:data-[range-middle=true]:text-blue-100",
        "data-[range-end=true]:rounded-r-lg data-[range-end=true]:bg-blue-600 data-[range-end=true]:text-white",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }