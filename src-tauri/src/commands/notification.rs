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
            fn objc_msgSend();
        }

        unsafe {
            type MsgSendNoArgs = unsafe extern "C" fn(*mut libc::c_void, *mut libc::c_void) -> *mut libc::c_void;
            type MsgSendOnePtr = unsafe extern "C" fn(*mut libc::c_void, *mut libc::c_void, *const libc::c_char) -> *mut libc::c_void;
            type MsgSendOneIdVoid = unsafe extern "C" fn(*mut libc::c_void, *mut libc::c_void, *mut libc::c_void);

            let msg_send_noargs: MsgSendNoArgs = std::mem::transmute(objc_msgSend as *const ());
            let msg_send_one_ptr: MsgSendOnePtr = std::mem::transmute(objc_msgSend as *const ());
            let msg_send_one_id_void: MsgSendOneIdVoid = std::mem::transmute(objc_msgSend as *const ());

            let cls_nsapp = objc_getClass(b"NSApplication\0".as_ptr() as _);
            if cls_nsapp.is_null() {
                return Ok(());
            }
            let sel_shared = sel_registerName(b"sharedApplication\0".as_ptr() as _);
            let app = msg_send_noargs(cls_nsapp, sel_shared);
            if app.is_null() {
                return Ok(());
            }
            let sel_dock = sel_registerName(b"dockTile\0".as_ptr() as _);
            let dock_tile = msg_send_noargs(app, sel_dock);
            if dock_tile.is_null() {
                return Ok(());
            }
            let sel_set_badge = sel_registerName(b"setBadgeLabel:\0".as_ptr() as _);

            match badge {
                Some(ref b) if !b.trim().is_empty() => {
                    let cls_nsstr = objc_getClass(b"NSString\0".as_ptr() as _);
                    let sel_alloc = sel_registerName(b"alloc\0".as_ptr() as _);
                    let sel_init = sel_registerName(b"initWithUTF8String:\0".as_ptr() as _);
                    let sel_release = sel_registerName(b"release\0".as_ptr() as _);

                    let c_str = std::ffi::CString::new(b.as_str()).unwrap_or_default();
                    let allocated = msg_send_noargs(cls_nsstr, sel_alloc);
                    if !allocated.is_null() {
                        let ns_str = msg_send_one_ptr(allocated, sel_init, c_str.as_ptr());
                        if !ns_str.is_null() {
                            msg_send_one_id_void(dock_tile, sel_set_badge, ns_str);
                            let msg_send_release: MsgSendNoArgs = std::mem::transmute(objc_msgSend as *const ());
                            msg_send_release(ns_str, sel_release);
                        } else {
                            msg_send_one_id_void(dock_tile, sel_set_badge, std::ptr::null_mut());
                        }
                    }
                }
                _ => {
                    // Pass nil to clear the badge
                    msg_send_one_id_void(dock_tile, sel_set_badge, std::ptr::null_mut());
                }
            }
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = badge;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_dock_badge_safety() {
        assert!(set_dock_badge(None).is_ok());
        assert!(set_dock_badge(Some("".to_string())).is_ok());
        assert!(set_dock_badge(Some("42".to_string())).is_ok());
        assert!(set_dock_badge(None).is_ok());
    }
}

