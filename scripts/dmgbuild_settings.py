import os

# Volume name shown in Finder
volume_name = 'Beberes'

# Compression format
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

# Clean Zero-Asset background (inherits macOS native light/dark appearance seamlessly)
background = None

# Compact, focused window bounds ((x, y), (width, height))
window_rect = ((300, 200), (540, 300))

# Default Finder view
default_view = 'icon-view'

# Minimalist chrome without unnecessary Finder panels
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False

# Symmetrically positioned icons
icon_locations = {
    'Beberes.app': (145, 120),
    'Applications': (395, 120),
}

# Hide file extension
hide_extensions = ['Beberes.app']
