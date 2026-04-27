# Mac Power Tools MCP

`mac-power-tools-mcp` is a macOS-focused MCP server for power-user workflows.
It started as a fork of a lightweight AppleScript MCP server, but it has since diverged into a broader tool suite that combines AppleScript-backed app automation with shell-backed system, cleanup, and bookmark management tools.

## What It Is

This server is oriented around practical Mac operator tasks:

- app and system control
- Finder, clipboard, notes, calendar, iTerm, and notifications
- Apple Shortcuts and Keyboard Maestro integration
- `launchd` inspection and lifecycle management
- safe cleanup inside `~/Library`
- bookmark inspection and reorganization for Safari, Brave, and Chrome

## Safety Model

Mutation-heavy categories are intentionally constrained:

- `library_*` destructive actions are limited to `~/Library`
- `library_*` mutations require `confirm=true`
- `bookmarks_*` mutations require `confirm=true`
- `bookmarks_*` mutations create timestamped backups before editing bookmark files
- some `launchd_*` operations may require elevated privileges depending on domain and plist location

This project favors explicit target paths, explicit folder paths, and explicit confirmation over convenience shortcuts.

## Categories

### Core macOS

- `system_*`: app launch/quit, frontmost app, dark mode, volume, battery status
- `finder_*`: selected files, Spotlight-backed search, Quick Look
- `clipboard_*`: get, set, clear clipboard
- `notifications_*`: send notifications, toggle DND shortcut
- `iterm_*`: run commands and paste clipboard into iTerm
- `shortcuts_*`: run Apple Shortcuts
- `calendar_*`: create events and list today's events
- `notes_*`: folder and note CRUD in Apple Notes
- `pages_*`: create Pages documents

### Automation

- `automation_list_shortcuts`
- `automation_run_keyboardmaestro_macro`

### Research

- `research_open_url_in_browser`
- `research_get_current_timestamp`

### launchd

- `launchd_list_services`
- `launchd_get_service`
- `launchd_print_domain`
- `launchd_kickstart`
- `launchd_bootstrap`
- `launchd_bootout`
- `launchd_validate_plist`

### Library Cleanup

- `library_find_large_app_support_dirs`
- `library_list_preferences`
- `library_move_to_trash`
- `library_reset_app_preferences`

### Bookmarks

- `bookmarks_list_bookmarks`
- `bookmarks_list_folders`
- `bookmarks_read_folder`
- `bookmarks_create_folder`
- `bookmarks_update_folder`
- `bookmarks_delete_folder`
- `bookmarks_move_folder`
- `bookmarks_read_bookmark`
- `bookmarks_create_bookmark`
- `bookmarks_update_bookmark`
- `bookmarks_delete_bookmark`
- `bookmarks_move_bookmark`
- `bookmarks_find_duplicates`
- `bookmarks_remove_duplicates`
- `bookmarks_sort_folder`

## Browser Support

Bookmark tooling is strongest for:

- `brave`
- `safari`

It also supports:

- `chrome`

Chromium-family tools use the profile-aware bookmarks JSON file. Safari tools operate on `~/Library/Safari/Bookmarks.plist`.

## Optional Integrations

- Keyboard Maestro for `automation_run_keyboardmaestro_macro`
- iTerm for `iterm_*`
- Pages for `pages_*`

## Example Use Cases

- inspect and restart a user LaunchAgent
- identify the largest `Application Support` directories before cleanup
- reset one app’s preference plist safely by moving it to Trash
- sort a Brave bookmarks folder and remove in-folder duplicates
- move a Safari bookmark from one folder to another after creating a backup
- trigger an existing Keyboard Maestro macro from MCP

## Installation

Prerequisites:

- macOS 10.15 or later
- Node.js 18 or later

Install and run:

```bash
npm install
npm run build
npm start
```

For local development:

```bash
npm run dev
```

## Development

The server entrypoint is `src/index.ts`.
The shared execution framework is `src/framework.ts`.
Tool categories live under `src/categories/`.

When adding tools:

- prefer direct APIs or shell utilities over UI scripting where possible
- return stable, machine-readable output where possible
- require explicit confirmation for destructive actions
- keep environment-specific integrations clearly labeled

## Migration From The Fork

This repository began as a fork of an AppleScript-centric MCP server. It is no longer just a thin AppleScript wrapper.

Major changes since the fork:

- rebranded from a generic AppleScript framework into a Mac power-user tool suite
- added shell-backed categories alongside AppleScript-backed ones
- expanded into `launchd`, safe Library cleanup, and bookmark management
- introduced stricter confirmation requirements around destructive operations
- updated package and server identity for the new direction

## Attribution

This project began as a fork of the original AppleScript MCP repository and has since diverged substantially in scope and product direction.
