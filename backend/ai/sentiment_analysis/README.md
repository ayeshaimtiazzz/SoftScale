## Sentiment Analysis Pipeline (SoftScale)

This package contains the **production version** of the sentiment-analysis code that originally lived in
`for reaading files/sentiment_analysis`. It powers the `/api/sentiment-analysis` endpoint and the
Sentiment Analysis UI in the frontend.

### High-level flow

Input: a single recruiter / client message (plain text).  
Main entrypoint: `SentimentAnalysisService.analyze_message(message)` in
`backend/services/sentiment_analysis_service.py`.

Processing steps (in order):

1. `preprocessing.clean_message`  
   - Strips greetings, signatures, normalizes whitespace.
2. `sentiment.get_sentiment`  
   - Hugging Face pipeline using `cardiffnlp/twitter-roberta-base-sentiment-latest`.  
   - Returns `{ "label": "positive|neutral|negative", "confidence": float }`.
3. `intent.predict_intent_with_confidence`  
   - DistilBERT classifier loaded from `experiments/intent_model/distilbert`.  
   - Returns `(intent_label, confidence)`.
4. `sarcasm.detect_fake_positivity`  
   - Heuristic detection of polite but disengaged positivity.
5. `scoring.calculate_interest`  
   - Uses intent + sentiment + fake positivity → 0–100 `interest_score`.
6. `strategy.choose_strategy`  
   - Maps intent + interest + fake positivity to a high-level strategy string.
7. `key_signals.extract_indicators` (LLM)  
   - Uses the proposal LLM (merged model if available) to extract:
     - `interest_indicators`: phrases showing positive engagement.
     - `action_requests`: phrases indicating next actions.
8. `urgency.detect_urgency`  
   - Combines intent + keywords → `{ "level": "high|medium|low", "recommended_response_time": "..." }`.
9. `next_actions.recommend_actions`  
   - Intent + urgency + interest → `{"Recommended_actions": [ ... ]}`.
10. `summary.summarize_message` (LLM)  
    - LLM prompt returns JSON `{"summary": "..."}` describing the message.
11. `generation.generate_reply` (LLM)  
    - Generates a professional suggested reply aligned with `intent` and `strategy`.
12. `report_generation.generate_report` (LLM)  
    - Produces the long-form **Communication Analysis Report** text (used for the modal + PDF).

### Models used

- **Sentiment model**  
  - HF pipeline: `"cardiffnlp/twitter-roberta-base-sentiment-latest"` (PyTorch).

- **Intent model**  
  - DistilBERT sequence-classification model.  
  - Files must live at: `backend/ai/sentiment_analysis/intent_model/distilbert`
    (no `experiments` folder in between).

- **LLM for summary / key signals / reply / report**  
  - Uses the proposal generator LLM:
    - Prefer **merged model** at `settings.PROPOSAL_MERGED_MODEL_PATH`
      (`backend/ai/proposal_generator/model/merged`).
    - Fallback to `settings.PROPOSAL_BASE_MODEL_NAME` (e.g. `unsloth/Llama-3.2-3B-Instruct`).

### Service & API wiring

- Service: `backend/services/sentiment_analysis_service.py`
  - `analyze_message(message)` → returns:
    - `analysis`: JSON matching `for reaading files/sentiment flow expected_output from backend which will be displayed in fe`.
    - `report_text`: long-form report (string).

- Route: `backend/routes/sentiment_routes.py`
  - `POST /api/sentiment-analysis` (auth required).
  - Response:
    - `analysis`: structured JSON (used by FE cards).
    - `report_html`: `report_text` as plain text for the modal.
    - `report_pdf_url`: base64 PDF data URL built from `report_text` (for Download PDF button).

### Frontend usage

- Page: `frontend/src/pages/sentiment-analysis/index.js`
  - Sends `{ message }` to `/api/sentiment-analysis`.
  - Renders cards for:
    - Sentiment, intent, interest score.
    - Urgency, key signals, recommended actions.
    - Summary, suggested reply.
  - Shows **View report** modal (`report_html`) and **Download PDF** (`report_pdf_url`).

