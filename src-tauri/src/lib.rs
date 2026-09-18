mod commands;
mod utils;

use tauri::Manager;
use commands::cleaner::{clean_selected_items, pick_files, pick_folder, reveal_in_finder};
use commands::finder::scan_finder_items;
use commands::git_sweeper::{optimize_git_repo, scan_git_repos};
use commands::installer::{check_is_in_applications_dir, move_to_applications_and_relaunch};
use commands::organizer::{clean_redundant_installers, execute_tidy_organization, scan_tidy_directory};
use commands::reviewer::{read_file_thumbnail, read_text_preview, rename_file, scan_review_files};
use commands::scanner::{
    clear_icon_cache, get_all_disks, get_disk_info, get_disk_info_by_mount, get_system_details,
    get_system_power_status, run_brew_cleanup, scan_custom_paths, scan_dev_workspaces,
    scan_system_directories,
};
use commands::shredder::shred_paths;
use commands::startup::{delete_startup_item, scan_startup_items, toggle_startup_item};
use commands::trash::{
    delete_specific_trash_items, empty_mac_trash, open_full_disk_access_settings,
    scan_trash_contents,
};
use commands::uninstaller::{scan_installed_apps, uninstall_app};
use commands::visualizer::scan_directory_tree;
use commands::snapshots::{delete_all_apfs_snapshots, delete_apfs_snapshot, list_apfs_snapshots};
use commands::memory::{get_memory_status, purge_inactive_memory};
use commands::browser::scan_browser_caches;
use commands::maintenance::{clean_maintenance_items, scan_maintenance_items};
use commands::orphaned::{clean_orphaned_leftovers, scan_orphaned_leftovers};
use commands::smart_rules::{archive_old_downloads, consolidate_desktop_screenshots, get_smart_rules_stats};

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(target_os = "macos")]
                {
                    api.prevent_close();
                    let _ = window.hide();
                    let _ = window.app_handle().hide();
                }
            }
        })
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
            use tauri::tray::TrayIconBuilder;
            use tauri::{Emitter, Manager};

            let title_i = MenuItem::with_id(app, "title", "Beberes - Mac Cleaner & Optimizer", false, None::<&str>)?;
            let sep0 = PredefinedMenuItem::separator(app)?;
            let show_i = MenuItem::with_id(app, "show", "Open Beberes", true, Some("CmdOrCtrl+O"))?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let smart_clean_i = MenuItem::with_id(app, "smart_clean", "Quick Smart Clean", true, None::<&str>)?;
            let free_ram_i = MenuItem::with_id(app, "free_ram", "Free Up Inactive RAM", true, None::<&str>)?;
            let empty_trash_i = MenuItem::with_id(app, "empty_trash", "Empty macOS Trash", true, None::<&str>)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let dashboard_i = MenuItem::with_id(app, "nav_dashboard", "Dashboard", true, None::<&str>)?;
            let system_clean_i = MenuItem::with_id(app, "nav_system_clean", "System Clean", true, None::<&str>)?;
            let dev_workspace_i = MenuItem::with_id(app, "nav_dev_workspace", "Developer Workspace", true, None::<&str>)?;
            let tidy_up_i = MenuItem::with_id(app, "nav_tidy_up", "Tidy Up Desktop & Downloads", true, None::<&str>)?;
            let visualizer_i = MenuItem::with_id(app, "nav_visualizer", "Disk Space Visualizer", true, None::<&str>)?;
            let apps_i = MenuItem::with_id(app, "nav_apps", "App Uninstaller", true, None::<&str>)?;
            let sep3 = PredefinedMenuItem::separator(app)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Beberes", true, Some("CmdOrCtrl+Q"))?;

            let menu = Menu::with_items(
                app,
                &[
                    &title_i,
                    &sep0,
                    &show_i,
                    &sep1,
                    &smart_clean_i,
                    &free_ram_i,
                    &empty_trash_i,
                    &sep2,
                    &dashboard_i,
                    &system_clean_i,
                    &dev_workspace_i,
                    &tidy_up_i,
                    &visualizer_i,
                    &apps_i,
                    &sep3,
                    &hide_i,
                    &quit_i,
                ],
            )?;

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().expect("missing default window icon").clone())
                .icon_as_template(false)
                .tooltip("Beberes - Mac Cleaner & Optimizer")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                        let _ = app.hide();
                    }
                    "smart_clean" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "system-clean");
                            let _ = window.emit("quick-smart-clean", ());
                        }
                    }
                    "free_ram" => {
                        tokio::spawn(async {
                            let _ = commands::memory::purge_inactive_memory();
                        });
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("memory-purged", ());
                        }
                    }
                    "empty_trash" => {
                        tokio::spawn(async {
                            let _ = commands::trash::empty_mac_trash();
                        });
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("trash-emptied", ());
                        }
                    }
                    "nav_dashboard" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "dashboard");
                        }
                    }
                    "nav_system_clean" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "system-clean");
                        }
                    }
                    "nav_dev_workspace" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "dev-workspace");
                        }
                    }
                    "nav_tidy_up" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "tidy-up");
                        }
                    }
                    "nav_visualizer" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "disk-visualizer");
                        }
                    }
                    "nav_apps" => {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                        let _ = app.show();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate-to", "apps");
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
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
            read_text_preview,
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
            check_is_in_applications_dir,
            move_to_applications_and_relaunch,
            list_apfs_snapshots,
            delete_apfs_snapshot,
            delete_all_apfs_snapshots,
            get_memory_status,
            purge_inactive_memory,
            scan_browser_caches,
            scan_maintenance_items,
            clean_maintenance_items,
            run_brew_cleanup,
            scan_orphaned_leftovers,
            clean_orphaned_leftovers,
            get_smart_rules_stats,
            archive_old_downloads,
            consolidate_desktop_screenshots,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
            if !has_visible_windows {
                let _ = app_handle.show();
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        }
    });
}
