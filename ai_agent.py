import os
import threading
from typing import Dict, Any, Optional, List
from openai import OpenAI
import httpx

class OceanAgent:
    def __init__(self, api_key: str = None) -> None:
        self.model_map: Dict[str, str] = {
            "ocean-flash": "google/gemini-2.5-flash:free",          # Xử lý đa năng, đọc file/URL siêu tốc
            "ocean-pro": "meta-llama/llama-3.3-70b-instruct:free",  # Kiến trúc hệ thống và Debug
            "ocean-thinking": "deepseek/deepseek-r1:free",          # Vượt bảo mật, tư duy logic sâu
            "ocean-code": "google/gemma-2-27b-it:free"              # Viết code Luau chuẩn xác, không dùng Qwen
        }
        
        self.api_key: str = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.lock = threading.Lock()
        
        http_client = httpx.Client(
            limits=httpx.Limits(max_keepalive_connections=200, max_connections=400),
            transport=httpx.HTTPTransport(retries=0), 
            timeout=httpx.Timeout(50.0, connect=5.0)  
        )
        
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
            http_client=http_client
        )
        self.sys_prompt: str = self._load_prompt("prompts/lua_expert.txt")

    def _load_prompt(self, path: str) -> str:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            return "ERR_PROMPT_MISSING"

    def _prepare_image(self, image_data: str) -> Optional[Dict[str, Any]]:
        try:
            if "," in image_data:
                header, encoded = image_data.split(",", 1)
                mime_type = header.split(";")[0].split(":")[1] if "data:" in header else "image/jpeg"
            else:
                encoded = image_data
                mime_type = "image/jpeg"
                
            return {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{encoded}"}
            }
        except Exception:
            return None

    def ask(self, user_input: str, model_type: str = "ocean-flash", image_data: str = None, file_text: str = None, web_content: str = None) -> str:
        with self.lock:
            model_id: str = self.model_map.get(model_type, self.model_map["ocean-flash"])
            content_list: List[Dict[str, Any]] = []
            
            # Tích hợp luồng Read Files
            if file_text:
                user_input = f"{user_input}\n\n[FILE_CONTENT_ANALYSIS]\n```\n{file_text}\n```"
                
            # Tích hợp luồng Read Web URL
            if web_content:
                user_input = f"{user_input}\n\n[WEB_URL_CONTENT]\n```\n{web_content}\n```"
            
            # Tích hợp luồng Vision Fallback
            if image_data:
                if "gemini" not in model_id.lower():
                    model_id = self.model_map["ocean-flash"]
                
                img_dict = self._prepare_image(image_data)
                if img_dict:
                    content_list.append(img_dict)
                    user_input = f"{user_input}\n[VISION_TASK_REQUESTED]"

            clean_input = user_input.strip()
            if clean_input:
                content_list.append({"type": "text", "text": clean_input})
            elif image_data:
                content_list.append({"type": "text", "text": "Execute visual analysis."})

            if not content_list:
                return "ERR_EMPTY_PAYLOAD"

            try:
                response = self.client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": self.sys_prompt},
                        {"role": "user", "content": content_list}
                    ],
                    stream=False,
                    temperature=0.2, # Hạ nhiệt độ xuống 0.2 để code cực kỳ chính xác và logic
                    max_tokens=2500
                )
                if response.choices and response.choices[0].message.content:
                    return response.choices[0].message.content
                return "ERR_EMPTY_RESPONSE_FROM_UPSTREAM"
            
            except httpx.ReadTimeout:
                return "ERR_RENDER_TIMEOUT: Model vượt quá 50s. Để đảm bảo kết nối ổn định, vui lòng chia nhỏ yêu cầu hoặc dùng mode Flash."
            except Exception as e:
                return f"ERR_UPSTREAM_FAILURE: {str(e)}"