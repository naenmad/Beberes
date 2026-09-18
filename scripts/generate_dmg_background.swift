import AppKit

let width: CGFloat = 660
let height: CGFloat = 400

func renderBackground(scale: CGFloat) -> NSData {
    let pixelSize = NSSize(width: width * scale, height: height * scale)
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(pixelSize.width),
        pixelsHigh: Int(pixelSize.height),
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
    // Flip coordinate system so (0,0) is TOP-LEFT, matching Finder
    cg.translateBy(x: 0, y: height)
    cg.scaleBy(x: 1.0, y: -1.0)

    // 1. Sleek dark background gradient
    let bgColors = [
        NSColor(red: 0.07, green: 0.09, blue: 0.14, alpha: 1.0).cgColor, // #121724
        NSColor(red: 0.04, green: 0.05, blue: 0.08, alpha: 1.0).cgColor  // #0a0d14
    ] as CFArray
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let gradient = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: [0.0, 1.0])!
    cg.drawLinearGradient(gradient, start: CGPoint(x: 330, y: 0), end: CGPoint(x: 330, y: 400), options: [])

    // 2. Ambient radial glow behind the two target zones
    let glowColors = [
        NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.18).cgColor,
        NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.0).cgColor
    ] as CFArray
    let glowGradient = CGGradient(colorsSpace: colorSpace, colors: glowColors, locations: [0.0, 1.0])!
    
    // Glow left (Beberes)
    cg.drawRadialGradient(glowGradient, startCenter: CGPoint(x: 180, y: 190), startRadius: 0, endCenter: CGPoint(x: 180, y: 190), endRadius: 110, options: [])
    // Glow right (Applications)
    cg.drawRadialGradient(glowGradient, startCenter: CGPoint(x: 480, y: 190), startRadius: 0, endCenter: CGPoint(x: 480, y: 190), endRadius: 110, options: [])

    // Helper for drawing pedestals
    func drawPedestal(centerX: CGFloat, centerY: CGFloat) {
        let rect = CGRect(x: centerX - 76, y: centerY - 76, width: 152, height: 152)
        let path = CGPath(roundedRect: rect, cornerWidth: 36, cornerHeight: 36, transform: nil)
        
        // Fill pedestal glass
        cg.setFillColor(NSColor(red: 0.15, green: 0.20, blue: 0.32, alpha: 0.35).cgColor)
        cg.addPath(path)
        cg.fillPath()

        // Stroke pedestal border
        cg.setStrokeColor(NSColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 0.25).cgColor)
        cg.setLineWidth(1.5)
        cg.addPath(path)
        cg.strokePath()

        // Subtle inner dashed guide
        let innerRect = CGRect(x: centerX - 66, y: centerY - 66, width: 132, height: 132)
        let innerPath = CGPath(roundedRect: innerRect, cornerWidth: 30, cornerHeight: 30, transform: nil)
        let dashes: [CGFloat] = [4.0, 4.0]
        cg.setLineDash(phase: 0, lengths: dashes)
        cg.setStrokeColor(NSColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 0.45).cgColor)
        cg.setLineWidth(1.0)
        cg.addPath(innerPath)
        cg.strokePath()
        cg.setLineDash(phase: 0, lengths: [])
    }

    // Draw both pedestals exactly at the icon coordinate centers (180, 190) and (480, 190)
    drawPedestal(centerX: 180, centerY: 190)
    drawPedestal(centerX: 480, centerY: 190)

    // 3. Sleek connecting arrow between pedestals
    let arrowY: CGFloat = 190
    let startX: CGFloat = 275
    let endX: CGFloat = 385

    // Arrow line
    cg.setStrokeColor(NSColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 0.85).cgColor)
    cg.setLineWidth(2.5)
    cg.setLineCap(.round)
    cg.setLineJoin(.round)

    cg.beginPath()
    cg.move(to: CGPoint(x: startX, y: arrowY))
    cg.addLine(to: CGPoint(x: endX, y: arrowY))
    cg.strokePath()

    // Arrow head
    cg.beginPath()
    cg.move(to: CGPoint(x: endX - 10, y: arrowY - 8))
    cg.addLine(to: CGPoint(x: endX, y: arrowY))
    cg.addLine(to: CGPoint(x: endX - 10, y: arrowY + 8))
    cg.strokePath()

    // 4. Instructions Typography below the arrow
    // Flip text context so fonts render right side up
    cg.saveGState()
    cg.translateBy(x: 0, y: height)
    cg.scaleBy(x: 1.0, y: -1.0)

    // In flipped-back coordinates:
    // arrowY was 190 from top, so in bottom-relative coordinates it is (400 - 190) = 210.
    // We want text to appear below the arrow, e.g. at y = 230 from top, which is (400 - 230) = 170.
    let textRect = CGRect(x: 230, y: 145, width: 200, height: 24)
    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.alignment = .center

    let font = NSFont.systemFont(ofSize: 11.5, weight: .semibold)
    let textAttrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(red: 0.70, green: 0.78, blue: 0.90, alpha: 0.9),
        .paragraphStyle: paragraphStyle
    ]

    let text = "Drag to Install" as NSString
    text.draw(in: textRect, withAttributes: textAttrs)

    cg.restoreGState()

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])! as NSData
}

let png1x = renderBackground(scale: 1.0)
let png2x = renderBackground(scale: 2.0)

let out1xPath = "src-tauri/icons/dmg-background.png"
let out2xPath = "src-tauri/icons/dmg-background@2x.png"

try png1x.write(to: URL(fileURLWithPath: out1xPath))
try png2x.write(to: URL(fileURLWithPath: out2xPath))

print("Successfully generated:")
print("  1x:", out1xPath, "(\(Int(width))x\(Int(height)))")
print("  2x:", out2xPath, "(\(Int(width*2))x\(Int(height*2)))")
