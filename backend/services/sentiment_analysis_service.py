"""Sentiment Analysis Service.

Integrates the standalone sentiment_analysis notebook code into the backend.
Uses the helper functions from the original folder for all processing and
returns a structured result that matches the expected_output JSON used by the frontend.
"""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

from config import settings
from services.sentiment_result_cache import cache_key, get_cached, set_cached
from ai.sentiment_analysis import (
    preprocessing,
    sentiment,
    intent,
    sarcasm,
    scoring,
    strategy,
    key_signals,
    urgency,
    next_actions,
    summary,
    generation,
    report_generation,
)


class SentimentAnalysisService:
    """High-level service that runs the full sentiment analysis pipeline."""

    _instance: "SentimentAnalysisService | None" = None
    _model = None
    _tokenizer = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ---------------------------
    # LLM management
    # ---------------------------
    def _ensure_llm_loaded(self) -> None:
        """Lazily load the Llama model used for summarization, key signals, reply and report."""
        if self._model is not None and self._tokenizer is not None:
            return

        # Local-only policy: prefer merged local model, then local base model path.
        merged_path = settings.PROPOSAL_MERGED_MODEL_PATH
        if os.path.exists(merged_path) and os.path.exists(os.path.join(merged_path, "config.json")):
            model_source = merged_path
        elif os.path.exists(settings.PROPOSAL_BASE_MODEL_PATH) and os.path.exists(
            os.path.join(settings.PROPOSAL_BASE_MODEL_PATH, "config.json")
        ):
            model_source = settings.PROPOSAL_BASE_MODEL_PATH
        else:
            raise FileNotFoundError(
                "No local proposal model found. Expected either merged model at "
                f"{settings.PROPOSAL_MERGED_MODEL_PATH} or base model at "
                f"{settings.PROPOSAL_BASE_MODEL_PATH}."
            )

        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-llm-load",
                            "location": "sentiment_analysis_service.py:_ensure_llm_loaded:before_load",
                            "message": "About to load LLM for sentiment analysis",
                            "data": {
                                "model_source": model_source,
                                "cuda_available": torch.cuda.is_available(),
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

        tokenizer = AutoTokenizer.from_pretrained(
            model_source,
            local_files_only=True,
            cache_dir=settings.HF_CACHE_DIR,
        )
        model = AutoModelForCausalLM.from_pretrained(
            model_source,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            trust_remote_code=True,
            low_cpu_mem_usage=torch.cuda.is_available(),
            local_files_only=True,
            cache_dir=settings.HF_CACHE_DIR,
        )

        model.eval()
        # CPU path is already on CPU; avoid explicit .to("cpu") which can fail for meta-init modules.

        self._model = model
        self._tokenizer = tokenizer

        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-llm-load",
                            "location": "sentiment_analysis_service.py:_ensure_llm_loaded:after_load",
                            "message": "Successfully loaded LLM for sentiment analysis",
                            "data": {
                                "model_source": model_source,
                                "device": str(getattr(model, "device", "unknown")),
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

    # ---------------------------
    # Public API
    # ---------------------------
    def analyze_message(self, message: str) -> Dict[str, Any]:
        """Run the full analysis and return structured result + long-form report text."""
        if not message or not message.strip():
            raise ValueError("Message must not be empty")

        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-flow",
                            "location": "sentiment_analysis_service.py:analyze_message:entry",
                            "message": "Entered analyze_message",
                            "data": {
                                "message_length": len(message),
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

        clean_text = preprocessing.clean_message(message)

        if settings.SENTIMENT_RESULT_CACHE_ENABLED:
            ck = cache_key(clean_text)
            cached = get_cached(ck, settings.SENTIMENT_RESULT_CACHE_TTL_SECONDS)
            if cached is not None:
                return cached

        self._ensure_llm_loaded()
        model = self._model
        tokenizer = self._tokenizer

        if settings.SENTIMENT_PARALLEL_CLASSIFIERS:
            with ThreadPoolExecutor(max_workers=2) as pool:
                fut_sent = pool.submit(sentiment.get_sentiment, clean_text)
                fut_intent = pool.submit(intent.predict_intent_with_confidence, clean_text)
                sentiment_result = fut_sent.result()
                intent_label, intent_conf = fut_intent.result()
        else:
            sentiment_result = sentiment.get_sentiment(clean_text)
            intent_label, intent_conf = intent.predict_intent_with_confidence(clean_text)

        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-flow",
                            "location": "sentiment_analysis_service.py:analyze_message:after_basic_models",
                            "message": "Got sentiment and intent results",
                            "data": {
                                "sentiment_label": sentiment_result.get("label"),
                                "intent_label": intent_label,
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

        fake_positive = sarcasm.detect_fake_positivity(
            sentiment_label=sentiment_result["label"],
            sentiment_confidence=sentiment_result["confidence"],
            intent=intent_label,
            text=clean_text,
        )

        interest = scoring.calculate_interest(
            sentiment_result["label"],
            intent_label,
            fake_positive,
        )

        strategy_value = strategy.choose_strategy(
            intent=intent_label,
            interest=interest,
            fake_positivity=fake_positive,
        )

        key_signals_result = key_signals.extract_indicators(model, tokenizer, clean_text) or {
            "interest_indicators": [],
            "action_requests": [],
        }

        urgency_result = urgency.detect_urgency(clean_text, intent_label)

        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-flow",
                            "location": "sentiment_analysis_service.py:analyze_message:after_key_urgency",
                            "message": "Computed key signals and urgency",
                            "data": {
                                "has_interest_indicators": bool(
                                    key_signals_result.get("interest_indicators")
                                ),
                                "urgency_level": urgency_result.get("level"),
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

        actions_dict = next_actions.recommend_actions(
            clean_text,
            intent_label,
            interest,
            urgency_result["level"],
        )
        recommended_actions: List[str] = actions_dict.get("Recommended_actions", [])

        # Confidence scores
        sentiment_conf = sentiment_result["confidence"]
        overall_conf = round((0.5 * sentiment_conf) + (0.5 * intent_conf), 3)
        confidence_scores = {
            "sentiment_confidence": sentiment_conf,
            "intent_confidence": intent_conf,
            "overall_confidence": overall_conf,
        }

        # Summary
        summary_result = summary.summarize_message(model, tokenizer, clean_text)
        if isinstance(summary_result, dict) and summary_result.get("summary") is not None:
            summary_text = str(summary_result["summary"]).strip()
        else:
            summary_text = ""

        # Suggested reply
        reply_text = generation.generate_reply(
            model,
            tokenizer,
            strategy=strategy_value,
            original_msg=clean_text,
            intent_label=intent_label,
        )

        # Risks and next steps (derived, aligned with expected_output example)
        risks = self._build_risks(clean_text, urgency_result)
        next_steps = list(recommended_actions)

        analysis: Dict[str, Any] = {
            "sentiment": sentiment_result,
            "intent": intent_label,
            "interest_score": interest,
            "strategy": strategy_value,
            "key_signals": key_signals_result,
            "confidence_scores": confidence_scores,
            "urgency": urgency_result,
            "risks": risks,
            "next_steps": next_steps,
            "summary": summary_text,
            "suggested_reply": reply_text,
            # Suggested reply confidence is not computed explicitly in the notebook;
            # we approximate it using the overall analysis confidence.
            "suggested_reply_confidence": overall_conf,
        }

        # Long-form report text using the original report_generation module
        report_text = report_generation.generate_report(
            model=model,
            tokenizer=tokenizer,
            msg=clean_text,
            sentiment=sentiment_result,
            intent=intent_label,
            strategy=strategy_value,
            key_signals=key_signals_result,
            confidence_scores=confidence_scores,
            urgency=urgency_result,
            actions={"Recommended_actions": recommended_actions},
            summary=summary_text,
            reply=reply_text,
        )

        # region agent log
        try:
            import json
            import time

            with open("debug-1122b1.log", "a", encoding="utf-8") as _f:
                _f.write(
                    json.dumps(
                        {
                            "sessionId": "1122b1",
                            "runId": "run1",
                            "hypothesisId": "H-flow",
                            "location": "sentiment_analysis_service.py:analyze_message:exit",
                            "message": "Successfully finished analyze_message",
                            "data": {
                                "strategy": strategy_value,
                                "has_reply": bool(reply_text),
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
        except Exception:
            pass
        # endregion

        out = {
            "analysis": analysis,
            "report_text": report_text,
        }
        if settings.SENTIMENT_RESULT_CACHE_ENABLED:
            set_cached(cache_key(clean_text), out)
        return out

    # ---------------------------
    # Helpers
    # ---------------------------
    @staticmethod
    def _build_risks(message: str, urgency: Dict[str, Any]) -> List[Dict[str, str]]:
        """Derive a simple, human-readable risk list from urgency and message content."""
        risks: List[Dict[str, str]] = []
        level = (urgency.get("level") or "").lower()
        response_time = urgency.get("recommended_response_time") or "within a reasonable timeframe"

        if level == "high":
            risks.append(
                {
                    "type": "deadline",
                    "description": f"Response should be sent {response_time} to avoid losing momentum or interest.",
                }
            )
        elif level in {"medium", "low"}:
            risks.append(
                {
                    "type": "engagement",
                    "description": f"Delayed responses beyond {response_time} may reduce engagement.",
                }
            )

        text_lower = message.lower()
        if any(keyword in text_lower for keyword in ["interview", "schedule", "meeting", "call"]):
            risks.append(
                {
                    "type": "clarity",
                    "description": "Confirm the exact time, date and format of the next interview or meeting.",
                }
            )

        return risks

