import { ScriptCategory } from "../types/index.js";
import { escapeAppleScriptString } from "../utils/applescript.js";

/**
 * Calendar-related scripts.
 * * add: adds a new event to Calendar
 * * list: List events for today
 */
export const calendarCategory: ScriptCategory = {
  name: "calendar",
  description: "Calendar operations",
  scripts: [
    {
      name: "add",
      description: "Add a new event to Calendar",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title",
          },
          startDate: {
            type: "string",
            description: "Start date and time (YYYY-MM-DD HH:MM:SS)",
          },
          endDate: {
            type: "string",
            description: "End date and time (YYYY-MM-DD HH:MM:SS)",
          },
          calendar: {
            type: "string",
            description: "Calendar name (optional)",
            default: "Calendar",
          },
        },
        required: ["title", "startDate", "endDate"],
      },
      script: (args) => `
        tell application "Calendar"
          set theStartDate to current date
          set year of theStartDate to ${args.startDate.slice(0, 4)}
          set month of theStartDate to ${Number(args.startDate.slice(5, 7))}
          set day of theStartDate to ${Number(args.startDate.slice(8, 10))}
          set hours of theStartDate to ${Number(args.startDate.slice(11, 13))}
          set minutes of theStartDate to ${Number(args.startDate.slice(14, 16))}
          set seconds of theStartDate to ${Number(args.startDate.slice(17, 19))}

          set theEndDate to current date
          set year of theEndDate to ${args.endDate.slice(0, 4)}
          set month of theEndDate to ${Number(args.endDate.slice(5, 7))}
          set day of theEndDate to ${Number(args.endDate.slice(8, 10))}
          set hours of theEndDate to ${Number(args.endDate.slice(11, 13))}
          set minutes of theEndDate to ${Number(args.endDate.slice(14, 16))}
          set seconds of theEndDate to ${Number(args.endDate.slice(17, 19))}

          tell calendar "${escapeAppleScriptString(args.calendar || "Calendar")}"
            make new event with properties {summary:"${escapeAppleScriptString(args.title)}", start date:theStartDate, end date:theEndDate}
            return "Event '${escapeAppleScriptString(args.title)}' created successfully"
          end tell
        end tell
      `,
    },
    {
      name: "list",
      description: "List all events for today",
      script: `
      tell application "Calendar"
          set todayStart to (current date)
          set time of todayStart to 0
          set todayEnd to todayStart + 1 * days
          set eventList to {}
          repeat with calendarAccount in calendars
              set eventList to eventList & (every event of calendarAccount whose start date is greater than or equal to todayStart and start date is less than todayEnd)
          end repeat
          set output to ""
          repeat with anEvent in eventList
              set eventStartDate to start date of anEvent
              set eventEndDate to end date of anEvent

              -- Format the time parts
              set startHours to hours of eventStartDate
              set startMinutes to minutes of eventStartDate
              set endHours to hours of eventEndDate
              set endMinutes to minutes of eventEndDate

              set output to output & "Event: " & summary of anEvent & "\n"
              set output to output & "Start: " & startHours & ":" & text -2 thru -1 of ("0" & startMinutes) & "\n"
              set output to output & "End: " & endHours & ":" & text -2 thru -1 of ("0" & endMinutes) & "\n"
              set output to output & "-------------------\n"
          end repeat
          return output
      end tell
      `,
    },
  ],
};
