use tauri::{Emitter, Manager};

#[tauri::command]
pub fn hide_popover(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(popover) = app.get_webview_window("popover") {
        let _ = popover.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn open_main_window_from_popover(
    app: tauri::AppHandle,
    target_page: Option<String>,
) -> Result<(), String> {
    // Hide popover
    if let Some(popover) = app.get_webview_window("popover") {
        let _ = popover.hide();
    }

    // Show main window
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    let _ = app.show();
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
        if let Some(page) = target_page {
            let _ = main.emit("navigate-to", page);
        }
    }
    Ok(())
}
