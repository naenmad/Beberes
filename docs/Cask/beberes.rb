# typed: strict
# frozen_string_literal: true

cask "beberes" do
  version "1.1.0"
  sha256 "b7ac080eb7b10b80514df9ccfb5f284e7ca945ef8718431e96a22667fe8b2c55"

  url "https://github.com/naenmad/Beberes/releases/download/v#{version}/Beberes_#{version}_aarch64.dmg"
  name "Beberes"
  desc "High-performance system cleaner and storage optimizer"
  homepage "https://github.com/naenmad/Beberes"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: :monterey

  app "Beberes.app"

  zap trash: [
    "~/Library/Application Support/com.beberes.app",
    "~/Library/Caches/com.beberes.app",
    "~/Library/Saved Application State/com.beberes.app.savedState",
  ]
end
