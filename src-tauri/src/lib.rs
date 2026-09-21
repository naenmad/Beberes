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
    delete_specific_trash_items, empty_mac_trash, empty_trash_older_than, open_full_disk_access_settings,
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
use commands::ports::{kill_process_by_pid, list_active_ports};
use commands::xcode_sim::{clean_xcode_target, purge_unavailable_simulators, scan_xcode_environments};
use commands::dormant::{hibernate_project, scan_dormant_projects};
use commands::popover::{hide_popover, open_main_window_from_popover};
use commands::hardware::get_hardware_intelligence;
use commands::scheduler::{get_schedule_config, save_schedule_config, trigger_scheduled_clean_now};
use commands::similar_media::{delete_similar_photos, scan_similar_photos};
use commands::plugins::{remove_plugin_or_extension, scan_browser_and_system_plugins};
use commands::report::export_report_markdown;
use commands::notification::{quick_look_preview, set_dock_badge, show_system_notification};
use commands::cli_installer::{check_cli_installed, install_cli_symlink};

use std::sync::atomic::{AtomicBool, Ordering};

static IS_QUITTING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn exit_app() {
    IS_QUITTING.store(true, Ordering::SeqCst);
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            *s
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.as_str()
        } else {
            "unknown panic payload"
        };
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());
        let log_msg = format!("PANIC at [{}]: {}\n", location, payload);
        eprintln!("{}", log_msg);
        if let Some(home) = dirs::home_dir() {
            let panic_file = home.join("Library/Logs/beberes-panic.log");
            let _ = std::fs::write(panic_file, log_msg);
        }
    }));

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if window.label() == "popover" {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = window.hide();
                }
            } else if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if IS_QUITTING.load(Ordering::SeqCst) {
                    return;
                }
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
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        if let Some(popover) = tray.app_handle().get_webview_window("popover") {
                            let is_visible = popover.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = popover.hide();
                            } else {
                                let scale_factor = popover.scale_factor().unwrap_or(1.0);
                                let win_size = popover.outer_size().unwrap_or(tauri::PhysicalSize {
                                    width: (360.0 * scale_factor) as u32,
                                    height: (480.0 * scale_factor) as u32,
                                });
                                let (pos_x, pos_y) = match rect.position {
                                    tauri::Position::Physical(p) => (p.x, p.y),
                                    tauri::Position::Logical(l) => ((l.x * scale_factor) as i32, (l.y * scale_factor) as i32),
                                };
                                let (size_w, size_h) = match rect.size {
                                    tauri::Size::Physical(s) => (s.width as i32, s.height as i32),
                                    tauri::Size::Logical(l) => ((l.width * scale_factor) as i32, (l.height * scale_factor) as i32),
                                };
                                let target_x = pos_x + (size_w / 2) - (win_size.width as i32 / 2);
                                let target_y = pos_y + size_h + 4;
                                let _ = popover.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                                    x: target_x.max(8),
                                    y: target_y,
                                }));
                                let _ = popover.show();
                                let _ = popover.set_focus();
                            }
                        }
                    }
                })
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
                        let app_handle = app.clone();
                        std::thread::spawn(move || {
                            let _ = commands::memory::purge_inactive_memory();
                            let _ = app_handle.emit("memory-purged", ());
                        });
                    }
                    "empty_trash" => {
                        let app_handle = app.clone();
                        std::thread::spawn(move || {
                            let _ = commands::trash::empty_mac_trash();
                            let _ = app_handle.emit("trash-emptied", ());
                        });
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
                        IS_QUITTING.store(true, Ordering::SeqCst);
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            #[cfg(target_os = "macos")]
            {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = window_vibrancy::apply_vibrancy(
                        &main_window,
                        window_vibrancy::NSVisualEffectMaterial::UnderWindowBackground,
                        None,
                        None,
                    );
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            exit_app,
            show_system_notification,
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
            empty_trash_older_than,
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
            list_active_ports,
            kill_process_by_pid,
            scan_xcode_environments,
            purge_unavailable_simulators,
            clean_xcode_target,
            scan_dormant_projects,
            hibernate_project,
            hide_popover,
            open_main_window_from_popover,
            get_hardware_intelligence,
            get_schedule_config,
            save_schedule_config,
            trigger_scheduled_clean_now,
            scan_similar_photos,
            delete_similar_photos,
            scan_browser_and_system_plugins,
            remove_plugin_or_extension,
            export_report_markdown,
            show_system_notification,
            quick_look_preview,
            set_dock_badge,
            check_cli_installed,
            install_cli_symlink,
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
