import os
import psycopg2
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

def connect_db():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

def export_freelancer_data():
    """Fetch all freelancer data from database and export to .txt file"""
    conn = connect_db()
    
    try:
        with conn.cursor() as cur:
            # Fetch all freelancer data - use SELECT * to get all available columns
            cur.execute("SELECT * FROM freelancer ORDER BY freelancer_id")
            
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            
            # Prepare output file
            output_file = "freelancer_data_export.txt"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write("FREELANCER DATA EXPORT\n")
                f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total Records: {len(rows)}\n")
                f.write("=" * 80 + "\n\n")
                
                if not rows:
                    f.write("No freelancer records found in the database.\n")
                else:
                    for idx, row in enumerate(rows, 1):
                        f.write(f"\n{'=' * 80}\n")
                        f.write(f"RECORD #{idx}\n")
                        f.write(f"{'=' * 80}\n\n")
                        
                        # Create a dictionary from row data
                        record = dict(zip(columns, row))
                        
                        # Write each field
                        for col in columns:
                            value = record[col]
                            
                            # Format the value
                            if value is None:
                                formatted_value = "[NULL]"
                            elif isinstance(value, datetime):
                                formatted_value = value.strftime('%Y-%m-%d %H:%M:%S')
                            elif isinstance(value, (int, float)):
                                formatted_value = str(value)
                            else:
                                formatted_value = str(value)
                            
                            # Truncate very long text fields for readability
                            if col in ['professional_summary', 'resume_text', 'projects', 'certifications']:
                                if formatted_value and len(formatted_value) > 500:
                                    formatted_value = formatted_value[:500] + "... [TRUNCATED]"
                            
                            f.write(f"{col:25}: {formatted_value}\n")
                        
                        f.write("\n")
                
                # Summary section
                f.write("\n" + "=" * 80 + "\n")
                f.write("SUMMARY\n")
                f.write("=" * 80 + "\n")
                f.write(f"Total Freelancers: {len(rows)}\n")
                
                if rows:
                    # Count by domain
                    domain_counts = {}
                    for row in rows:
                        domain = row[columns.index('domain')]
                        if domain:
                            domain_counts[domain] = domain_counts.get(domain, 0) + 1
                    
                    if domain_counts:
                        f.write("\nFreelancers by Domain:\n")
                        for domain, count in sorted(domain_counts.items()):
                            f.write(f"  - {domain}: {count}\n")
                    
                    # List all IDs
                    f.write("\nAll Freelancer IDs:\n")
                    freelancer_ids = [str(row[columns.index('freelancer_id')]) for row in rows]
                    f.write(f"  {', '.join(freelancer_ids)}\n")
                    
                    f.write("\nAll User IDs:\n")
                    user_ids = [str(row[columns.index('user_id')]) for row in rows if row[columns.index('user_id')]]
                    f.write(f"  {', '.join(user_ids)}\n")
            
            print(f"✅ Successfully exported {len(rows)} freelancer records to '{output_file}'")
            return output_file
            
    except Exception as e:
        print(f"❌ Error exporting freelancer data: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    export_freelancer_data()

