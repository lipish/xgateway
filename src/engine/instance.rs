use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static INSTANCE_ID: AtomicU64 = AtomicU64::new(0);

/// Initialize the unique instance ID using the current timestamp.
/// This should be called once during application startup.
pub fn init_instance_id() -> u64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    INSTANCE_ID.store(now, Ordering::SeqCst);
    now
}

/// Get the current unique instance ID.
#[allow(dead_code)]
pub fn get_instance_id() -> u64 {
    INSTANCE_ID.load(Ordering::SeqCst)
}
