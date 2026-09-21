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
