"""Quick check that backend DB settings connect (uses project root .env)."""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from data.database import connect_db  # noqa: E402


def main() -> None:
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT current_database(), current_user, "
                "(SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public')"
            )
            row = cur.fetchone()
        print("OK:", row)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = 'users')"
            )
            has_users = cur.fetchone()[0]
            n_users = None
            if has_users:
                cur.execute("SELECT COUNT(*) FROM public.users")
                n_users = cur.fetchone()[0]
        print(f"public.users: exists={has_users}" + (f", rows={n_users}" if has_users else ""))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
