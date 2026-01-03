use std::sync::atomic::{AtomicU64, Ordering};

static INSTANCE_ID: AtomicU64 = AtomicU64::new(0);

pub fn init_instance_id() {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("System time went backwards")
        .as_secs();
    INSTANCE_ID.store(timestamp, Ordering::SeqCst);
}

#[allow(dead_code)]
pub fn get_instance_id() -> u64 {
    INSTANCE_ID.load(Ordering::SeqCst)
}