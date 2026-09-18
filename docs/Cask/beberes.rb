cask "beberes" do
  arch arm: "aarch64", intel: "x64"

  version "1.0.0"
  sha256 arm:   "0000000000000000000000000000000000000000000000000000000000000000",
         intel: "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/naenmad/Beberes/releases/download/v#{version}/Beberes_#{version}_#{arch}.dmg"
  name "Beberes"
  desc "High-Performance System Cleaner & Storage Optimizer for macOS"
  homepage "https://github.com/naenmad/Beberes"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :monterey"

  app "Beberes.app"

  zap trash: [
    "~/Library/Application Support/com.beberes.app",
    "~/Library/Caches/com.beberes.app",
    "~/Library/Saved Application State/com.beberes.app.savedState",
  ]
end
