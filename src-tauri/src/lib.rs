mod commands;
mod utils;

use commands::cleaner::{clean_selected_items, pick_folder, reveal_in_finder};
use commands::scanner::{get_disk_info, scan_custom_paths, scan_dev_workspaces, scan_system_directories};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_system_directories,
            scan_dev_workspaces,
            scan_custom_paths,
            get_disk_info,
            clean_selected_items,
            reveal_in_finder,
            pick_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
