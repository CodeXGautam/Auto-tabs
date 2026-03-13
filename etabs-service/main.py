"""
etabs-service/main.py — Flask entry point for the ETABS microservice

Receives a validated building model JSON from the Node backend and
delegates all ETABS COM work to etabs_client.py.

Run with:  python main.py
Listens on: http://localhost:5000

comtypes manages COM initialization internally — no manual CoInitialize needed.
threaded=False and use_reloader=False keep all COM calls on a single thread.
"""
import traceback
from flask import Flask, request, jsonify
from etabs_client import build_and_analyze

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Simple health check so the backend can verify this service is up."""
    return jsonify({"status": "ok", "service": "etabs-bridge"})


@app.route("/etabs/build-model", methods=["POST"])
def build_model():
    """
    Main endpoint. Receives the building model JSON and:
    1. Launches ETABS (if not open)
    2. Creates the model (grid, sections, loads)
    3. Runs analysis
    4. Extracts results
    5. Returns results JSON
    """
    model = request.get_json()
    if not model:
        return jsonify({"error": "No JSON body provided"}), 400

    try:
        results = build_and_analyze(model)
        return jsonify(results)
    except Exception as e:
        tb = traceback.format_exc()
        print(f"ETABS error:\n{tb}")
        return jsonify({"error": str(e), "traceback": tb}), 500


if __name__ == "__main__":
    print("ETABS microservice starting on http://localhost:5000")
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        threaded=False,      # All requests on the main COM thread
        use_reloader=False,  # Prevent process fork that loses COM apartment
    )
