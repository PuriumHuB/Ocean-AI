import os
import threading
from typing import Dict, Any, Optional, List
from openai import OpenAI
import httpx

class OceanAgent:
    def __init__(self, api_key: str = None) -> None:
        # THE BEAUTIFUL GARDEN OF MODELS
        # Đã khôi phục lại ID chuẩn từ Web: ocean-flash, ocean-pro, ocean-thinking, ocean-code
        self.model_map: Dict[str, str] = {
            "ocean-flash": "openai/gpt-oss-20b:free",                    
            "ocean-pro": "openai/gpt-oss-120b:free",                    
            "ocean-thinking": "nvidia/nemotron-3-super-120b-a12b:free", 
            "ocean-code": "nvidia/nemotron-3-ultra-550b-a55b:free",     
            
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
        self.sys_prompt: str = self._load_prompt("prompts/lua_expert.txt")

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
        """A reliable friend (Gemma) carefully reads the scenery for all other models."""
        try:
            temp_client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
                http_client=httpx.Client(timeout=httpx.Timeout(12.0))
            )
            response = temp_client.chat.completions.create(
                model=self.model_map["vision-core"],
                messages=[
                    {"role": "user", "content": [
                        {"type": "text", "text": "Please read and extract all text, code, logic, and visible elements from this image meticulously."},
                        img_dict
                    ]}
                ],
                max_tokens=1500
            )
            return response.choices[0].message.content if response.choices else ""
        except Exception:
            return "[Notice: The view is currently misted over, unable to read the image.]"

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

    def ask(self, user_input: str, model_type: str = "ocean-flash", image_data: str = None, file_text: str = None, web_content: str = None, chat_history: List[Dict[str, str]] = None) -> str:
        with self.lock:
            # Lấy model dựa trên ID từ Web, mặc định là flash nếu không tìm thấy
            model_id: str = self.model_map.get(model_type, self.model_map["ocean-flash"])
            content_list: List[Dict[str, Any]] = []
            
            # Khởi tạo siêu ngữ cảnh XML Fencing: Bắt TẤT CẢ các model phải đọc
            unified_payload = ""

            # 1. ÉP TOÀN BỘ AI ĐỌC LỊCH SỬ CHAT
            if chat_history:
                unified_payload += "<PAST_CONVERSATIONS>\n"
                for msg in chat_history[-4:]:  
                    role = msg.get("role", "user").upper()
                    content = msg.get("content", "")
                    unified_payload += f"[{role}]: {content}\n"
                unified_payload += "</PAST_CONVERSATIONS>\n\n"

            # 2. ÉP TOÀN BỘ AI ĐỌC DỮ LIỆU FILE ĐÍNH KÈM VÀ WEB
            if file_text:
                unified_payload += "<OPEN_NOTEBOOK>\n"
                unified_payload += f"{file_text}\n"
                unified_payload += "</OPEN_NOTEBOOK>\n\n"
                
            if web_content:
                unified_payload += "<EXTERNAL_WISDOM>\n"
                unified_payload += f"{web_content}\n"
                unified_payload += "</EXTERNAL_WISDOM>\n\n"

            # 3. HỆ THỐNG MẮT THẦN DÀNH CHO MỌI MODEL
            if image_data:
                img_dict = self._prepare_image(image_data)
                if img_dict:
                    # Dù model có mắt hay mù, ta đều mượn Gemma (Vision-core) đọc ra văn bản
                    # Điều này đảm bảo độ chính xác tuyệt đối 100% cho các tác vụ code/logic
                    vision_text = self._vision_translate(img_dict)
                    unified_payload += "<TRANSLATED_SCENERY_FROM_IMAGE>\n"
                    unified_payload += f"{vision_text}\n"
                    unified_payload += "</TRANSLATED_SCENERY_FROM_IMAGE>\n\n"
                    
                    # Nếu model có mắt (Gemma/Nex), ta cho nó nhìn thêm ảnh gốc để đối chiếu
                    if "nex-n2-pro" in model_id.lower() or "gemma-4-31b" in model_id.lower():
                        content_list.append(img_dict)

            # 4. CHỐT YÊU CẦU HIỆN TẠI VÀO CUỐI
            clean_input = user_input.strip()
            if clean_input:
                unified_payload += f"<CURRENT_REQUEST>\n{clean_input}\n</CURRENT_REQUEST>"
            else:
                unified_payload += "<CURRENT_REQUEST>\nPlease review the provided notebooks and scenery.</CURRENT_REQUEST>"

            # Nạp toàn bộ siêu ngữ cảnh vào content
            content_list.append({"type": "text", "text": unified_payload})

            messages = [
                {"role": "system", "content": self.sys_prompt},
                {"role": "user", "content": content_list}
            ]

            # 5. THỰC THI CHỐNG NGHẼN (Luồng gió cứu hộ)
            try:
                return self._execute(model_id, messages)
            except TimeoutError:
                try:
                    return f"*[A swift gentle breeze guides us to a calmer path]*\n\n" + self._execute(self.model_map["rescue-core"], messages)
                except Exception as e:
                    return f"The river flows too slowly today: {str(e)}"
            except RuntimeError as e:
                try:
                    return f"*[Resting in the safe shelter of the garden]*\n\n" + self._execute(self.model_map["ocean-flash"], messages)
                except Exception:
                    return f"A quiet moment of rest: {str(e)}"
