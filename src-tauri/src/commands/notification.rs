/// Native macOS Notification Command
#[tauri::command]
pub fn show_system_notification(title: String, body: String, sound: Option<String>) {
    let sound_name = sound.unwrap_or_else(|| "default".to_string());
    let clean_body = body.replace('\\', "\\\\").replace('"', "\\\"");
    let clean_title = title.replace('\\', "\\\\").replace('"', "\\\"");
    let script = format!(
        "display notification \"{}\" with title \"{}\" sound name \"{}\"",
        clean_body, clean_title, sound_name
    );

    std::thread::spawn(move || {
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .output();
    });
}

/// Native macOS Quick Look preview (qlmanage -p)
#[tauri::command]
pub fn quick_look_preview(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if !std::path::Path::new(&path).exists() {
            return Err("File not found".to_string());
        }
        std::thread::spawn(move || {
            let _ = std::process::Command::new("qlmanage")
                .arg("-p")
                .arg(&path)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn();
        });
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Quick Look is only supported on macOS".to_string())
    }
}

/// Native macOS Dock Badge
#[tauri::command]
pub fn set_dock_badge(badge: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn objc_getClass(name: *const libc::c_char) -> *mut libc::c_void;
            fn sel_registerName(name: *const libc::c_char) -> *mut libc::c_void;
            fn objc_msgSend(receiver: *mut libc::c_void, sel: *mut libc::c_void, ...) -> *mut libc::c_void;
        }

        unsafe {
            let cls_nsapp = objc_getClass(b"NSApplication\0".as_ptr() as _);
            if cls_nsapp.is_null() {
                return Ok(());
            }
            let sel_shared = sel_registerName(b"sharedApplication\0".as_ptr() as _);
            let app: *mut libc::c_void = objc_msgSend(cls_nsapp, sel_shared);
            if app.is_null() {
                return Ok(());
            }
            let sel_dock = sel_registerName(b"dockTile\0".as_ptr() as _);
            let dock_tile: *mut libc::c_void = objc_msgSend(app, sel_dock);
            if dock_tile.is_null() {
                return Ok(());
            }
            let sel_set_badge = sel_registerName(b"setBadgeLabel:\0".as_ptr() as _);

            let label_obj = match badge {
                Some(b) if !b.is_empty() => {
                    let cls_nsstr = objc_getClass(b"NSString\0".as_ptr() as _);
                    let sel_str_with_utf8 = sel_registerName(b"stringWithUTF8String:\0".as_ptr() as _);
                    let c_str = std::ffi::CString::new(b).unwrap_or_default();
                    objc_msgSend(cls_nsstr, sel_str_with_utf8, c_str.as_ptr())
                }
                _ => std::ptr::null_mut(),
            };

            let _: *mut libc::c_void = objc_msgSend(dock_tile, sel_set_badge, label_obj);
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = badge;
        Ok(())
    }
}
