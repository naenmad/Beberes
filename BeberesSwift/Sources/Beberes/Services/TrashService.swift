import Foundation

public struct TrashService: Sendable {
    public static func moveToTrash(at path: String) throws {
        let url = URL(fileURLWithPath: path)
        var resultingURL: NSURL?
        try FileManager.default.trashItem(at: url, resultingItemURL: &resultingURL)
    }

    public static func deletePermanently(at path: String) throws {
        let url = URL(fileURLWithPath: path)
        try FileManager.default.removeItem(at: url)
    }
}
