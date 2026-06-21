from flask import Flask, render_template, request, jsonify
from ai_agent import OceanAgent
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
agent = OceanAgent(os.getenv("OPENROUTER_API_KEY"))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(silent=True) or {}
        user_msg = data.get("message", "").strip()
        model_type = data.get("model", "ocean-flash")
        image_data = data.get("image")
        file_text = data.get("file_text")
        web_content = data.get("web_content") # Mở rộng để nhận nội dung từ URL

        if not any([user_msg, image_data, file_text, web_content]):
            return jsonify({"response": "ERR_EMPTY_PAYLOAD"}), 400

        bot_reply = agent.ask(user_msg, model_type, image_data, file_text, web_content)
        return jsonify({"response": bot_reply})

    except Exception as e:
        return jsonify({"response": f"ERR_INTERNAL_SERVER: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)