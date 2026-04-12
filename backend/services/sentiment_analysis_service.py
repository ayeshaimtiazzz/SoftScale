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

        # Fast mode uses classifier models + heuristics only (no Llama load or generate).
        if not settings.SENTIMENT_FAST_MODE:
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

        if settings.SENTIMENT_FAST_MODE:
            key_signals_result = self._fast_key_signals(clean_text)
        else:
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
        if settings.SENTIMENT_FAST_MODE:
            summary_text = self._fast_summary(clean_text)
        else:
            summary_result = summary.summarize_message(model, tokenizer, clean_text)
            if isinstance(summary_result, dict) and summary_result.get("summary") is not None:
                summary_text = str(summary_result["summary"]).strip()
            else:
                summary_text = ""

        # Suggested reply (Llama is skipped in fast mode for sub-minute latency on CPU)
        if settings.SENTIMENT_FAST_MODE:
            reply_text = self._fast_suggested_reply(strategy_value)
        else:
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

        # Long-form report (template when SENTIMENT_REPORT_LLM_MAX_TOKENS <= 0, default in fast mode)
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

    @staticmethod
    def _fast_summary(message: str) -> str:
        """Low-latency summary path used in fast mode."""
        text = " ".join((message or "").split())
        if not text:
            return ""
        if len(text) <= 220:
            return text
        snippet = text[:220]
        cut = max(snippet.rfind("."), snippet.rfind("!"), snippet.rfind("?"))
        if cut > 80:
            return snippet[: cut + 1].strip()
        return snippet.rstrip() + "..."

    @staticmethod
    def _fast_suggested_reply(strategy: str) -> str:
        """Deterministic reply when fast mode avoids Llama generation (keeps latency low on CPU)."""
        _strategy_templates = {
            "advance_to_next_step": (
                "Thank you for the update. I'm aligned with moving forward and happy to take the next step "
                "you suggest. Please let me know the preferred format and timing, and I will accommodate."
            ),
            "ask_for_clarification": (
                "Thanks for your message. To respond accurately, could you clarify the open points "
                "(scope, timeline, or decision process)? Once confirmed, I'll follow up promptly."
            ),
            "express_interest_and_follow_up": (
                "I appreciate the update and remain interested. Please share any next steps or materials "
                "you need from my side, and I'll reply with the requested details."
            ),
            "wait_then_follow_up": (
                "Thanks for letting me know. I'll pause on my side until there's news. "
                "If anything changes on timing or requirements, feel free to ping me."
            ),
            "wait_for_update": (
                "Thank you. I'll wait for your update. If you need any information in the meantime, "
                "I'm happy to provide it."
            ),
            "close_conversation_politely": (
                "Thank you for your time and transparency. I appreciate the update and wish you "
                "the best with the process."
            ),
            "provide_requested_information": (
                "Thanks for the request. I'll gather the items you asked for and send them shortly. "
                "If a specific format or deadline helps, please let me know."
            ),
            "send_portfolio_or_work_samples": (
                "Thanks — I'll share relevant work samples or a portfolio link. "
                "If there are must-have examples or constraints, tell me and I'll tailor what I send."
            ),
            "schedule_interview": (
                "Thank you for the invitation. I'm glad to schedule. Please share your available slots "
                "or a scheduling link, and I'll confirm a time that works."
            ),
            "wait_for_internal_update": (
                "Understood — I'll wait for your internal update. I'm available if any quick clarification helps."
            ),
            "prepare_for_negotiation": (
                "Thanks for the context. I'll review the points raised and come back with a concise, "
                "constructive response. If there are priorities on your side, sharing them will help."
            ),
            "confirm_availability": (
                "Thanks for checking. I'm generally flexible; please propose a few windows that suit you "
                "and I'll confirm availability right away."
            ),
        }
        return _strategy_templates.get(
            strategy,
            "Thank you for your message. I'll review and respond with any requested details shortly.",
        )

    @staticmethod
    def _fast_key_signals(message: str) -> Dict[str, List[str]]:
        """Regex/keyword extraction to avoid an extra LLM call in fast mode."""
        lowered = (message or "").lower()
        interest_indicators: List[str] = []
        action_requests: List[str] = []

        interest_markers = [
            "interested",
            "looks good",
            "great",
            "impressed",
            "thank you",
            "appreciate",
            "promising",
            "happy to",
        ]
        for marker in interest_markers:
            if marker in lowered:
                interest_indicators.append(marker)

        request_markers = [
            "please share",
            "can you",
            "could you",
            "send",
            "schedule",
            "let me know",
            "confirm",
            "update me",
        ]
        for marker in request_markers:
            if marker in lowered:
                action_requests.append(marker)

        return {
            "interest_indicators": interest_indicators[:5],
            "action_requests": action_requests[:5],
        }

