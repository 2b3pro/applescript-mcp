# Changelog

## 2.0.1 - 2026-04-27

- Added `CATEGORIES` env filtering so MCP clients can enable only selected tool groups
- Documented `mcpServers` configuration and category selection in the README
- Added `notes_read_folder` and updated `notes_find_by_tag` to prefer matching Notes folder or Smart Folder views before plaintext tag search
- Fixed TypeScript template literal breakage caused by unescaped shell parameter expansions
- Hardened command output handling in the framework by normalizing `execFile` output to strings

## 2.0.0 - 2026-04-27

- Rebranded the project as `mac-power-tools-mcp`
- Repositioned the server as a Mac power-user MCP suite rather than a thin AppleScript framework
- Added shell-backed execution support alongside AppleScript-backed tools
- Added `automation`, `launchd`, `library`, `research`, and `bookmarks` categories
- Added safe-cleanup workflows for `~/Library`
- Added bookmark inspection, cleanup, and LCRUD support for Safari, Brave, and Chrome
- Updated documentation to reflect the post-fork product direction

## 1.3.0 - 2025-01-18

- Added Pages functionality

## 1.2.0

- Added Apple Shortcuts functionality

## 1.1.0

- Added Apple Notes functionality

## 1.0.1

- Updated `@modelcontextprotocol/sdk` to `1.1.1`
