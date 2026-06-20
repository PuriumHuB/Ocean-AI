from flask import Flask, render_template, request, jsonify
from ai_agent import OceanAgent
import os
from dotenv import load_dotenv

# Nạp các biến môi trường
load_dotenv()

app = Flask(__name__)

# Khởi tạo OceanAgent
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
agent = OceanAgent(OPENROUTER_API_KEY)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    user_msg = data.get("message", "").strip()
    
    # Nhận diện linh hoạt thuộc tính 'model' hoặc 'mode'
    model_type = data.get("model") or data.get("mode", "ocean-flash")
    image_data = data.get("image", None)
    
    if not user_msg and not image_data:
        return jsonify({"response": "Vui lòng nhập nội dung tin nhắn hoặc tải ảnh lên."})
    
    bot_reply = agent.ask(user_msg, model_type, image_data)
    
    return jsonify({"response": bot_reply})

if __name__ == "__main__":
    print("----------------------------------------------------")
    print("  Ocean AI Workspace - Roblox / Luau Expert Agent  ")
    print("  Đang hoạt động tại: http://127.0.0.1:5000         ")
    print("----------------------------------------------------")
