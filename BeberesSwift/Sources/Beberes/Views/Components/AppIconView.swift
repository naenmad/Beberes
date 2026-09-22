import SwiftUI
import AppKit

public struct AppIconView: View {
    public let size: CGFloat
    public let cornerRadius: CGFloat

    public init(size: CGFloat = 28, cornerRadius: CGFloat? = nil) {
        self.size = size
        self.cornerRadius = cornerRadius ?? (size * 0.22)
    }

    public var body: some View {
        if let iconURL = Bundle.module.url(forResource: "AppIcon", withExtension: "png"),
           let nsImage = NSImage(contentsOf: iconURL) {
            Image(nsImage: nsImage)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .shadow(color: .black.opacity(0.12), radius: size > 40 ? 6 : 2, y: 1)
        } else {
            // Fallback placeholder if resource bundle is resolving
            ZStack {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color(red: 16/255, green: 185/255, blue: 129/255))
                    .frame(width: size, height: size)
                Image(systemName: "sparkles")
                    .font(.system(size: size * 0.5, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
    }
}
