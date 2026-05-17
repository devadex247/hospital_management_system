import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path

# Database file path
DB_DIR = Path(__file__).parent
DB_FILE = os.path.join(DB_DIR, "hospital_management.db")

def get_database_path():
    """Get the absolute path to the database file."""
    return DB_FILE

def initialize_database():
    """Initialize the database with the schema."""
    schema_path = os.path.join(DB_DIR, "schema.sql")
    
    # Create database directory if it doesn't exist
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
    
    # Read and execute schema
    if os.path.exists(schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        with get_connection() as conn:
            conn.executescript(schema_sql)
            conn.commit()
        print("Database initialized successfully")
    else:
        raise FileNotFoundError(f"Schema file not found at {schema_path}")

@contextmanager
def get_connection():
    """Context manager for database connections."""
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row  # Enable dictionary-like access
        yield conn
    except sqlite3.Error as e:
        print(f"Database connection error: {e}")
        raise
    finally:
        if conn:
            conn.close()

def ensure_database_exists():
    """Ensure the database exists and is initialized."""
    if not os.path.exists(DB_FILE):
        initialize_database()
    return True

# Auto-initialize on module import
ensure_database_exists()
