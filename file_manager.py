import os
import pathlib

class FileManager:
    @staticmethod
    def read_file(filepath: str) -> str:
        path = pathlib.Path(filepath).resolve()
        if not path.is_file():
            return "ERR_FILE_NOT_FOUND"
        
        # Hỗ trợ mọi định dạng Encoding để đọc File code an toàn
        encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
        for enc in encodings:
            try:
                with open(path, 'r', encoding=enc) as f:
                    content = f.read()
                    # Giới hạn dung lượng đọc để tránh sập RAM khi gặp file quá lớn
                    return content[:50000] if len(content) > 50000 else content
            except UnicodeDecodeError:
                continue
            except Exception as e:
                return f"ERR_READ_FAILED: {e}"
        return "ERR_UNSUPPORTED_ENCODING"

    @staticmethod
    def write_file(filepath: str, content: str) -> str:
        try:
            path = pathlib.Path(filepath).resolve()
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return "SUCCESS_FILE_SAVED"
        except Exception as e:
            return f"ERR_WRITE_FAILED: {e}"