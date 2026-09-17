/// Utility functions for file size formatting and path validation.

/// Format bytes into a human-readable string (KB, MB, GB, TB).
#[allow(dead_code)]
pub fn format_size(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }
    let units = ["B", "KB", "MB", "GB", "TB"];
    let k: f64 = 1024.0;
    let i = (bytes as f64).ln() / k.ln();
    let i = i.floor() as usize;
    let i = i.min(units.len() - 1);
    let size = bytes as f64 / k.powi(i as i32);
    if i == 0 {
        format!("{} {}", size as u64, units[i])
    } else {
        format!("{:.1} {}", size, units[i])
    }
}

/// Whitelisted paths that should never be deleted.
const WHITELIST: &[&str] = &[
    "/System",
    "/Library/CoreServices",
    "/usr",
    "/bin",
    "/sbin",
    "/private/var/db",
    "/Library/Apple",
];

/// Check if a path is whitelisted (protected from deletion).
pub fn is_whitelisted(path: &str) -> bool {
    WHITELIST.iter().any(|w| path.starts_with(w))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_size() {
        assert_eq!(format_size(0), "0 B");
        assert_eq!(format_size(512), "512 B");
        assert_eq!(format_size(1024), "1.0 KB");
        assert_eq!(format_size(1_048_576), "1.0 MB");
        assert_eq!(format_size(1_073_741_824), "1.0 GB");
    }

    #[test]
    fn test_is_whitelisted() {
        assert!(is_whitelisted("/System/Library"));
        assert!(is_whitelisted("/usr/local/bin"));
        assert!(!is_whitelisted("/Users/mac/Library/Caches"));
    }
}
