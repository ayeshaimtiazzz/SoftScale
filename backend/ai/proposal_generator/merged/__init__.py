"""Proposal generator for merged model folder.

This module provides production-ready proposal generation that respects:
- Template selection and structure
- Custom options
- Project title and formalities
- Tone requirements
- Page length requirements
- Detail level (detailed or summarized)
"""
from ai.proposal_generator.merged.proposal_generator import generate_proposal

__all__ = ['generate_proposal']
