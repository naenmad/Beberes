mod commands;
mod utils;

use commands::cleaner::{clean_selected_items, pick_files, pick_folder, reveal_in_finder};
use commands::finder::scan_finder_items;
use commands::git_sweeper::{optimize_git_repo, scan_git_repos};
use commands::organizer::{clean_redundant_installers, execute_tidy_organization, scan_tidy_directory};
use commands::reviewer::{read_file_thumbnail, rename_file, scan_review_files};
use commands::scanner::{
    clear_icon_cache, get_all_disks, get_disk_info, get_disk_info_by_mount, get_system_details,
    get_system_power_status, scan_custom_paths, scan_dev_workspaces, scan_system_directories,
};
use commands::shredder::shred_paths;
use commands::startup::{delete_startup_item, scan_startup_items, toggle_startup_item};
use commands::trash::{
    delete_specific_trash_items, empty_mac_trash, open_full_disk_access_settings,
    scan_trash_contents,
};
use commands::uninstaller::{scan_installed_apps, uninstall_app};
use commands::visualizer::scan_directory_tree;

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(target_os = "macos")]
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;
            use tauri::{Emitter, Manager};

            let show_i = MenuItem::with_id(app, "show", "Open Beberes", true, None::<&str>)?;
            let smart_clean_i = MenuItem::with_id(app, "smart_clean", "Quick Smart Clean", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Beberes", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &smart_clean_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "smart_clean" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("quick-smart-clean", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(is_visible) = window.is_visible() {
                                if is_visible {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            exit_app,
            get_system_power_status,
            scan_system_directories,
            scan_dev_workspaces,
            scan_custom_paths,
            get_disk_info,
            get_all_disks,
            get_disk_info_by_mount,
            get_system_details,
            clear_icon_cache,
            clean_selected_items,
            reveal_in_finder,
            pick_folder,
            pick_files,
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
            open_full_disk_access_settings,
            scan_directory_tree,
            scan_startup_items,
            toggle_startup_item,
            delete_startup_item,
            shred_paths,
            scan_git_repos,
            optimize_git_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
