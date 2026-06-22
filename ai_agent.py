import os
import threading
from typing import Dict, Any, Optional, List
from openai import OpenAI
import httpx

class OceanAgent:
    def __init__(self, api_key: str = None) -> None:
        # THE BEAUTIFUL GARDEN OF MODELS
        self.model_map: Dict[str, str] = {
            "flash": "openai/gpt-oss-20b:free",                    
            "pro": "openai/gpt-oss-120b:free",                    
            "thinking": "nvidia/nemotron-3-super-120b-a12b:free", 
            "code": "nvidia/nemotron-3-ultra-550b-a55b:free",     
            
            # Gentle helpers working in the background
            "vision-core": "google/gemma-4-31b-it:free",          
            "rescue-core": "poolside/laguna-m.1:free"             
        }
        
        self.api_key: str = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.lock = threading.Lock()
        
        # 35 seconds pacing for fast responses
        self.http_client = httpx.Client(
            limits=httpx.Limits(max_keepalive_connections=200, max_connections=400),
            transport=httpx.HTTPTransport(retries=0),
            timeout=httpx.Timeout(35.0, connect=5.0)
        )
        
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
            http_client=self.http_client
        )
        self.sys_prompt: str = self._load_prompt("prompts/Ocean_AI.txt")

    def _load_prompt(self, path: str) -> str:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            return "You are a thoughtful and polite companion. Share ideas clearly, warmly, and gracefully based on the shared notes."

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

    def _vision_translate(self, img_dict: Dict[str, Any]) -> str:
        try:
            temp_client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
                http_client=httpx.Client(timeout=httpx.Timeout(10.0))
            )
            response = temp_client.chat.completions.create(
                model=self.model_map["vision-core"],
                messages=[
                    {"role": "user", "content": [
                        {"type": "text", "text": "Please read and describe everything visible in this picture carefully, words by words."},
                        img_dict
                    ]}
                ],
                max_tokens=1000
            )
            return response.choices[0].message.content if response.choices else ""
        except Exception:
            return "[Notice: The view is currently misted over.]"

    def _execute(self, model_id: str, messages: List[Dict[str, Any]]) -> str:
        try:
            response = self.client.chat.completions.create(
                model=model_id,
                messages=messages,
                stream=False,
                temperature=0.1,  
                max_tokens=2500 
            )
            return response.choices[0].message.content if response.choices else "The pages appear to be beautifully blank."
        except httpx.ReadTimeout:
            raise TimeoutError("PEACEFUL_BREAK")
        except Exception as e:
            raise RuntimeError(str(e))

    def ask(self, user_input: str, model_type: str = "flash", image_data: str = None, file_text: str = None, web_content: str = None, chat_history: List[Dict[str, str]] = None) -> str:
        with self.lock:
            model_id: str = self.model_map.get(model_type, self.model_map["flash"])
            
            # Khởi tạo danh sách tin nhắn với System Prompt đầu tiên
            messages: List[Dict[str, Any]] = [
                {"role": "system", "content": self.sys_prompt}
            ]
            
            # 1. ĐƯA LỊCH SỬ CHAT VÀO ĐÚNG CẤU TRÚC OBJECT CHUẨN API (Sửa lỗi mất trí nhớ của Nvidia)
            if chat_history:
                for msg in chat_history[-4:]:  # Lấy 4 câu gần nhất để đảm bảo tốc độ tối đa
                    role = msg.get("role", "user").lower()
                    if role not in ["user", "assistant"]:
                        role = "user"
                    
                    messages.append({
                        "role": role,
                        "content": msg.get("content", "")
                    })

            # 2. Xử lý dữ liệu bổ sung của lượt chat hiện tại (File văn bản & Web)
            current_payload = user_input
            if file_text:
                current_payload += f"\n\n=== Reading the open book of notes ===\n```\n{file_text}\n```\nLet us reflect on this together."
                
            if web_content:
                current_payload += f"\n\n=== Gathering wisdom from the clouds ===\n```\n{web_content}\n```"
            
            content_list: List[Dict[str, Any]] = []

            # 3. Xử lý hình ảnh đính kèm
            if image_data:
                img_dict = self._prepare_image(image_data)
                if img_dict:
                    if "nex-n2-pro" in model_id.lower() or "gemma-4-31b" in model_id.lower():
                        content_list.append(img_dict)
                        current_payload += "\n[Instruction: Look closely at the beautiful scenery provided here.]"
                    else:
                        vision_text = self._vision_translate(img_dict)
                        current_payload += f"\n\n=== A beautiful description of the shared scenery ===\n{vision_text}"

            clean_input = current_payload.strip()
            if clean_input:
                content_list.append({"type": "text", "text": clean_input})
            elif image_data and not content_list:
                content_list.append({"type": "text", "text": "Let us explore the scenery together."})

            if not content_list:
                return "The garden seems empty right now."

            # Đưa lượt chat hiện tại vào cuối mảng dưới vai trò của User
            messages.append({"role": "user", "content": content_list})

            # 4. Thực thi gọi API và kích hoạt cứu hộ nếu hàng nặng bị nghẽn
            try:
                return self._execute(model_id, messages)
            except TimeoutError:
                try:
                    return f"*[A swift gentle breeze guides us to a calmer path]*\n\n" + self._execute(self.model_map["rescue-core"], messages)
                except Exception as e:
                    return f"The river flows too slowly today: {str(e)}"
            except RuntimeError as e:
                try:
                    return f"*[Resting in the safe shelter of the garden]*\n\n" + self._execute(self.model_map["flash"], messages)
                except Exception:
                    return f"A quiet moment of rest: {str(e)}"
