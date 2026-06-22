import os
import threading
from typing import Dict, Any, Optional, List
from openai import OpenAI
import httpx

class OceanAgent:
    def __init__(self, api_key: str = None) -> None:
        # THE BEAUTIFUL GARDEN OF MODELS (Based on your top-tier list)
        self.model_map: Dict[str, str] = {
            "flash": "openai/gpt-oss-20b:free",                    # Fast & elegant (Top 3)
            "pro": "openai/gpt-oss-120b:free",                    # Deep understanding (Top 5)
            "thinking": "nvidia/nemotron-3-super-120b-a12b:free", # Thoughtful logic (Top 4)
            "code": "nvidia/nemotron-3-ultra-550b-a55b:free",     # The absolute best creator (Top 1)
            
            # Gentle helpers working in the background
            "vision-core": "google/gemma-4-31b-it:free",          # The eyes of the garden (Top 8)
            "rescue-core": "poolside/laguna-m.1:free"             # A swift, reliable wind for rescue (Top 2)
        }
        
        self.api_key: str = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.lock = threading.Lock()
        
        # FASTER PACING: Lowered to 35 seconds. If a heavy model takes too long, 
        # it quickly steps aside for the rescue breeze to keep everything fast.
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
        """Asking a gentle friend to quickly read the scenery."""
        try:
            temp_client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
                http_client=httpx.Client(timeout=httpx.Timeout(10.0)) # Faster vision reading
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
                max_tokens=2500 # Slightly reduced to ensure faster generation
            )
            return response.choices[0].message.content if response.choices else "The pages appear to be beautifully blank."
        except httpx.ReadTimeout:
            raise TimeoutError("PEACEFUL_BREAK")
        except Exception as e:
            raise RuntimeError(str(e))

    def ask(self, user_input: str, model_type: str = "flash", image_data: str = None, file_text: str = None, web_content: str = None, chat_history: List[Dict[str, str]] = None) -> str:
        with self.lock:
            model_id: str = self.model_map.get(model_type, self.model_map["flash"])
            content_list: List[Dict[str, Any]] = []
            context_payload = ""
            
            # 1. OPTIMIZED MEMORY: Only reminiscing the last 4 messages for higher speed
            if chat_history:
                context_payload += "\n\n=== Reminiscing our past sweet conversations ==="
                for msg in chat_history[-4:]:  
                    role = msg.get("role", "user").upper()
                    content = msg.get("content", "")
                    context_payload += f"\n[{role}]: {content}"
                context_payload += "\n=== End of old memories ==="

            # 2. Reading open notebooks (File injection)
            if file_text:
                context_payload += f"\n\n=== Reading the open book of notes ===\n```\n{file_text}\n```\nLet us reflect on this together."
                
            if web_content:
                context_payload += f"\n\n=== Gathering wisdom from the clouds ===\n```\n{web_content}\n```"
            
            if context_payload:
                user_input += context_payload
                user_input += "\n\n[Instruction: Keep our conversation elegant, gentle, and perfectly aligned with our sweet memories.]"

            # 3. Unveiling the scenery (Vision injection)
            if image_data:
                img_dict = self._prepare_image(image_data)
                if img_dict:
                    if "nex-n2-pro" in model_id.lower() or "gemma-4-31b" in model_id.lower():
                        content_list.append(img_dict)
                        user_input += "\n[Instruction: Look closely at the beautiful scenery provided here.]"
                    else:
                        vision_text = self._vision_translate(img_dict)
                        user_input += f"\n\n=== A beautiful description of the shared scenery ===\n{vision_text}"

            clean_input = user_input.strip()
            if clean_input:
                content_list.append({"type": "text", "text": clean_input})
            elif image_data and not content_list:
                content_list.append({"type": "text", "text": "Let us explore the scenery together."})

            if not content_list:
                return "The garden seems empty right now."

            messages = [
                {"role": "system", "content": self.sys_prompt},
                {"role": "user", "content": content_list}
            ]

            # 4. Swift Fallback Loop
            try:
                return self._execute(model_id, messages)
            except TimeoutError:
                # Instantly falls back to the top-tier fast rescue model (Laguna)
                try:
                    return f"*[A swift gentle breeze guides us to a calmer path]*\n\n" + self._execute(self.model_map["rescue-core"], messages)
                except Exception as e:
                    return f"The river flows too slowly today: {str(e)}"
            except RuntimeError as e:
                try:
                    return f"*[Resting in the safe shelter of the garden]*\n\n" + self._execute(self.model_map["flash"], messages)
                except Exception:
                    return f"A quiet moment of rest: {str(e)}"
