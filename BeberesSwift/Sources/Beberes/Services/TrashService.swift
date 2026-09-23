import Foundation

public struct TrashService: Sendable {
    public static var isTrashMode: Bool {
        if UserDefaults.standard.object(forKey: "beberes_delete_to_trash") == nil {
            return true
        }
        return UserDefaults.standard.bool(forKey: "beberes_delete_to_trash")
    }

    public static func moveToTrash(at path: String) throws {
        let url = URL(fileURLWithPath: path)
        var resultingURL: NSURL?
        try FileManager.default.trashItem(at: url, resultingItemURL: &resultingURL)
    }

    public static func deletePermanently(at path: String) throws {
        let url = URL(fileURLWithPath: path)
        try FileManager.default.removeItem(at: url)
    }

    public static func remove(at path: String, preferTrash: Bool? = nil) throws {
        let useTrash = preferTrash ?? isTrashMode
        if useTrash {
            try moveToTrash(at: path)
        } else {
            try deletePermanently(at: path)
        }
    }
}
