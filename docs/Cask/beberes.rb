cask "beberes" do
  version "1.0.0"
  sha256 "671e04583c3d9604c562141591aca78ad90fdcdfeb07f9148157576b245a33c4"

  url "https://github.com/naenmad/Beberes/releases/download/v#{version}/Beberes_#{version}_aarch64.dmg"
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
