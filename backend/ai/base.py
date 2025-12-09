"""Base Model Service.

Base class for all AI/ML model services following singleton pattern
and consistent interface for resource management.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class BaseModelService(ABC):
    """Base class for all model services.

    Provides singleton pattern and consistent interface for loading
    and managing AI/ML models. All model services should inherit from this class.

    Attributes:
        _instance: Class-level instance for singleton pattern
        _is_loaded: Flag indicating if model has been loaded
    """

    _instance: Optional['BaseModelService'] = None
    _is_loaded: bool = False

    def __new__(cls):
        """Singleton pattern to ensure only one instance exists."""
        if cls._instance is None:
            cls._instance = super(BaseModelService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the model service."""
        if not self._is_loaded:
            self._load_model()

    @abstractmethod
    def _load_model(self):
        """Load the model. Must be implemented by subclasses."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if model is loaded and available.

        Returns:
            True if model is loaded and ready to use, False otherwise
        """
        pass

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model for debugging and monitoring.

        Returns:
            Dictionary containing model information
        """
        return {
            "is_loaded": self._is_loaded,
            "is_available": self.is_available(),
            "class_name": self.__class__.__name__,
        }

