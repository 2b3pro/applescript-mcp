import { ScriptCategory } from "../types/index.js";

export const researchCategory: ScriptCategory = {
  name: "research",
  description: "Research and capture helpers",
  scripts: [
    {
      name: "open_url_in_browser",
      description: "Open a URL in the default browser",
      schema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to open",
          },
        },
        required: ["url"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            open "$TARGET_URL"
            printf "Opened %s in the default browser\\n" "$TARGET_URL"
          `,
        ],
        env: {
          TARGET_URL: String(args.url),
        },
      }),
    },
    {
      name: "get_current_timestamp",
      description: "Return the current local timestamp",
      script: {
        kind: "shell",
        command: "date",
        args: ["+%Y-%m-%d %H:%M:%S %Z (UTC%z)"],
      },
    },
  ],
};
