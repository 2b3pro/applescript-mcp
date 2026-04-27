import { AppleScriptFramework } from "./framework.js";
import { systemCategory } from "./categories/system.js";
import { calendarCategory } from "./categories/calendar.js";
import { finderCategory } from "./categories/finder.js";
import { clipboardCategory } from "./categories/clipboard.js";
import { notificationsCategory } from "./categories/notifications.js";
import { itermCategory } from "./categories/iterm.js";
import { shortcutsCategory } from "./categories/shortcuts.js";
import { notesCategory } from "./categories/notes.js";
import { pagesCategory } from "./categories/pages.js";
import { automationCategory } from "./categories/automation.js";
import { researchCategory } from "./categories/research.js";
import { launchdCategory } from "./categories/launchd.js";
import { libraryCategory } from "./categories/library.js";
import { bookmarksCategory } from "./categories/bookmarks.js";

const server = new AppleScriptFramework({
  name: "mac-power-tools",
  version: "2.0.0",
  debug: true,
});

// Add all categories
server.addCategory(systemCategory);
server.addCategory(calendarCategory);
server.addCategory(finderCategory);
server.addCategory(clipboardCategory);
server.addCategory(notificationsCategory);
server.addCategory(itermCategory);
server.addCategory(shortcutsCategory);
server.addCategory(notesCategory);
server.addCategory(pagesCategory);
server.addCategory(automationCategory);
server.addCategory(researchCategory);
server.addCategory(launchdCategory);
server.addCategory(libraryCategory);
server.addCategory(bookmarksCategory);

// Start the server
server.run().catch(console.error);
