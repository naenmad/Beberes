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
icon_size = 120.0

# Text label font size
text_size = 13.0

# Custom retina background
background = 'src-tauri/icons/dmg-background.tiff'

# Window bounds ((x, y), (width, height))
window_rect = ((250, 150), (660, 400))

# Default Finder view
default_view = 'icon-view'

# Hide toolbars and bars for clean modal installer look
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False

# Icon positions centered over the background circles
icon_locations = {
    'Beberes.app': (180, 190),
    'Applications': (480, 190),
}

# Hide file extension
hide_extensions = ['Beberes.app']
