import AppKit

let width: CGFloat = 600
let height: CGFloat = 360

func createRep(scale: CGFloat) -> NSBitmapImageRep {
    let pixelWidth = Int(width * scale)
    let pixelHeight = Int(height * scale)

    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: pixelWidth,
        pixelsHigh: pixelHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .calibratedRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    rep.size = NSSize(width: width, height: height)

    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = context
    let cg = context.cgContext

    // 1. Dark Modern Background Gradient (#0C101A to #07090F)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bgColors = [
        NSColor(red: 0.05, green: 0.07, blue: 0.12, alpha: 1.0).cgColor,
        NSColor(red: 0.03, green: 0.04, blue: 0.06, alpha: 1.0).cgColor
    ] as CFArray
    let bgGradient = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: [0.0, 1.0])!
    cg.drawLinearGradient(bgGradient, start: CGPoint(x: width / 2, y: height), end: CGPoint(x: width / 2, y: 0), options: [])

    // 2. Ambient radial glow in center
    let glowColors = [
        NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.16).cgColor, // Blue #3B82F6
        NSColor(red: 0.39, green: 0.40, blue: 0.95, alpha: 0.05).cgColor, // Indigo #6366F1
        NSColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 0.0).cgColor
    ] as CFArray
    let glowGradient = CGGradient(colorsSpace: colorSpace, colors: glowColors, locations: [0.0, 0.45, 1.0])!
    // In Cocoa bottom-up coords: center is at x=300, y = 360 - 165 = 195
    cg.drawRadialGradient(glowGradient, startCenter: CGPoint(x: 300, y: 195), startRadius: 0, endCenter: CGPoint(x: 300, y: 195), endRadius: 180, options: [])

    // 3. Subtle Frosted Glass Badge in the center (between icons)
    // Centered at x=300, y=195. Width=160, Height=100 -> rect: x=220, y=145
    let badgeRect = CGRect(x: 220, y: 145, width: 160, height: 100)
    let badgePath = CGPath(roundedRect: badgeRect, cornerWidth: 22, cornerHeight: 22, transform: nil)
    
    // Fill badge
    cg.setFillColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.04).cgColor)
    cg.addPath(badgePath)
    cg.fillPath()

    // Border badge with subtle gradient stroke
    cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.09).cgColor)
    cg.setLineWidth(1.0)
    cg.addPath(badgePath)
    cg.strokePath()

    // 4. Directional Gradient Arrow (from x=250 to x=350 at y=195)
    let arrowY: CGFloat = 195
    let startX: CGFloat = 250
    let endX: CGFloat = 345

    // Arrow line glow
    cg.saveGState()
    cg.setShadow(offset: .zero, blur: 10.0, color: NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.7).cgColor)
    
    // Draw arrow path
    let arrowPath = CGMutablePath()
    arrowPath.move(to: CGPoint(x: startX, y: arrowY))
    arrowPath.addLine(to: CGPoint(x: endX, y: arrowY))

    // Modern chevron arrowhead
    arrowPath.move(to: CGPoint(x: endX - 11, y: arrowY + 8))
    arrowPath.addLine(to: CGPoint(x: endX, y: arrowY))
    arrowPath.addLine(to: CGPoint(x: endX - 11, y: arrowY - 8))

    cg.addPath(arrowPath)
    cg.setStrokeColor(NSColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 1.0).cgColor)
    cg.setLineWidth(3.0)
    cg.setLineCap(.round)
    cg.setLineJoin(.round)
    cg.strokePath()
    cg.restoreGState()

    // 5. Typography
    let pStyle = NSMutableParagraphStyle()
    pStyle.alignment = .center

    // Top Category label
    let catAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 9.5, weight: .bold),
        .foregroundColor: NSColor(red: 0.55, green: 0.65, blue: 0.80, alpha: 0.85),
        .paragraphStyle: pStyle,
        .kern: 1.8 as NSNumber
    ]
    let catText = "INSTALLATION" as NSString
    catText.draw(in: CGRect(x: 220, y: 216, width: 160, height: 16), withAttributes: catAttrs)

    // Bottom Action instruction
    let actionAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 11.5, weight: .semibold),
        .foregroundColor: NSColor(red: 0.90, green: 0.93, blue: 0.98, alpha: 0.95),
        .paragraphStyle: pStyle
    ]
    let actionText = "Drag to Applications" as NSString
    actionText.draw(in: CGRect(x: 220, y: 156, width: 160, height: 18), withAttributes: actionAttrs)

    // 6. Header branding at the top
    let brandAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 11.5, weight: .medium),
        .foregroundColor: NSColor(red: 0.45, green: 0.52, blue: 0.65, alpha: 0.65),
        .paragraphStyle: pStyle
    ]
    let brandText = "Beberes for macOS" as NSString
    brandText.draw(in: CGRect(x: 100, y: 312, width: 400, height: 18), withAttributes: brandAttrs)

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let rep1x = createRep(scale: 1.0)
let rep2x = createRep(scale: 2.0)

// 1. Save multi-representation TIFF for Retina Finder display
let tiffImage = NSImage(size: NSSize(width: width, height: height))
tiffImage.addRepresentation(rep1x)
tiffImage.addRepresentation(rep2x)

if let tiffData = tiffImage.tiffRepresentation(using: .lzw, factor: 1.0) {
    try tiffData.write(to: URL(fileURLWithPath: "src-tauri/icons/dmg-background.tiff"))
    print("Generated TIFF background: src-tauri/icons/dmg-background.tiff (\(tiffData.count) bytes)")
}

// 2. Save 1x and 2x PNGs
if let png1x = rep1x.representation(using: .png, properties: [:]) {
    try png1x.write(to: URL(fileURLWithPath: "src-tauri/icons/dmg-background.png"))
    print("Generated 1x PNG: src-tauri/icons/dmg-background.png (\(png1x.count) bytes)")
}
if let png2x = rep2x.representation(using: .png, properties: [:]) {
    try png2x.write(to: URL(fileURLWithPath: "src-tauri/icons/dmg-background@2x.png"))
    print("Generated 2x PNG: src-tauri/icons/dmg-background@2x.png (\(png2x.count) bytes)")
}
