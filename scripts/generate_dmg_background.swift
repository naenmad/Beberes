import AppKit

let canvasWidth: CGFloat = 1600
let canvasHeight: CGFloat = 1000
let contentWidth: CGFloat = 600
let contentHeight: CGFloat = 360

func createRep(scale: CGFloat) -> NSBitmapImageRep {
    let pixelWidth = Int(canvasWidth * scale)
    let pixelHeight = Int(canvasHeight * scale)

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
    rep.size = NSSize(width: canvasWidth, height: canvasHeight)

    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = context
    let cg = context.cgContext

    // 1. Fill entire canvas with dark background (#080B12) to prevent any white space when resized
    let baseDarkColor = NSColor(red: 0.03, green: 0.04, blue: 0.07, alpha: 1.0)
    cg.setFillColor(baseDarkColor.cgColor)
    cg.fill(CGRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight))

    // 2. Flip coordinate system so (0,0) is TOP-LEFT, matching macOS Finder
    cg.translateBy(x: 0, y: canvasHeight)
    cg.scaleBy(x: 1.0, y: -1.0)

    // 3. Draw subtle gradient only in primary 600x360 installation zone blending into baseDarkColor
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bgColors = [
        NSColor(red: 0.06, green: 0.08, blue: 0.13, alpha: 1.0).cgColor,
        baseDarkColor.cgColor
    ] as CFArray
    let bgGradient = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: [0.0, 1.0])!
    cg.drawLinearGradient(bgGradient, start: CGPoint(x: 300, y: 0), end: CGPoint(x: 300, y: contentHeight), options: [])

    // 4. Ambient radial glow in the center of the 600x360 zone (centered at x=300, y=165)
    let glowColors = [
        NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.16).cgColor,
        NSColor(red: 0.39, green: 0.40, blue: 0.95, alpha: 0.05).cgColor,
        NSColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 0.0).cgColor
    ] as CFArray
    let glowGradient = CGGradient(colorsSpace: colorSpace, colors: glowColors, locations: [0.0, 0.45, 1.0])!
    cg.drawRadialGradient(glowGradient, startCenter: CGPoint(x: 300, y: 165), startRadius: 0, endCenter: CGPoint(x: 300, y: 165), endRadius: 190, options: [])

    // 5. Subtle Frosted Glass Badge in the center between icons
    let badgeRect = CGRect(x: 220, y: 115, width: 160, height: 100)
    let badgePath = CGPath(roundedRect: badgeRect, cornerWidth: 22, cornerHeight: 22, transform: nil)
    
    // Fill badge
    cg.setFillColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.04).cgColor)
    cg.addPath(badgePath)
    cg.fillPath()

    // Border badge
    cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.09).cgColor)
    cg.setLineWidth(1.0)
    cg.addPath(badgePath)
    cg.strokePath()

    // 6. Directional Gradient Arrow (from x=250 to x=345 at y=165)
    let arrowY: CGFloat = 165
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
    arrowPath.move(to: CGPoint(x: endX - 11, y: arrowY - 8))
    arrowPath.addLine(to: CGPoint(x: endX, y: arrowY))
    arrowPath.addLine(to: CGPoint(x: endX - 11, y: arrowY + 8))

    cg.addPath(arrowPath)
    cg.setStrokeColor(NSColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 1.0).cgColor)
    cg.setLineWidth(3.0)
    cg.setLineCap(.round)
    cg.setLineJoin(.round)
    cg.strokePath()
    cg.restoreGState()

    // 7. Typography (Flip text context so glyphs draw right-side up)
    cg.saveGState()
    cg.translateBy(x: 0, y: canvasHeight)
    cg.scaleBy(x: 1.0, y: -1.0)

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
    catText.draw(in: CGRect(x: 220, y: canvasHeight - 145, width: 160, height: 16), withAttributes: catAttrs)

    // Bottom Action instruction
    let actionAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 11.5, weight: .semibold),
        .foregroundColor: NSColor(red: 0.90, green: 0.93, blue: 0.98, alpha: 0.95),
        .paragraphStyle: pStyle
    ]
    let actionText = "Drag to Applications" as NSString
    actionText.draw(in: CGRect(x: 220, y: canvasHeight - 202, width: 160, height: 18), withAttributes: actionAttrs)

    // Header branding at top
    let brandAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 11.5, weight: .medium),
        .foregroundColor: NSColor(red: 0.45, green: 0.52, blue: 0.65, alpha: 0.65),
        .paragraphStyle: pStyle
    ]
    let brandText = "Beberes for macOS" as NSString
    brandText.draw(in: CGRect(x: 100, y: canvasHeight - 65, width: 400, height: 18), withAttributes: brandAttrs)

    cg.restoreGState()

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let rep1x = createRep(scale: 1.0)
let rep2x = createRep(scale: 2.0)

// 1. Save multi-representation TIFF for Retina Finder display
let tiffImage = NSImage(size: NSSize(width: canvasWidth, height: canvasHeight))
tiffImage.addRepresentation(rep1x)
tiffImage.addRepresentation(rep2x)

if let tiffData = tiffImage.tiffRepresentation(using: .lzw, factor: 1.0) {
    try tiffData.write(to: URL(fileURLWithPath: "src-tauri/icons/dmg-background.tiff"))
    print("Generated seamless TIFF background: src-tauri/icons/dmg-background.tiff (\(tiffData.count) bytes)")
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
