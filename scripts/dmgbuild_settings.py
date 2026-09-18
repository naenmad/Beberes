import os

# Volume name shown in Finder
volume_name = 'Beberes'

# Compression format (UDZO is zlib-compressed read-only DMG, native to macOS)
format = 'UDZO'

# Volume badge icon
badge_icon = 'src-tauri/icons/icon.icns'

# Application bundle to include
files = ['src-tauri/target/release/bundle/macos/Beberes.app']

# Symlink to /Applications
symlinks = {
    'Applications': '/Applications'
}

# Icon size in pixels
icon_size = 110.0

# Text label font size
text_size = 12.0

# Custom retina multi-resolution background
background = 'src-tauri/icons/dmg-background.tiff'

# Window bounds ((x, y), (width, height))
window_rect = ((250, 150), (600, 360))

# Default Finder view
default_view = 'icon-view'

# Minimalist chrome without unnecessary Finder panels
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False

# Symmetrically positioned icons matching center arrow and badge
icon_locations = {
    'Beberes.app': (130, 165),
    'Applications': (470, 165),
}

# Hide file extension
hide_extensions = ['Beberes.app']
