"""Database connection and utilities."""
import psycopg2
from psycopg2 import sql
import json
from config import settings

def connect_db():
    """Create and return a database connection."""
    return psycopg2.connect(**settings.db_config)

def get_db():
    """Get database connection (dependency for FastAPI)."""
    return connect_db()

def get_primary_keys(conn, table_name):
    """Get primary key columns for a table."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid
            AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass
            AND i.indisprimary;
        """, (table_name,))
        return {row[0] for row in cur.fetchall()}

def get_table_columns(conn, table_name):
    """Get column information for a table."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table_name,))
        return cur.fetchall()

def insert_dynamic(conn, table_name, preset_values=None):
    """Dynamically insert data into a table."""
    preset_values = preset_values or {}
    columns_info = get_table_columns(conn, table_name)
    primary_keys = get_primary_keys(conn, table_name)
    skip_cols = set(primary_keys) | {
        "embedding_vector_id", "resume_text", "created_at", "updated_at",
        "name", "email", "company_id", "skill_embedding"
    }
    data = {}
    for col_name, col_type in columns_info:
        if col_name in preset_values or col_name in skip_cols:
            continue
        if col_type == "jsonb":
            data[col_name] = json.dumps([])  # Default to empty array
        else:
            data[col_name] = preset_values.get(col_name, None)
    final_data = {**data, **preset_values}
    col_names = list(final_data.keys())
    query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        sql.Identifier(table_name),
        sql.SQL(", ").join(map(sql.Identifier, col_names)),
        sql.SQL(", ").join(sql.Placeholder() * len(col_names))
    )
    with conn.cursor() as cur:
        cur.execute(query, [final_data[c] for c in col_names])
        conn.commit()
