import argparse

from app.maintenance import (
    cleanup_expired_statuses,
    cleanup_orphan_media,
    process_pending_account_deletions,
    purge_all_test_users,
)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VIBE maintenance tasks")
    parser.add_argument(
        "--purge-all-test-users",
        action="store_true",
        help="Delete every user only in development/test/staging with explicit confirmation env.",
    )
    args = parser.parse_args()

    if args.purge_all_test_users:
        print({"purged_test_users": purge_all_test_users()})
    else:
        print({
            "expired_statuses": cleanup_expired_statuses(),
            "orphan_media": cleanup_orphan_media(),
            "account_deletions": process_pending_account_deletions(),
        })
