import { ScriptCategory } from "../types/index.js";
import { escapeAppleScriptString } from "../utils/applescript.js";

export const automationCategory: ScriptCategory = {
  name: "automation",
  description: "Power-user automation integrations",
  scripts: [
    {
      name: "list_shortcuts",
      description: "List available Apple Shortcuts",
      script: `
        tell application "Shortcuts Events"
          set shortcutNames to name of every shortcut
          set AppleScript's text item delimiters to linefeed
          return shortcutNames as string
        end tell
      `,
    },
    {
      name: "run_keyboardmaestro_macro",
      description: "Run a Keyboard Maestro macro by exact name",
      schema: {
        type: "object",
        properties: {
          macroName: {
            type: "string",
            description: "Keyboard Maestro macro name",
          },
        },
        required: ["macroName"],
      },
      script: (args) => `
        try
          tell application "Keyboard Maestro Engine"
            do script "${escapeAppleScriptString(args.macroName)}"
          end tell
          return "Keyboard Maestro macro '${escapeAppleScriptString(args.macroName)}' executed successfully"
        on error errMsg
          return "Failed to run Keyboard Maestro macro: " & errMsg
        end try
      `,
    },
  ],
};
