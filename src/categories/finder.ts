// src/categories/finder.ts
import { ScriptCategory } from "../types/index.js";
import { escapeAppleScriptString } from "../utils/applescript.js";

/**
 * Finder-related scripts.
 * * get_selected_files: Get currently selected files in Finder
 * * search_files: Search for files by name
 * * quick_look_file: Preview a file using Quick Look
 *
 */
export const finderCategory: ScriptCategory = {
  name: "finder",
  description: "Finder and file operations",
  scripts: [
    {
      name: "get_selected_files",
      description: "Get currently selected files in Finder",
      script: `
        tell application "Finder"
          try
            set selectedItems to selection
            if selectedItems is {} then
              return "No items selected"
            end if

            set itemPaths to ""
            repeat with theItem in selectedItems
              set itemPaths to itemPaths & (POSIX path of (theItem as alias)) & linefeed
            end repeat

            return itemPaths
          on error errMsg
            return "Failed to get selected files: " & errMsg
          end try
        end tell
      `,
    },
    {
      name: "search_files",
      description: "Search for files by name",
      schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term",
          },
          location: {
            type: "string",
            description: "Search location (default: home folder)",
            default: "~",
          },
        },
        required: ["query"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            search_path="\${SEARCH_PATH:-$HOME}"
            mdfind -onlyin "$search_path" "$SEARCH_QUERY"
          `,
        ],
        env: {
          SEARCH_PATH: typeof args.location === "string" ? args.location : "",
          SEARCH_QUERY: String(args.query),
        },
      }),
    },
    {
      name: "quick_look_file",
      description: "Preview a file using Quick Look",
      schema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to preview",
          },
        },
        required: ["path"],
      },
      script: (args) => `
        try
          set filePath to POSIX file "${escapeAppleScriptString(args.path)}"
          tell application "Finder"
            activate
            select filePath
            tell application "System Events"
              -- Press Space to trigger Quick Look
              delay 0.5 -- Small delay to ensure Finder is ready
              key code 49 -- Space key
            end tell
          end tell
          return "Quick Look preview opened for ${args.path}"
        on error errMsg
          return "Failed to open Quick Look: " & errMsg
        end try
      `,
    },
  ],
};
