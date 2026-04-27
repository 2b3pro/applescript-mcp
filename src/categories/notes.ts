import { ScriptCategory } from "../types/index.js";
import { escapeAppleScriptString } from "../utils/applescript.js";

/**
 * Notes-related scripts.
 * * create: Create a new note
 * * read: Get content of a note
 * * update: Update an existing note
 * * delete: Delete a note
 * * list: List all notes in a folder
 * * list_folders: List all folders
 * * create_folder: Create a new folder
 * * delete_folder: Delete a folder
 * * show: Show a note in the UI
 * * move: Move a note to a different folder
 * * read_folder: Read notes from a folder or Smart Folder by name
 * * find_by_tag: Find notes whose body contains a #tag marker
 */
export const notesCategory: ScriptCategory = {
  name: "notes",
  description: "Apple Notes operations",
  scripts: [
    {
      name: "create",
      description: "Create a new note in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Note title",
          },
          content: {
            type: "string",
            description: "Note content",
          },
          folder: {
            type: "string",
            description: "Folder name (optional)",
            default: "Notes",
          },
        },
        required: ["title", "content"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            tell folder "${args.folder || "Notes"}"
              make new note with properties {name:"${args.title}", body:"${args.content}"}
              return "Note '${args.title}' created successfully"
            end tell
          end tell
        end tell
      `,
    },
    {
      name: "read",
      description: "Get content of a note in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Note title",
          },
          folder: {
            type: "string",
            description: "Folder name (optional)",
            default: "Notes",
          },
        },
        required: ["title"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            tell folder "${args.folder || "Notes"}"
              set matchingNotes to (every note whose name = "${args.title}")
              if length of matchingNotes is 0 then
                return "Note '${args.title}' not found"
              end if
              return body of (item 1 of matchingNotes)
            end tell
          end tell
        end tell
      `,
    },
    {
      name: "update",
      description: "Update an existing note in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Note title",
          },
          content: {
            type: "string",
            description: "New note content",
          },
          folder: {
            type: "string",
            description: "Folder name (optional)",
            default: "Notes",
          },
        },
        required: ["title", "content"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            tell folder "${args.folder || "Notes"}"
              set matchingNotes to (every note whose name = "${args.title}")
              if length of matchingNotes is 0 then
                return "Note '${args.title}' not found"
              end if
              set theNote to item 1 of matchingNotes
              set body of theNote to "${args.content}"
              return "Note '${args.title}' updated successfully"
            end tell
          end tell
        end tell
      `,
    },
    {
      name: "delete",
      description: "Delete a note in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Note title",
          },
          folder: {
            type: "string",
            description: "Folder name (optional)",
            default: "Notes",
          },
        },
        required: ["title"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            tell folder "${args.folder || "Notes"}"
              set matchingNotes to (every note whose name = "${args.title}")
              if length of matchingNotes is 0 then
                return "Note '${args.title}' not found"
              end if
              delete item 1 of matchingNotes
              return "Note '${args.title}' deleted successfully"
            end tell
          end tell
        end tell
      `,
    },
    {
      name: "list",
      description: "List all notes in a folder in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          folder: {
            type: "string",
            description: "Folder name (optional)",
            default: "Notes",
          },
        },
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            tell folder "${args.folder || "Notes"}"
              set noteList to ""
              repeat with theNote in notes
                set noteList to noteList & name of theNote & linefeed
              end repeat
              if noteList is "" then
                return "No notes found in folder '${args.folder || "Notes"}'"
              end if
              return noteList
            end tell
          end tell
        end tell
      `,
    },
    {
      name: "list_folders",
      description: "List all folders in Notes in Apple Notes app",
      script: `
        tell application "Notes"
          tell account "iCloud"
            set folderList to ""
            repeat with theFolder in folders
              set folderList to folderList & name of theFolder & linefeed
            end repeat
            if folderList is "" then
              return "No folders found"
            end if
            return folderList
          end tell
        end tell
      `,
    },
    {
      name: "create_folder",
      description: "Create a new folder",
      schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Folder name",
          },
        },
        required: ["name"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            try
              if exists folder "${args.name}" then
                return "Folder '${args.name}' already exists"
              end if
              make new folder with properties {name:"${args.name}"}
              return "Folder '${args.name}' created successfully"
            on error errMsg
              return "Failed to create folder: " & errMsg
            end try
          end tell
        end tell
      `,
    },
    {
      name: "delete_folder",
      description: "Delete a folder in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Folder name",
          },
        },
        required: ["name"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            try
              if not exists folder "${args.name}" then
                return "Folder '${args.name}' not found"
              end if
              if "${args.name}" is in {"Notes"} then
                return "Cannot delete default folder '${args.name}'"
              end if
              delete folder "${args.name}"
              return "Folder '${args.name}' deleted successfully"
            on error errMsg
              return "Failed to delete folder: " & errMsg
            end try
          end tell
        end tell
      `,
    },
    {
      name: "show",
      description: "Show a note in the UI in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Note title",
          },
          folder: {
            type: "string",
            description: "Folder name (optional)",
            default: "Notes",
          },
        },
        required: ["title"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            tell folder "${args.folder || "Notes"}"
              set matchingNotes to (every note whose name = "${args.title}")
              if length of matchingNotes is 0 then
                return "Note '${args.title}' not found"
              end if
              set theNote to item 1 of matchingNotes
              show theNote
              activate
              return "Note '${args.title}' shown in UI"
            end tell
          end tell
        end tell
      `,
    },
    {
      name: "read_folder",
      description:
        "List notes in a folder view by name. This can also work for Smart Folders if Notes resolves them as folders.",
      schema: {
        type: "object",
        properties: {
          folder: {
            type: "string",
            description: "Folder or Smart Folder name",
          },
        },
        required: ["folder"],
      },
      script: (args) => {
        const escapedFolder = escapeAppleScriptString(args.folder);
        return `
          tell application "Notes"
            tell account "iCloud"
              try
                tell folder "${escapedFolder}"
                  set noteList to ""
                  repeat with theNote in notes
                    set noteList to noteList & name of theNote & linefeed
                  end repeat
                  if noteList is "" then
                    return "No notes found in folder '${escapedFolder}'"
                  end if
                  return noteList
                end tell
              on error errMsg
                return "Failed to read folder: " & errMsg
              end try
            end tell
          end tell
        `;
      },
    },
    {
      name: "find_by_tag",
      description:
        "Find notes for a tag by first checking a matching folder or Smart Folder name, then falling back to plaintext #tag search",
      schema: {
        type: "object",
        properties: {
          tag: {
            type: "string",
            description: "Tag name, with or without the leading #",
          },
          folder: {
            type: "string",
            description: "Optional folder name to restrict the search",
          },
        },
        required: ["tag"],
      },
      script: (args) => {
        const rawTag = String(args.tag || "").trim();
        const normalizedTag = rawTag.startsWith("#") ? rawTag : `#${rawTag}`;
        const escapedTag = escapeAppleScriptString(normalizedTag);
        const folderCandidate = rawTag.replace(/^#/, "").trim();
        const escapedFolderCandidate = escapeAppleScriptString(folderCandidate);

        if (typeof args.folder === "string" && args.folder.trim().length > 0) {
          const escapedFolder = escapeAppleScriptString(args.folder.trim());
          return `
            tell application "Notes"
              tell account "iCloud"
                try
                  tell folder "${escapedFolder}"
                    set matchingNotes to every note whose plaintext contains "${escapedTag}"
                    if length of matchingNotes is 0 then
                      return "No notes found with tag '${escapedTag}' in folder '${escapedFolder}'"
                    end if

                    set noteList to ""
                    repeat with theNote in matchingNotes
                      set noteList to noteList & name of theNote & linefeed
                    end repeat
                    return noteList
                  end tell
                on error errMsg
                  return "Failed to search notes by tag: " & errMsg
                end try
              end tell
            end tell
          `;
        }

        return `
          tell application "Notes"
            tell account "iCloud"
              try
                if "${escapedFolderCandidate}" is not "" then
                  try
                    tell folder "${escapedFolderCandidate}"
                      set folderNoteList to ""
                      repeat with theNote in notes
                        set folderNoteList to folderNoteList & name of theNote & linefeed
                      end repeat
                      if folderNoteList is not "" then
                        return folderNoteList
                      end if
                    end tell
                  end try
                end if

                set noteList to ""
                repeat with theFolder in folders
                  repeat with theNote in notes of theFolder
                    if plaintext of theNote contains "${escapedTag}" then
                      set noteList to noteList & name of theNote & " (" & name of theFolder & ")" & linefeed
                    end if
                  end repeat
                end repeat

                if noteList is "" then
                  return "No notes found with tag '${escapedTag}'"
                end if

                return noteList
              on error errMsg
                return "Failed to search notes by tag: " & errMsg
              end try
            end tell
          end tell
        `;
      },
    },
    {
      name: "move",
      description: "Move a note to a different folder in Apple Notes app",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Note title",
          },
          from_folder: {
            type: "string",
            description: "Source folder name (optional)",
            default: "Notes",
          },
          to_folder: {
            type: "string",
            description: "Destination folder name",
          },
        },
        required: ["title", "to_folder"],
      },
      script: (args) => `
        tell application "Notes"
          tell account "iCloud"
            try
              set destFolder to folder "${args.to_folder}"
            on error
              return "Destination folder '${args.to_folder}' not found"
            end try
            
            try
              tell folder "${args.from_folder || "Notes"}"
                set matchingNotes to (every note whose name = "${args.title}")
                if length of matchingNotes is 0 then
                  return "Note '${args.title}' not found"
                end if
                set theNote to item 1 of matchingNotes
                move theNote to destFolder
                return "Note '${args.title}' moved to '${args.to_folder}' successfully"
              end tell
            on error errMsg
              return "Failed to move note: " & errMsg
            end try
          end tell
        end tell
      `,
    },
  ],
};
