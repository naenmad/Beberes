// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Beberes",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "Beberes",
            targets: ["Beberes"]
        )
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "Beberes",
            dependencies: [],
            path: "Sources/Beberes"
        ),
        .testTarget(
            name: "BeberesTests",
            dependencies: ["Beberes"],
            path: "Tests/BeberesTests"
        )
    ]
)
