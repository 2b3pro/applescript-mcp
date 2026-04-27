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
import { ScriptCategory } from "./types/index.js";

const server = new AppleScriptFramework({
  name: "mac-power-tools",
  version: "2.0.1",
  debug: true,
});

const availableCategories: Record<string, ScriptCategory> = {
  system: systemCategory,
  calendar: calendarCategory,
  finder: finderCategory,
  clipboard: clipboardCategory,
  notifications: notificationsCategory,
  iterm: itermCategory,
  shortcuts: shortcutsCategory,
  notes: notesCategory,
  pages: pagesCategory,
  automation: automationCategory,
  research: researchCategory,
  launchd: launchdCategory,
  library: libraryCategory,
  bookmarks: bookmarksCategory,
};

function getEnabledCategories(): ScriptCategory[] {
  const categoriesEnv = process.env.CATEGORIES?.trim();
  const allCategories = Object.values(availableCategories);

  if (!categoriesEnv || categoriesEnv.toLowerCase() === "all") {
    return allCategories;
  }

  const requestedNames = categoriesEnv
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (requestedNames.length === 0) {
    return allCategories;
  }

  const unknownNames = requestedNames.filter(
    (name) => !(name in availableCategories),
  );
  if (unknownNames.length > 0) {
    console.error(
      `Unknown categories in CATEGORIES: ${unknownNames.join(", ")}`,
    );
    console.error(
      `Available categories: ${Object.keys(availableCategories).join(", ")}`,
    );
  }

  const enabled = requestedNames
    .filter((name) => name in availableCategories)
    .map((name) => availableCategories[name]);

  if (enabled.length === 0) {
    console.error(
      "CATEGORIES did not match any valid category names. Falling back to all categories.",
    );
    return allCategories;
  }

  return enabled;
}

for (const category of getEnabledCategories()) {
  server.addCategory(category);
}

// Start the server
server.run().catch(console.error);
