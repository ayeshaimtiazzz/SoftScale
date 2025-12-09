# Proposal Generator Datasets

This directory contains datasets used for training and fine-tuning the proposal generator model.

## Structure

```
datasets/
├── proposals/          # Markdown proposal templates
│   └── *.md           # Individual proposal files
└── training/          # CSV training datasets
    └── *.csv          # Training data files
```

## Datasets

### Proposals (`proposals/`)
Markdown files containing proposal templates and examples. These are used as:
- Template examples for users
- Training data for fine-tuning
- Reference material for proposal structure

### Training Data (`training/`)
CSV files containing structured training data with columns:
- `Instruction` / `instruction` - Instructions for proposal generation
- `Prompt` / `prompt` / `user_input` - User input/prompt
- `Output` / `output` / `proposal_output` - Expected proposal output

## Usage

These datasets are imported into the database using:
```bash
python backend/scripts/import_proposal_templates.py
```

## File Locations

**Current Location (to be migrated):**
- Proposals: `backend/materials/proposals/`
- Training CSVs: `backend/materials/proposal generator datasets-20251207T102310Z-3-001/proposal generator datasets/*.csv`

**Target Location:**
- Proposals: `backend/ai/models/proposal_generator/datasets/proposals/`
- Training CSVs: `backend/ai/models/proposal_generator/datasets/training/`

