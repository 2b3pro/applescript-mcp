import { ScriptCategory } from "../types/index.js";

export const launchdCategory: ScriptCategory = {
  name: "launchd",
  description: "launchd agent and daemon management",
  scripts: [
    {
      name: "list_services",
      description:
        "List loaded launchd services. Optionally filter by label substring.",
      schema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "Optional label substring filter",
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
            launchctl list | {
              if [ -n "${FILTER_TEXT:-}" ]; then
                grep -i -- "${FILTER_TEXT}" || true
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
      name: "get_service",
      description:
        "Inspect one launchd service using launchctl print for a given domain and label.",
      schema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "launchd domain such as gui/501, user/501, or system",
          },
          label: {
            type: "string",
            description: "Service label",
          },
        },
        required: ["domain", "label"],
      },
      script: (args) => ({
        kind: "shell",
        command: "launchctl",
        args: [
          "print",
          `${String(args.domain)}/${String(args.label)}`,
        ],
      }),
    },
    {
      name: "print_domain",
      description:
        "Inspect a launchd domain such as gui/501, user/501, or system.",
      schema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "launchd domain to print",
          },
        },
        required: ["domain"],
      },
      script: (args) => ({
        kind: "shell",
        command: "launchctl",
        args: ["print", String(args.domain)],
      }),
    },
    {
      name: "kickstart",
      description:
        "Start or restart a launchd service by domain and label. Use kill=true to stop and relaunch.",
      schema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "launchd domain such as gui/501, user/501, or system",
          },
          label: {
            type: "string",
            description: "Service label",
          },
          kill: {
            type: "boolean",
            description: "Use -k to kill any running instance before restart",
            default: false,
          },
        },
        required: ["domain", "label"],
      },
      script: (args) => ({
        kind: "shell",
        command: "launchctl",
        args: [
          "kickstart",
          ...(args.kill ? ["-k"] : []),
          `${String(args.domain)}/${String(args.label)}`,
        ],
      }),
    },
    {
      name: "bootstrap",
      description:
        "Load a LaunchAgent or LaunchDaemon plist into a launchd domain.",
      schema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "launchd domain such as gui/501, user/501, or system",
          },
          plistPath: {
            type: "string",
            description: "Absolute path to the plist file",
          },
        },
        required: ["domain", "plistPath"],
      },
      script: (args) => ({
        kind: "shell",
        command: "launchctl",
        args: ["bootstrap", String(args.domain), String(args.plistPath)],
      }),
    },
    {
      name: "bootout",
      description:
        "Unload a launchd service or plist from a launchd domain. Provide either label or plistPath.",
      schema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "launchd domain such as gui/501, user/501, or system",
          },
          label: {
            type: "string",
            description: "Service label to unload",
          },
          plistPath: {
            type: "string",
            description: "Absolute plist path to unload",
          },
        },
        required: ["domain"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            if [ -n "${SERVICE_LABEL:-}" ]; then
              exec launchctl bootout "$SERVICE_DOMAIN/$SERVICE_LABEL"
            fi

            if [ -n "${PLIST_PATH:-}" ]; then
              exec launchctl bootout "$SERVICE_DOMAIN" "$PLIST_PATH"
            fi

            echo "Error: provide either label or plistPath." >&2
            exit 1
          `,
        ],
        env: {
          SERVICE_DOMAIN: String(args.domain),
          SERVICE_LABEL:
            typeof args.label === "string" ? String(args.label) : "",
          PLIST_PATH:
            typeof args.plistPath === "string" ? String(args.plistPath) : "",
        },
      }),
    },
    {
      name: "validate_plist",
      description:
        "Validate a launchd plist with plutil and print key launchd fields.",
      schema: {
        type: "object",
        properties: {
          plistPath: {
            type: "string",
            description: "Absolute path to the plist file",
          },
        },
        required: ["plistPath"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/bin/sh",
        args: [
          "-lc",
          `
            set -eu
            plutil -lint "$PLIST_PATH"
            echo "---"
            plutil -p "$PLIST_PATH" | grep -E '"Label"|Program"|ProgramArguments"|RunAtLoad"|StartInterval"|KeepAlive' || true
          `,
        ],
        env: {
          PLIST_PATH: String(args.plistPath),
        },
      }),
    },
  ],
};
