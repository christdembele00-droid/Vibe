from app.maintenance import cleanup_expired_statuses, cleanup_orphan_media, process_pending_account_deletions

if __name__ == "__main__":
    print({
        "expired_statuses": cleanup_expired_statuses(),
        "orphan_media": cleanup_orphan_media(),
        "account_deletions": process_pending_account_deletions(),
    })
