mod commands;
mod utils;

use commands::cleaner::{clean_selected_items, pick_folder, reveal_in_finder};
use commands::finder::scan_finder_items;
use commands::organizer::{clean_redundant_installers, execute_tidy_organization, scan_tidy_directory};
use commands::reviewer::{read_file_thumbnail, rename_file, scan_review_files};
use commands::scanner::{
    clear_icon_cache, get_disk_info, get_system_details, scan_custom_paths, scan_dev_workspaces,
    scan_system_directories,
};
use commands::trash::{delete_specific_trash_items, empty_mac_trash, scan_trash_contents};
use commands::uninstaller::{scan_installed_apps, uninstall_app};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_system_directories,
            scan_dev_workspaces,
            scan_custom_paths,
            get_disk_info,
            get_system_details,
            clear_icon_cache,
            clean_selected_items,
            reveal_in_finder,
            pick_folder,
            scan_tidy_directory,
            execute_tidy_organization,
            clean_redundant_installers,
            scan_installed_apps,
            uninstall_app,
            scan_review_files,
            read_file_thumbnail,
            rename_file,
            scan_finder_items,
            scan_trash_contents,
            empty_mac_trash,
            delete_specific_trash_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
