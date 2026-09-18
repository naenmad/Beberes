import AppKit

let width: CGFloat = 1200
let height: CGFloat = 760
let scale: CGFloat = 2.0

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

// Flip coordinate system so (0,0) is TOP-LEFT
cg.translateBy(x: 0, y: height)
cg.scaleBy(x: 1.0, y: -1.0)

// 1. Wallpaper background (Sleek deep dark subtle gradient)
let colorSpace = CGColorSpaceCreateDeviceRGB()
let wallColors = [
    NSColor(red: 0.04, green: 0.05, blue: 0.08, alpha: 1.0).cgColor,
    NSColor(red: 0.02, green: 0.03, blue: 0.05, alpha: 1.0).cgColor
] as CFArray
let wallGradient = CGGradient(colorsSpace: colorSpace, colors: wallColors, locations: [0.0, 1.0])!
cg.drawLinearGradient(wallGradient, start: CGPoint(x: width / 2, y: 0), end: CGPoint(x: width / 2, y: height), options: [])

// Window shadow
cg.saveGState()
cg.setShadow(offset: CGSize(width: 0, height: -20), blur: 40.0, color: NSColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 0.7).cgColor)

// 2. macOS Window Frame (centered at margin 30)
let winRect = CGRect(x: 30, y: 30, width: width - 60, height: height - 60)
let winPath = CGPath(roundedRect: winRect, cornerWidth: 18, cornerHeight: 18, transform: nil)
cg.setFillColor(NSColor(red: 0.08, green: 0.09, blue: 0.12, alpha: 1.0).cgColor)
cg.addPath(winPath)
cg.fillPath()
cg.restoreGState()

// Window stroke border
cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.12).cgColor)
cg.setLineWidth(1.0)
cg.addPath(winPath)
cg.strokePath()

// 3. Traffic Lights
let tlY: CGFloat = 52
func drawDot(x: CGFloat, color: NSColor) {
    cg.setFillColor(color.cgColor)
    cg.fillEllipse(in: CGRect(x: x, y: tlY, width: 12, height: 12))
}
drawDot(x: 52, color: NSColor(red: 0.98, green: 0.36, blue: 0.35, alpha: 1.0)) // Red
drawDot(x: 72, color: NSColor(red: 0.98, green: 0.74, blue: 0.18, alpha: 1.0)) // Yellow
drawDot(x: 92, color: NSColor(red: 0.16, green: 0.79, blue: 0.28, alpha: 1.0)) // Green

// 4. Sidebar Area
let sidebarWidth: CGFloat = 240
let contentX = winRect.minX + sidebarWidth
let contentWidth = winRect.width - sidebarWidth

// Sidebar divider
cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.06).cgColor)
cg.beginPath()
cg.move(to: CGPoint(x: contentX, y: winRect.minY))
cg.addLine(to: CGPoint(x: contentX, y: winRect.maxY))
cg.strokePath()

// TopBar divider
let topBarHeight: CGFloat = 52
cg.beginPath()
cg.move(to: CGPoint(x: contentX, y: winRect.minY + topBarHeight))
cg.addLine(to: CGPoint(x: winRect.maxX, y: winRect.minY + topBarHeight))
cg.strokePath()

// 5. Typography Rendering
cg.saveGState()
cg.translateBy(x: 0, y: height)
cg.scaleBy(x: 1.0, y: -1.0)

func drawText(_ str: String, x: CGFloat, topY: CGFloat, size: CGFloat, weight: NSFont.Weight, color: NSColor, width: CGFloat = 300) {
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    let p = NSMutableParagraphStyle()
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: p
    ]
    let rect = CGRect(x: x, y: height - topY - (size + 6), width: width, height: size + 10)
    (str as NSString).draw(in: rect, withAttributes: attrs)
}

// Sidebar Branding
drawText("Beberes", x: 120, topY: 48, size: 14, weight: .bold, color: .white)
drawText("v1.0.0", x: 185, topY: 51, size: 10, weight: .semibold, color: NSColor(red: 0.38, green: 0.65, blue: 0.98, alpha: 1.0))

// Sidebar Navigation Items
var navY: CGFloat = 90
func drawNavCategory(_ title: String) {
    drawText(title.uppercased(), x: 52, topY: navY, size: 10, weight: .bold, color: NSColor(white: 0.45, alpha: 1.0))
    navY += 24
}
func drawNavItem(_ name: String, active: Bool = false) {
    if active {
        // Draw active pill
        NSGraphicsContext.saveGraphicsState()
        let activeRect = CGRect(x: 44, y: height - (navY + 22), width: 210, height: 30)
        let path = CGPath(roundedRect: activeRect, cornerWidth: 8, cornerHeight: 8, transform: nil)
        let ctx = NSGraphicsContext.current!.cgContext
        ctx.setFillColor(NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.2).cgColor)
        ctx.addPath(path)
        ctx.fillPath()
        ctx.setStrokeColor(NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.4).cgColor)
        ctx.setLineWidth(1)
        ctx.addPath(path)
        ctx.strokePath()
        NSGraphicsContext.restoreGraphicsState()
        drawText(name, x: 60, topY: navY - 2, size: 12, weight: .semibold, color: .white)
    } else {
        drawText(name, x: 60, topY: navY - 2, size: 12, weight: .regular, color: NSColor(white: 0.65, alpha: 1.0))
    }
    navY += 32
}

drawNavCategory("Overview")
drawNavItem("Dashboard", active: true)
drawNavItem("Disk Visualizer")
drawNavItem("Quick Review")
drawNavItem("Large & Duplicates")

navY += 10
drawNavCategory("Cleaning")
drawNavItem("System Clean")
drawNavItem("Developer Workspace")
drawNavItem("Trash Manager")

navY += 10
drawNavCategory("Organization")
drawNavItem("Tidy Up")
drawNavItem("Applications")
drawNavItem("Git Sweeper")

// TopBar Content
drawText("Macintosh HD", x: contentX + 24, topY: 48, size: 12, weight: .bold, color: .white)
drawText("18.4 GB Free of 512 GB", x: contentX + 130, topY: 50, size: 11, weight: .regular, color: NSColor(white: 0.5, alpha: 1.0))

// Spotlight Search Trigger in TopBar
drawText("Search features, files, actions... (Cmd+K)", x: contentX + 340, topY: 48, size: 11, weight: .regular, color: NSColor(white: 0.45, alpha: 1.0), width: 300)

// Main Content Header
drawText("Storage & System Overview", x: contentX + 32, topY: 100, size: 22, weight: .bold, color: .white)
drawText("Real-time telemetry, hardware capacity, and safe reclamation targets", x: contentX + 32, topY: 130, size: 12, weight: .regular, color: NSColor(white: 0.55, alpha: 1.0), width: 600)

cg.restoreGState()

// 6. Draw Dashboard Stat Cards & Circular Progress
let cardY: CGFloat = 165
let cardWidth: CGFloat = (contentWidth - 84) / 3

func drawCard(index: CGFloat, title: String, value: String, subtitle: String, accentColor: NSColor) {
    let cX = contentX + 32 + index * (cardWidth + 10)
    let cRect = CGRect(x: cX, y: cardY, width: cardWidth, height: 120)
    let cPath = CGPath(roundedRect: cRect, cornerWidth: 16, cornerHeight: 16, transform: nil)
    
    cg.setFillColor(NSColor(red: 0.11, green: 0.13, blue: 0.18, alpha: 0.6).cgColor)
    cg.addPath(cPath)
    cg.fillPath()
    
    cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.08).cgColor)
    cg.setLineWidth(1.0)
    cg.addPath(cPath)
    cg.strokePath()

    cg.saveGState()
    cg.translateBy(x: 0, y: height)
    cg.scaleBy(x: 1.0, y: -1.0)
    drawText(title, x: cX + 16, topY: cardY + 16, size: 11, weight: .semibold, color: NSColor(white: 0.55, alpha: 1.0))
    drawText(value, x: cX + 16, topY: cardY + 40, size: 24, weight: .bold, color: accentColor)
    drawText(subtitle, x: cX + 16, topY: cardY + 82, size: 11, weight: .regular, color: NSColor(white: 0.45, alpha: 1.0))
    cg.restoreGState()
}

drawCard(index: 0, title: "CLEANABLE CACHE", value: "18.4 GB", subtitle: "System & user cache safe to purge", accentColor: NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 1.0))
drawCard(index: 1, title: "DEV ARTIFACTS", value: "32.6 GB", subtitle: "node_modules, target, Docker VMs", accentColor: NSColor(red: 0.64, green: 0.40, blue: 0.98, alpha: 1.0))
drawCard(index: 2, title: "TRASH & REDUNDANT", value: "9.1 GB", subtitle: "Unemptied trash & installer DMGs", accentColor: NSColor(red: 0.98, green: 0.42, blue: 0.35, alpha: 1.0))

// 7. Middle Large Card: Storage Breakdown & Smart Clean Action
let midCardY: CGFloat = 305
let midRect = CGRect(x: contentX + 32, y: midCardY, width: contentWidth - 64, height: 210)
let midPath = CGPath(roundedRect: midRect, cornerWidth: 18, cornerHeight: 18, transform: nil)
cg.setFillColor(NSColor(red: 0.11, green: 0.13, blue: 0.18, alpha: 0.7).cgColor)
cg.addPath(midPath)
cg.fillPath()
cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.08).cgColor)
cg.setLineWidth(1.0)
cg.addPath(midPath)
cg.strokePath()

// Progress Ring in Middle Card
let ringCenter = CGPoint(x: contentX + 120, y: midCardY + 105)
let ringRadius: CGFloat = 60
// Background ring
cg.setStrokeColor(NSColor(white: 0.18, alpha: 1.0).cgColor)
cg.setLineWidth(12)
cg.strokeEllipse(in: CGRect(x: ringCenter.x - ringRadius, y: ringCenter.y - ringRadius, width: ringRadius * 2, height: ringRadius * 2))
// Active arc
cg.setStrokeColor(NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 1.0).cgColor)
cg.setLineCap(.round)
cg.addArc(center: ringCenter, radius: ringRadius, startAngle: -.pi / 2, endAngle: .pi * 0.9, clockwise: false)
cg.strokePath()

// Action Button "Smart Clean"
let btnRect = CGRect(x: contentX + contentWidth - 230, y: midCardY + 80, width: 140, height: 44)
let btnPath = CGPath(roundedRect: btnRect, cornerWidth: 12, cornerHeight: 12, transform: nil)
cg.setFillColor(NSColor(red: 0.14, green: 0.47, blue: 0.96, alpha: 1.0).cgColor)
cg.addPath(btnPath)
cg.fillPath()

cg.saveGState()
cg.translateBy(x: 0, y: height)
cg.scaleBy(x: 1.0, y: -1.0)
drawText("84%", x: ringCenter.x - 22, topY: ringCenter.y - 12, size: 20, weight: .bold, color: .white)
drawText("Used", x: ringCenter.x - 14, topY: ringCenter.y + 12, size: 10, weight: .semibold, color: NSColor(white: 0.5, alpha: 1.0))

drawText("Quick System Health", x: contentX + 210, topY: midCardY + 30, size: 15, weight: .bold, color: .white)
drawText("Your storage has 60.1 GB ready for automated reclaim.", x: contentX + 210, topY: midCardY + 54, size: 12, weight: .regular, color: NSColor(white: 0.6, alpha: 1.0))

drawText("Smart Clean", x: btnRect.minX + 28, topY: btnRect.minY + 12, size: 13, weight: .bold, color: .white)
cg.restoreGState()

// 8. Bottom Milestones Card
let btmY: CGFloat = 535
let btmRect = CGRect(x: contentX + 32, y: btmY, width: contentWidth - 64, height: 125)
let btmPath = CGPath(roundedRect: btmRect, cornerWidth: 16, cornerHeight: 16, transform: nil)
cg.setFillColor(NSColor(red: 0.10, green: 0.12, blue: 0.17, alpha: 0.5).cgColor)
cg.addPath(btmPath)
cg.fillPath()
cg.setStrokeColor(NSColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.06).cgColor)
cg.setLineWidth(1.0)
cg.addPath(btmPath)
cg.strokePath()

cg.saveGState()
cg.translateBy(x: 0, y: height)
cg.scaleBy(x: 1.0, y: -1.0)
drawText("Cumulative Lifetime Impact", x: contentX + 52, topY: btmY + 20, size: 13, weight: .bold, color: .white)
drawText("Total storage resources and clean cycles performed with Beberes", x: contentX + 52, topY: btmY + 40, size: 11, weight: .regular, color: NSColor(white: 0.5, alpha: 1.0))

let colWidth = (contentWidth - 100) / 3
drawText("Total Storage Rescued", x: contentX + 52, topY: btmY + 70, size: 11, weight: .semibold, color: NSColor(white: 0.45, alpha: 1.0))
drawText("142.8 GB", x: contentX + 52, topY: btmY + 90, size: 18, weight: .bold, color: NSColor(red: 0.23, green: 0.81, blue: 0.54, alpha: 1.0))

drawText("Clean Cycles Run", x: contentX + 52 + colWidth, topY: btmY + 70, size: 11, weight: .semibold, color: NSColor(white: 0.45, alpha: 1.0))
drawText("28 Cycles", x: contentX + 52 + colWidth, topY: btmY + 90, size: 18, weight: .bold, color: .white)

drawText("Files Processed", x: contentX + 52 + colWidth * 2, topY: btmY + 70, size: 11, weight: .semibold, color: NSColor(white: 0.45, alpha: 1.0))
drawText("6,420 Items", x: contentX + 52 + colWidth * 2, topY: btmY + 90, size: 18, weight: .bold, color: .white)
cg.restoreGState()

NSGraphicsContext.restoreGraphicsState()

if let pngData = rep.representation(using: .png, properties: [:]) {
    try pngData.write(to: URL(fileURLWithPath: "docs/screenshots/dashboard-hero.png"))
    print("Generated Hero Showcase: docs/screenshots/dashboard-hero.png (\(pngData.count / 1024) KB)")
}
