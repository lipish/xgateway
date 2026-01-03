use std::sync::Arc;
use crate::db::DatabasePool;
use crate::pool::PoolManager;

#[derive(Clone)]
pub struct ProxyState {
    pub db_pool: DatabasePool,
    pub pool_manager: Arc<PoolManager>,
}
