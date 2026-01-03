pub mod types;
pub mod tencent;
pub mod generic;

pub use types::RequestResult;
pub use tencent::send_to_tencent;
pub use generic::send_to_provider;
