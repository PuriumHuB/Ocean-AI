import os
import base64
from openai import OpenAI

class OceanAgent:
    def __init__(self, api_key=None):
        # ĐỊNH NGHĨA MODEL MAP CHUẨN FREE TRÊN OPENROUTER
        self.model_map = {
            "ocean-flash": "nvidia/nemotron-3-nano-30b-a3b:free", # Tốc độ cực cao (190 tps)
            "ocean-pro": "openrouter/owl-alpha",                  # Logic đa dụng, thông minh
            "ocean-thinking": "nvidia/nemotron-3-ultra-550b-a55b:free", # Chuyên gia suy luận 550B
            "ocean-code": "qwen/qwen3-coder:free"                 # Top 1 Free Coding Model
        }

        # KHỞI TẠO CLIENT CHO OPENROUTER
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key or os.getenv("OPENROUTER_API_KEY")
        )
        
        # Tải cấu hình Siêu Prompt từ file
        try:
            with open("prompts/Ocean_AI.txt", "r", encoding="utf-8") as f:
                self.sys_prompt = f.read()
        except Exception:
            self.sys_prompt = "Bạn là Ocean AI - Chuyên gia cấp cao về Luau và Roblox Game Development."

    def ask(self, user_input, model_type="ocean-flash", image_data=None):
        # Fallback hỗ trợ cho các biến số cũ từ giao diện
        mode_fallback = {
            "standard": "ocean-flash",
            "pro": "ocean-pro",
            "thinking": "ocean-thinking",
            "code": "ocean-code"
        }
        if model_type in mode_fallback:
            model_type = mode_fallback[model_type]

        # Lấy chính xác mã Model ID
        model_id = self.model_map.get(model_type, "google/gemini-2.5-flash:free")
        
        content_list = []
        
        # Xử lý hình ảnh (Multimodal Vision)
        if image_data and "," in image_data:
            try:
                header, encoded = image_data.split(",", 1)
                mime_type = header.split(";")[0].split(":")[1] if "data:" in header else "image/jpeg"
                
                content_list.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{encoded}"
                    }
                })
                user_input += "\n[Hệ thống: Hãy phân tích hình ảnh đính kèm phía trên để xử lý/debug mã nguồn]."
            except Exception as img_err:
                print(f"Lỗi xử lý hình ảnh: {img_err}")

        # Xử lý văn bản
        content_list.append({
            "type": "text",
            "text": user_input
        })

        messages = [
            {"role": "system", "content": self.sys_prompt},
            {"role": "user", "content": content_list}
        ]

        try:
            response = self.client.chat.completions.create(
                model=model_id,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"❌ Lỗi kết nối OpenRouter ({model_type}): {str(e)}"