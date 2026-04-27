import { ScriptCategory } from "../types/index.js";

export const libraryCategory: ScriptCategory = {
  name: "library",
  description: "Safe cleanup tools for user Library data",
  scripts: [
    {
      name: "find_large_app_support_dirs",
      description:
        "List the largest directories in ~/Library/Application Support.",
      schema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of directories to return",
            default: 25,
          },
        },
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            limit="\${LIMIT:-25}"
            base="$HOME/Library/Application Support"
            if [ ! -d "$base" ]; then
              echo "Application Support directory not found: $base"
              exit 1
            fi
            find "$base" -mindepth 1 -maxdepth 1 -type d -print0 |
              xargs -0 du -sk 2>/dev/null |
              sort -nr |
              head -n "$limit"
          `,
        ],
        env: {
          LIMIT: String(args.limit || 25),
        },
      }),
    },
    {
      name: "list_preferences",
      description:
        "List preference plist files in ~/Library/Preferences, optionally filtered.",
      schema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "Optional substring filter for plist filenames",
          },
        },
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            base="$HOME/Library/Preferences"
            if [ ! -d "$base" ]; then
              echo "Preferences directory not found: $base"
              exit 1
            fi
            find "$base" -maxdepth 1 -type f -name '*.plist' | sort | {
              if [ -n "\${FILTER_TEXT:-}" ]; then
                grep -i -- "\${FILTER_TEXT}" || true
              else
                cat
              fi
            }
          `,
        ],
        env: {
          FILTER_TEXT:
            typeof args.filter === "string" ? String(args.filter) : "",
        },
      }),
    },
    {
      name: "move_to_trash",
      description:
        "Move a path under the user Library to ~/.Trash. Requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute path under ~/Library to move to Trash",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the move",
            default: false,
          },
        },
        required: ["path", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            if [ "\${CONFIRM_MOVE:-false}" != "true" ]; then
              echo "Refusing to move path to Trash without confirm=true."
              exit 1
            fi

            target="$TARGET_PATH"
            case "$target" in
              "$HOME"/Library/*) ;;
              *)
                echo "Refusing to move path outside ~/Library: $target"
                exit 1
                ;;
            esac

            if [ ! -e "$target" ]; then
              echo "Path does not exist: $target"
              exit 1
            fi

            trash_dir="$HOME/.Trash"
            base_name="$(basename "$target")"
            dest="$trash_dir/$base_name"
            if [ -e "$dest" ]; then
              dest="$trash_dir/\${base_name}.$(date +%Y%m%d-%H%M%S)"
            fi

            mv "$target" "$dest"
            printf "Moved to Trash: %s\\n" "$dest"
          `,
        ],
        env: {
          TARGET_PATH: String(args.path),
          CONFIRM_MOVE: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "reset_app_preferences",
      description:
        "Move an app preference plist from ~/Library/Preferences to Trash. Requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "Preference domain, for example com.apple.finder",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the reset",
            default: false,
          },
        },
        required: ["domain", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            if [ "\${CONFIRM_RESET:-false}" != "true" ]; then
              echo "Refusing to reset preferences without confirm=true."
              exit 1
            fi

            plist="$HOME/Library/Preferences/$PREF_DOMAIN.plist"
            if [ ! -e "$plist" ]; then
              echo "Preference file not found: $plist"
              exit 1
            fi

            trash_dir="$HOME/.Trash"
            base_name="$(basename "$plist")"
            dest="$trash_dir/$base_name"
            if [ -e "$dest" ]; then
              dest="$trash_dir/\${base_name}.$(date +%Y%m%d-%H%M%S)"
            fi

            mv "$plist" "$dest"
            printf "Moved preference file to Trash: %s\\n" "$dest"
          `,
        ],
        env: {
          PREF_DOMAIN: String(args.domain),
          CONFIRM_RESET: String(Boolean(args.confirm)),
        },
      }),
    },
  ],
};
