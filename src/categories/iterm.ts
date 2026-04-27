import { ScriptCategory } from "../types/index.js";
import { escapeAppleScriptString } from "../utils/applescript.js";

/**
 * iTerm-related scripts.
 * * paste_clipboard: Pastes the clipboard to an iTerm window
 * * run: Run a command in iTerm
 */
export const itermCategory: ScriptCategory = {
  name: "iterm",
  description: "iTerm terminal operations",
  scripts: [
    {
      name: "paste_clipboard",
      description: "Paste clipboard content into iTerm",
      script: `
        tell application "iTerm"
          set w to current window
          tell w's current session to write text (the clipboard)
          activate
        end tell
      `,
    },
    {
      name: "run",
      description: "Run a command in iTerm",
      schema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Command to run in iTerm",
          },
          newWindow: {
            type: "boolean",
            description: "Whether to open in a new window (default: false)",
            default: false,
          },
        },
        required: ["command"],
      },
      script: (args) => `
        tell application "iTerm"
          ${
            args.newWindow
              ? `
            set newWindow to (create window with default profile)
            tell current session of newWindow
          `
              : `
            set w to current window
            tell w's current session
          `
          }
            write text "${escapeAppleScriptString(args.command)}"
            activate
          end tell
        end tell
      `,
    },
  ],
};
