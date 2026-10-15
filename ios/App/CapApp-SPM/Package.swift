// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.2"),
        .package(name: "CapgoCapacitorNativeNavigation", path: "../../../node_modules/@capgo/capacitor-native-navigation"),
        .package(name: "Ddibara5CapacitorWindowAppearance", path: "../../../node_modules/@ddibara5/capacitor-window-appearance")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapgoCapacitorNativeNavigation", package: "CapgoCapacitorNativeNavigation"),
                .product(name: "Ddibara5CapacitorWindowAppearance", package: "Ddibara5CapacitorWindowAppearance")
            ]
        )
    ]
)
