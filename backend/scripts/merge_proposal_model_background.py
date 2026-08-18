"""Background version of merge script that runs without interactive terminal.

This version can be run without -it flag to avoid timeout issues.

Usage:
    docker exec softscale-backend python scripts/merge_proposal_model_background.py > merge.log 2>&1

Then check progress:
    docker exec softscale-backend tail -f merge.log
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the merge function
from scripts.merge_proposal_model import merge_model

if __name__ == "__main__":
    print("=" * 70)
    print("MERGE MODEL (Background Mode)")
    print("=" * 70)
    print("This script runs without interactive terminal to avoid timeouts.")
    print("Check merge.log for progress.")
    print()

    success = merge_model()

    if success:
        print("\n✅ MERGE COMPLETE!")
        print("Check /app/ai/proposal_generator/model/merged/ for files")
    else:
        print("\n❌ MERGE FAILED!")
        print("Check error messages above")

    sys.exit(0 if success else 1)

