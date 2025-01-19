import { ScriptCategory } from "../types/index.js";

/**
 * Shortcuts-related scripts.
 * * run_shortcut: Run a shortcut with optional input
 */
export const shortcutsCategory: ScriptCategory = {
  name: "shortcuts",
  description: "Shortcuts operations",
  scripts: [
    {
      name: "run_shortcut",
      description: "Run a shortcut with optional input. Uses Shortcuts Events to run in background without opening the app.",
      schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the shortcut to run",
          },
          input: {
            type: "string",
            description: "Optional input to provide to the shortcut",
          },
        },
        required: ["name"],
      },
      script: (args) => `
        try
          tell application "Shortcuts Events"
            ${args.input ? 
              `run shortcut "${args.name}" with input "${args.input}"` :
              `run shortcut "${args.name}"`
            }
          end tell
          return "Shortcut '${args.name}' executed successfully"
        on error errMsg
          return "Failed to run shortcut: " & errMsg
        end try
      `,
    },
  ],
};
