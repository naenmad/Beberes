// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli;

fn main() {
    if cli::handle_cli_args() {
        return;
    }

    beberes_app_lib::run()
}
