import { ScriptCategory } from "../types/index.js";

const bookmarkManagerScript = String.raw`
import copy
import json
import os
import plistlib
import shutil
from datetime import datetime
from typing import Optional


HOME = os.path.expanduser("~")


def resolve_browser_path(browser: str, profile: Optional[str] = None) -> str:
    browser = browser.lower()
    if browser == "safari":
        return os.path.join(HOME, "Library", "Safari", "Bookmarks.plist")
    if browser == "brave":
        selected_profile = profile or "Default"
        return os.path.join(
            HOME,
            "Library",
            "Application Support",
            "BraveSoftware",
            "Brave-Browser",
            selected_profile,
            "Bookmarks",
        )
    if browser == "chrome":
        selected_profile = profile or "Default"
        return os.path.join(
            HOME,
            "Library",
            "Application Support",
            "Google",
            "Chrome",
            selected_profile,
            "Bookmarks",
        )
    raise ValueError(f"Unsupported browser: {browser}")


def backup_file(path: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = f"{path}.bak.{timestamp}"
    shutil.copy2(path, backup_path)
    return backup_path


def normalize_url(url: str) -> str:
    return (url or "").strip().rstrip("/")


def ensure_confirm(confirm: bool):
    if not confirm:
        raise ValueError("confirm=true is required")


def split_folder_path(folder: str):
    return [part for part in (folder or "").split("/") if part]


def safari_node_name(node):
    title = node.get("Title", "")
    node_type = node.get("WebBookmarkType")
    if title:
        return title
    if node_type == "WebBookmarkTypeList":
        return "root"
    return ""


def chromium_folder_display_path(folder_path: str) -> str:
    return folder_path or ""


def extract_chromium_bookmarks(node, folder_path="", output=None):
    if output is None:
        output = []

    node_type = node.get("type")
    name = node.get("name", "")
    current_path = folder_path
    if node_type == "folder":
        current_path = f"{folder_path}/{name}" if folder_path and name else (name or folder_path)
        for child in node.get("children", []):
            extract_chromium_bookmarks(child, current_path, output)
    elif node_type == "url":
        output.append(
            {
                "name": name,
                "url": node.get("url", ""),
                "folder": folder_path or "",
            }
        )
    return output


def iter_safari_nodes(node, folder_path="", output=None):
    if output is None:
        output = []

    node_type = node.get("WebBookmarkType")
    title = node.get("Title", "")
    children = node.get("Children", [])

    if node_type == "WebBookmarkTypeList":
        current_path = f"{folder_path}/{title}" if folder_path and title else (title or folder_path)
        for child in children:
            iter_safari_nodes(child, current_path, output)
    elif node_type == "WebBookmarkTypeLeaf":
        output.append(
            {
                "name": title,
                "url": node.get("URLString", ""),
                "folder": folder_path or "",
            }
        )
    return output


def list_chromium_folders(raw):
    folders = []

    def walk(node, folder_path=""):
        if node.get("type") != "folder":
            return
        current_path = f"{folder_path}/{node.get('name', '')}" if folder_path and node.get("name", "") else (node.get("name", "") or folder_path)
        folders.append(current_path)
        for child in node.get("children", []):
            if child.get("type") == "folder":
                walk(child, current_path)

    for root_name, root in raw.get("roots", {}).items():
        if isinstance(root, dict):
            synthetic = copy.deepcopy(root)
            synthetic["name"] = root_name
            walk(synthetic)
    return [folder for folder in folders if folder]


def list_safari_folders(raw):
    folders = []

    def walk(node, folder_path=""):
        if node.get("WebBookmarkType") != "WebBookmarkTypeList":
            return
        name = node.get("Title", "")
        current_path = f"{folder_path}/{name}" if folder_path and name else (name or folder_path)
        if current_path:
            folders.append(current_path)
        for child in node.get("Children", []):
            if child.get("WebBookmarkType") == "WebBookmarkTypeList":
                walk(child, current_path)

    walk(raw)
    return folders


def load_bookmarks(browser: str, profile: Optional[str] = None):
    path = resolve_browser_path(browser, profile)
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    if browser.lower() == "safari":
        with open(path, "rb") as handle:
            raw = plistlib.load(handle)
        bookmarks = iter_safari_nodes(raw)
        folders = list_safari_folders(raw)
        return path, raw, bookmarks, folders

    with open(path, "r", encoding="utf-8") as handle:
        raw = json.load(handle)
    bookmarks = []
    for root_name, root_node in raw.get("roots", {}).items():
        if isinstance(root_node, dict):
            synthetic = copy.deepcopy(root_node)
            synthetic["name"] = root_name
            extract_chromium_bookmarks(synthetic, "", bookmarks)
    folders = list_chromium_folders(raw)
    return path, raw, bookmarks, folders


def save_bookmarks(browser: str, path: str, raw):
    if browser.lower() == "safari":
        with open(path, "wb") as handle:
            plistlib.dump(raw, handle)
        return

    with open(path, "w", encoding="utf-8") as handle:
        json.dump(raw, handle, indent=2, ensure_ascii=False)


def output_json(data):
    print(json.dumps(data, indent=2, ensure_ascii=False))


def find_chromium_folder(raw, folder: str):
    parts = split_folder_path(folder)
    if not parts:
        raise ValueError("Folder path is required")

    roots = raw.get("roots", {})
    root_name = parts[0]
    if root_name not in roots:
        raise ValueError(f"Folder root not found: {folder}")

    parent = None
    node = roots[root_name]
    current_path = root_name
    for part in parts[1:]:
        parent = node
        next_node = None
        for child in node.get("children", []):
            if child.get("type") == "folder" and child.get("name", "") == part:
                next_node = child
                break
        if next_node is None:
            raise ValueError(f"Folder not found: {folder}")
        node = next_node
        current_path = f"{current_path}/{part}"

    return parent, node, current_path


def find_safari_folder(raw, folder: str):
    parts = split_folder_path(folder)
    if not parts:
        raise ValueError("Folder path is required")

    parent = None
    node = raw
    consumed = []
    for part in parts:
        next_node = None
        for child in node.get("Children", []):
            if child.get("WebBookmarkType") == "WebBookmarkTypeList" and child.get("Title", "") == part:
                next_node = child
                break
        if next_node is None:
            raise ValueError(f"Folder not found: {folder}")
        parent = node
        node = next_node
        consumed.append(part)
    return parent, node, "/".join(consumed)


def make_chromium_folder(name: str):
    return {
        "type": "folder",
        "name": name,
        "children": [],
        "date_added": "0",
        "date_modified": "0",
    }


def make_chromium_bookmark(name: str, url: str):
    return {
        "type": "url",
        "name": name,
        "url": url,
        "date_added": "0",
    }


def make_safari_folder(name: str):
    return {
        "Title": name,
        "WebBookmarkType": "WebBookmarkTypeList",
        "Children": [],
    }


def make_safari_bookmark(name: str, url: str):
    return {
        "Title": name,
        "URLString": url,
        "WebBookmarkType": "WebBookmarkTypeLeaf",
        "URIDictionary": {"title": name},
    }


def list_bookmarks(browser: str, profile: Optional[str], folder_filter: Optional[str], limit: int):
    path, _, bookmarks, _ = load_bookmarks(browser, profile)
    items = bookmarks
    if folder_filter:
        items = [item for item in items if folder_filter.lower() in item["folder"].lower()]
    output_json(
        {
            "browser": browser,
            "path": path,
            "count": len(items),
            "items": items[:limit],
        }
    )


def list_folders(browser: str, profile: Optional[str], limit: int):
    path, _, _, folders = load_bookmarks(browser, profile)
    output_json(
        {
            "browser": browser,
            "path": path,
            "count": len(folders),
            "items": folders[:limit],
        }
    )


def read_folder(browser: str, profile: Optional[str], folder: str):
    path, raw, bookmarks, _ = load_bookmarks(browser, profile)
    if browser.lower() == "safari":
        _, node, resolved = find_safari_folder(raw, folder)
        children = node.get("Children", [])
        folder_names = [
            child.get("Title", "")
            for child in children
            if child.get("WebBookmarkType") == "WebBookmarkTypeList"
        ]
        bookmark_items = [
            {
                "name": child.get("Title", ""),
                "url": child.get("URLString", ""),
            }
            for child in children
            if child.get("WebBookmarkType") == "WebBookmarkTypeLeaf"
        ]
    else:
        _, node, resolved = find_chromium_folder(raw, folder)
        children = node.get("children", [])
        folder_names = [
            child.get("name", "")
            for child in children
            if child.get("type") == "folder"
        ]
        bookmark_items = [
            {
                "name": child.get("name", ""),
                "url": child.get("url", ""),
            }
            for child in children
            if child.get("type") == "url"
        ]

    output_json(
        {
            "browser": browser,
            "path": path,
            "folder": resolved,
            "subfolders": folder_names,
            "bookmarks": bookmark_items,
            "bookmark_count": len(bookmark_items),
            "subfolder_count": len(folder_names),
        }
    )


def find_duplicates(browser: str, profile: Optional[str]):
    path, _, bookmarks, _ = load_bookmarks(browser, profile)
    groups = {}
    for item in bookmarks:
        key = (
            item["folder"].strip().lower(),
            normalize_url(item["url"]).lower(),
            item["name"].strip().lower(),
        )
        groups.setdefault(key, []).append(item)

    duplicates = [
        {"name": group[0]["name"], "url": group[0]["url"], "items": group}
        for group in groups.values()
        if len(group) > 1
    ]
    output_json(
        {
            "browser": browser,
            "path": path,
            "duplicate_group_count": len(duplicates),
            "duplicates": duplicates,
        }
    )


def locate_bookmark_in_safari(raw, folder: str, name: str, url: str):
    _, folder_node, resolved = find_safari_folder(raw, folder)
    for index, child in enumerate(folder_node.get("Children", [])):
        if child.get("WebBookmarkType") != "WebBookmarkTypeLeaf":
            continue
        if child.get("Title", "") == name and normalize_url(child.get("URLString", "")) == normalize_url(url):
            return folder_node, index, child, resolved
    raise ValueError(f"Bookmark not found in folder: {folder}")


def locate_bookmark_in_chromium(raw, folder: str, name: str, url: str):
    _, folder_node, resolved = find_chromium_folder(raw, folder)
    for index, child in enumerate(folder_node.get("children", [])):
        if child.get("type") != "url":
            continue
        if child.get("name", "") == name and normalize_url(child.get("url", "")) == normalize_url(url):
            return folder_node, index, child, resolved
    raise ValueError(f"Bookmark not found in folder: {folder}")


def create_folder(browser: str, profile: Optional[str], parent_folder: str, name: str, confirm: bool):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        _, parent, resolved = find_safari_folder(raw, parent_folder)
        for child in parent.get("Children", []):
            if child.get("WebBookmarkType") == "WebBookmarkTypeList" and child.get("Title", "") == name:
                raise ValueError(f"Folder already exists: {parent_folder}/{name}")
        parent.setdefault("Children", []).append(make_safari_folder(name))
    else:
        _, parent, resolved = find_chromium_folder(raw, parent_folder)
        for child in parent.get("children", []):
            if child.get("type") == "folder" and child.get("name", "") == name:
                raise ValueError(f"Folder already exists: {parent_folder}/{name}")
        parent.setdefault("children", []).append(make_chromium_folder(name))

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "created_folder": f"{resolved}/{name}" if resolved else name,
        }
    )


def update_folder(browser: str, profile: Optional[str], folder: str, new_name: str, confirm: bool):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        parent, node, resolved = find_safari_folder(raw, folder)
        if parent is None:
            raise ValueError("Cannot rename the Safari root folder")
        node["Title"] = new_name
    else:
        parent, node, resolved = find_chromium_folder(raw, folder)
        if parent is None:
            raise ValueError("Cannot rename a Chromium root folder")
        node["name"] = new_name

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "updated_folder": resolved,
            "new_name": new_name,
        }
    )


def delete_folder(browser: str, profile: Optional[str], folder: str, confirm: bool):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        parent, node, resolved = find_safari_folder(raw, folder)
        if parent is None:
            raise ValueError("Cannot delete the Safari root folder")
        parent["Children"] = [child for child in parent.get("Children", []) if child is not node]
    else:
        parent, node, resolved = find_chromium_folder(raw, folder)
        if parent is None:
            raise ValueError("Cannot delete a Chromium root folder")
        parent["children"] = [child for child in parent.get("children", []) if child is not node]

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "deleted_folder": resolved,
        }
    )


def move_folder(browser: str, profile: Optional[str], folder: str, destination_folder: str, confirm: bool):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        source_parent, node, resolved = find_safari_folder(raw, folder)
        if source_parent is None:
            raise ValueError("Cannot move the Safari root folder")
        _, destination, destination_resolved = find_safari_folder(raw, destination_folder)
        source_parent["Children"] = [child for child in source_parent.get("Children", []) if child is not node]
        destination.setdefault("Children", []).append(node)
    else:
        source_parent, node, resolved = find_chromium_folder(raw, folder)
        if source_parent is None:
            raise ValueError("Cannot move a Chromium root folder")
        _, destination, destination_resolved = find_chromium_folder(raw, destination_folder)
        source_parent["children"] = [child for child in source_parent.get("children", []) if child is not node]
        destination.setdefault("children", []).append(node)

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "moved_folder": resolved,
            "destination_folder": destination_resolved,
        }
    )


def read_bookmark(browser: str, profile: Optional[str], folder: str, name: str, url: str):
    path, raw, _, _ = load_bookmarks(browser, profile)
    if browser.lower() == "safari":
        _, _, node, resolved = locate_bookmark_in_safari(raw, folder, name, url)
        bookmark = {"name": node.get("Title", ""), "url": node.get("URLString", ""), "folder": resolved}
    else:
        _, _, node, resolved = locate_bookmark_in_chromium(raw, folder, name, url)
        bookmark = {"name": node.get("name", ""), "url": node.get("url", ""), "folder": resolved}
    output_json({"browser": browser, "path": path, "bookmark": bookmark})


def create_bookmark(browser: str, profile: Optional[str], folder: str, name: str, url: str, confirm: bool):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        _, folder_node, resolved = find_safari_folder(raw, folder)
        for child in folder_node.get("Children", []):
            if child.get("WebBookmarkType") == "WebBookmarkTypeLeaf" and child.get("Title", "") == name and normalize_url(child.get("URLString", "")) == normalize_url(url):
                raise ValueError("Bookmark already exists")
        folder_node.setdefault("Children", []).append(make_safari_bookmark(name, url))
    else:
        _, folder_node, resolved = find_chromium_folder(raw, folder)
        for child in folder_node.get("children", []):
            if child.get("type") == "url" and child.get("name", "") == name and normalize_url(child.get("url", "")) == normalize_url(url):
                raise ValueError("Bookmark already exists")
        folder_node.setdefault("children", []).append(make_chromium_bookmark(name, url))

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "created_bookmark": {"name": name, "url": url, "folder": resolved},
        }
    )


def update_bookmark(
    browser: str,
    profile: Optional[str],
    folder: str,
    name: str,
    url: str,
    new_name: Optional[str],
    new_url: Optional[str],
    confirm: bool,
):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    final_name = new_name or name
    final_url = new_url or url

    if browser.lower() == "safari":
        _, _, node, resolved = locate_bookmark_in_safari(raw, folder, name, url)
        node["Title"] = final_name
        node["URLString"] = final_url
        node.setdefault("URIDictionary", {})["title"] = final_name
    else:
        _, _, node, resolved = locate_bookmark_in_chromium(raw, folder, name, url)
        node["name"] = final_name
        node["url"] = final_url

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "updated_bookmark": {
                "folder": resolved,
                "old_name": name,
                "old_url": url,
                "new_name": final_name,
                "new_url": final_url,
            },
        }
    )


def delete_bookmark(browser: str, profile: Optional[str], folder: str, name: str, url: str, confirm: bool):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        folder_node, index, _, resolved = locate_bookmark_in_safari(raw, folder, name, url)
        del folder_node["Children"][index]
    else:
        folder_node, index, _, resolved = locate_bookmark_in_chromium(raw, folder, name, url)
        del folder_node["children"][index]

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "deleted_bookmark": {"name": name, "url": url, "folder": resolved},
        }
    )


def move_bookmark(
    browser: str,
    profile: Optional[str],
    folder: str,
    name: str,
    url: str,
    destination_folder: str,
    confirm: bool,
):
    ensure_confirm(confirm)
    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        source_folder, index, node, resolved = locate_bookmark_in_safari(raw, folder, name, url)
        _, destination_node, destination_resolved = find_safari_folder(raw, destination_folder)
        source_folder["Children"].pop(index)
        destination_node.setdefault("Children", []).append(node)
    else:
        source_folder, index, node, resolved = locate_bookmark_in_chromium(raw, folder, name, url)
        _, destination_node, destination_resolved = find_chromium_folder(raw, destination_folder)
        source_folder["children"].pop(index)
        destination_node.setdefault("children", []).append(node)

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "moved_bookmark": {"name": name, "url": url, "from_folder": resolved, "to_folder": destination_resolved},
        }
    )


def prune_chromium_duplicates(raw):
    seen = set()
    removed = []

    def walk(node, folder_path=""):
        if node.get("type") != "folder":
            return

        current_name = node.get("name", "")
        current_path = f"{folder_path}/{current_name}" if folder_path and current_name else (current_name or folder_path)
        new_children = []
        for child in node.get("children", []):
            if child.get("type") == "folder":
                walk(child, current_path)
                new_children.append(child)
                continue

            key = (
                current_path,
                child.get("name", "").strip().lower(),
                normalize_url(child.get("url", "")).lower(),
            )
            if key in seen:
                removed.append(
                    {
                        "folder": current_path,
                        "name": child.get("name", ""),
                        "url": child.get("url", ""),
                    }
                )
                continue
            seen.add(key)
            new_children.append(child)
        node["children"] = new_children

    for root_name, root in raw.get("roots", {}).items():
        if isinstance(root, dict):
            synthetic = root
            synthetic["name"] = root_name
            walk(synthetic)

    for root_name, root in raw.get("roots", {}).items():
        if isinstance(root, dict) and root.get("name") == root_name:
            del root["name"]

    return removed


def prune_safari_duplicates(raw):
    seen = set()
    removed = []

    def walk(node, folder_path=""):
        node_type = node.get("WebBookmarkType")
        title = node.get("Title", "")

        if node_type == "WebBookmarkTypeList":
            current_path = f"{folder_path}/{title}" if folder_path and title else (title or folder_path)
            children = []
            for child in node.get("Children", []):
                child_type = child.get("WebBookmarkType")
                if child_type == "WebBookmarkTypeLeaf":
                    key = (
                        current_path,
                        child.get("Title", "").strip().lower(),
                        normalize_url(child.get("URLString", "")).lower(),
                    )
                    if key in seen:
                        removed.append(
                            {
                                "folder": current_path,
                                "name": child.get("Title", ""),
                                "url": child.get("URLString", ""),
                            }
                        )
                        continue
                    seen.add(key)
                else:
                    walk(child, current_path)
                children.append(child)
            node["Children"] = children

    walk(raw)
    return removed


def remove_duplicates(browser: str, profile: Optional[str], confirm: bool):
    ensure_confirm(confirm)

    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        removed = prune_safari_duplicates(raw)
    else:
        removed = prune_chromium_duplicates(raw)

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "removed_count": len(removed),
            "removed": removed,
        }
    )


def sort_folder(browser: str, profile: Optional[str], folder: str, confirm: bool):
    ensure_confirm(confirm)

    path, raw, _, _ = load_bookmarks(browser, profile)
    backup_path = backup_file(path)

    if browser.lower() == "safari":
        _, node, resolved = find_safari_folder(raw, folder)
        children = node.get("Children", [])
        children.sort(
            key=lambda child: (
                0 if child.get("WebBookmarkType") == "WebBookmarkTypeList" else 1,
                child.get("Title", "").lower(),
            )
        )
        node["Children"] = children
    else:
        _, node, resolved = find_chromium_folder(raw, folder)
        children = node.get("children", [])
        children.sort(
            key=lambda child: (
                0 if child.get("type") == "folder" else 1,
                child.get("name", "").lower(),
            )
        )
        node["children"] = children

    save_bookmarks(browser, path, raw)
    output_json(
        {
            "browser": browser,
            "path": path,
            "backup_path": backup_path,
            "sorted_folder": resolved,
        }
    )


def main():
    action = os.environ["BOOKMARK_ACTION"]
    browser = os.environ["BOOKMARK_BROWSER"]
    profile = os.environ.get("BOOKMARK_PROFILE") or None

    if action == "list":
        list_bookmarks(
            browser,
            profile,
            os.environ.get("BOOKMARK_FOLDER_FILTER") or None,
            int(os.environ.get("BOOKMARK_LIMIT", "200")),
        )
        return
    if action == "list_folders":
        list_folders(browser, profile, int(os.environ.get("BOOKMARK_LIMIT", "500")))
        return
    if action == "read_folder":
        read_folder(browser, profile, os.environ["BOOKMARK_FOLDER"])
        return
    if action == "create_folder":
        create_folder(
            browser,
            profile,
            os.environ["BOOKMARK_PARENT_FOLDER"],
            os.environ["BOOKMARK_NAME"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "update_folder":
        update_folder(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_NEW_NAME"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "delete_folder":
        delete_folder(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "move_folder":
        move_folder(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_DESTINATION_FOLDER"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "read_bookmark":
        read_bookmark(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_NAME"],
            os.environ["BOOKMARK_URL"],
        )
        return
    if action == "create_bookmark":
        create_bookmark(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_NAME"],
            os.environ["BOOKMARK_URL"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "update_bookmark":
        update_bookmark(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_NAME"],
            os.environ["BOOKMARK_URL"],
            os.environ.get("BOOKMARK_NEW_NAME") or None,
            os.environ.get("BOOKMARK_NEW_URL") or None,
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "delete_bookmark":
        delete_bookmark(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_NAME"],
            os.environ["BOOKMARK_URL"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "move_bookmark":
        move_bookmark(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ["BOOKMARK_NAME"],
            os.environ["BOOKMARK_URL"],
            os.environ["BOOKMARK_DESTINATION_FOLDER"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    if action == "duplicates":
        find_duplicates(browser, profile)
        return
    if action == "remove_duplicates":
        remove_duplicates(browser, profile, os.environ.get("BOOKMARK_CONFIRM") == "true")
        return
    if action == "sort_folder":
        sort_folder(
            browser,
            profile,
            os.environ["BOOKMARK_FOLDER"],
            os.environ.get("BOOKMARK_CONFIRM") == "true",
        )
        return
    raise ValueError(f"Unsupported action: {action}")


if __name__ == "__main__":
    main()
`;

function browserProps() {
  return {
    browser: {
      type: "string",
      enum: ["safari", "brave", "chrome"],
      description: "Target browser",
    },
    profile: {
      type: "string",
      description: "Chromium profile name such as Default or Profile 1",
    },
  };
}

export const bookmarksCategory: ScriptCategory = {
  name: "bookmarks",
  description:
    "Bookmark inspection and safe cleanup for Safari, Brave, and Chrome",
  scripts: [
    {
      name: "list_bookmarks",
      description:
        "List bookmarks for Safari, Brave, or Chrome. Focus is on Safari and Brave.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folderFilter: {
            type: "string",
            description: "Optional folder-path substring filter",
          },
          limit: {
            type: "number",
            description: "Maximum bookmarks to return",
            default: 200,
          },
        },
        required: ["browser"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "list",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER_FILTER:
            typeof args.folderFilter === "string"
              ? String(args.folderFilter)
              : "",
          BOOKMARK_LIMIT: String(args.limit || 200),
        },
      }),
    },
    {
      name: "list_folders",
      description: "List bookmark folders for Safari, Brave, or Chrome.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          limit: {
            type: "number",
            description: "Maximum folders to return",
            default: 500,
          },
        },
        required: ["browser"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "list_folders",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_LIMIT: String(args.limit || 500),
        },
      }),
    },
    {
      name: "read_folder",
      description: "Read one bookmark folder and list its direct children.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description:
              "Folder path. For Brave and Chrome include the root such as bookmark_bar/Work. For Safari use the visible folder path.",
          },
        },
        required: ["browser", "folder"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "read_folder",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
        },
      }),
    },
    {
      name: "create_folder",
      description:
        "Create a bookmark folder inside an existing parent folder. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          parentFolder: {
            type: "string",
            description: "Parent folder path",
          },
          name: {
            type: "string",
            description: "New folder name",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the create",
            default: false,
          },
        },
        required: ["browser", "parentFolder", "name", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "create_folder",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_PARENT_FOLDER: String(args.parentFolder),
          BOOKMARK_NAME: String(args.name),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "update_folder",
      description:
        "Rename a bookmark folder. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Existing folder path",
          },
          newName: {
            type: "string",
            description: "New folder name",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the rename",
            default: false,
          },
        },
        required: ["browser", "folder", "newName", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "update_folder",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_NEW_NAME: String(args.newName),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "delete_folder",
      description:
        "Delete a bookmark folder. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Folder path to delete",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the delete",
            default: false,
          },
        },
        required: ["browser", "folder", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "delete_folder",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "move_folder",
      description:
        "Move a bookmark folder into another folder. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Folder path to move",
          },
          destinationFolder: {
            type: "string",
            description: "Destination folder path",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the move",
            default: false,
          },
        },
        required: ["browser", "folder", "destinationFolder", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "move_folder",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_DESTINATION_FOLDER: String(args.destinationFolder),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "read_bookmark",
      description:
        "Read one bookmark by folder, name, and URL. This strict match is used to avoid ambiguous edits.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Folder path containing the bookmark",
          },
          name: {
            type: "string",
            description: "Bookmark name",
          },
          url: {
            type: "string",
            description: "Bookmark URL",
          },
        },
        required: ["browser", "folder", "name", "url"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "read_bookmark",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_NAME: String(args.name),
          BOOKMARK_URL: String(args.url),
        },
      }),
    },
    {
      name: "create_bookmark",
      description:
        "Create a bookmark inside an existing folder. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Folder path to create the bookmark in",
          },
          name: {
            type: "string",
            description: "Bookmark name",
          },
          url: {
            type: "string",
            description: "Bookmark URL",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the create",
            default: false,
          },
        },
        required: ["browser", "folder", "name", "url", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "create_bookmark",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_NAME: String(args.name),
          BOOKMARK_URL: String(args.url),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "update_bookmark",
      description:
        "Rename or retarget one bookmark. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Folder path containing the bookmark",
          },
          name: {
            type: "string",
            description: "Existing bookmark name",
          },
          url: {
            type: "string",
            description: "Existing bookmark URL",
          },
          newName: {
            type: "string",
            description: "Optional new name",
          },
          newUrl: {
            type: "string",
            description: "Optional new URL",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the update",
            default: false,
          },
        },
        required: ["browser", "folder", "name", "url", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "update_bookmark",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_NAME: String(args.name),
          BOOKMARK_URL: String(args.url),
          BOOKMARK_NEW_NAME:
            typeof args.newName === "string" ? String(args.newName) : "",
          BOOKMARK_NEW_URL:
            typeof args.newUrl === "string" ? String(args.newUrl) : "",
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "delete_bookmark",
      description:
        "Delete one bookmark. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Folder path containing the bookmark",
          },
          name: {
            type: "string",
            description: "Bookmark name",
          },
          url: {
            type: "string",
            description: "Bookmark URL",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the delete",
            default: false,
          },
        },
        required: ["browser", "folder", "name", "url", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "delete_bookmark",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_NAME: String(args.name),
          BOOKMARK_URL: String(args.url),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "move_bookmark",
      description:
        "Move one bookmark to a different folder. Creates a backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description: "Current folder path",
          },
          name: {
            type: "string",
            description: "Bookmark name",
          },
          url: {
            type: "string",
            description: "Bookmark URL",
          },
          destinationFolder: {
            type: "string",
            description: "Destination folder path",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the move",
            default: false,
          },
        },
        required: [
          "browser",
          "folder",
          "name",
          "url",
          "destinationFolder",
          "confirm",
        ],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "move_bookmark",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_NAME: String(args.name),
          BOOKMARK_URL: String(args.url),
          BOOKMARK_DESTINATION_FOLDER: String(args.destinationFolder),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "find_duplicates",
      description:
        "Find duplicate bookmarks grouped by name and normalized URL within the same folder.",
      schema: {
        type: "object",
        properties: browserProps(),
        required: ["browser"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "duplicates",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
        },
      }),
    },
    {
      name: "remove_duplicates",
      description:
        "Remove duplicate bookmarks within the same folder. Creates a timestamped backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          confirm: {
            type: "boolean",
            description: "Must be true to perform the cleanup",
            default: false,
          },
        },
        required: ["browser", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "remove_duplicates",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
    {
      name: "sort_folder",
      description:
        "Sort one bookmark folder alphabetically with folders first. Creates a timestamped backup first and requires confirm=true.",
      schema: {
        type: "object",
        properties: {
          ...browserProps(),
          folder: {
            type: "string",
            description:
              "Folder path. For Brave and Chrome include the root such as bookmark_bar/Work. For Safari use the visible folder path.",
          },
          confirm: {
            type: "boolean",
            description: "Must be true to perform the sort",
            default: false,
          },
        },
        required: ["browser", "folder", "confirm"],
      },
      script: (args) => ({
        kind: "shell",
        command: "/usr/bin/python3",
        args: ["-c", bookmarkManagerScript],
        env: {
          BOOKMARK_ACTION: "sort_folder",
          BOOKMARK_BROWSER: String(args.browser),
          BOOKMARK_PROFILE:
            typeof args.profile === "string" ? String(args.profile) : "",
          BOOKMARK_FOLDER: String(args.folder),
          BOOKMARK_CONFIRM: String(Boolean(args.confirm)),
        },
      }),
    },
  ],
};
