import os

class FileManager:
    WORKSPACE_DIR = os.path.join(os.path.dirname(__file__), 'workspace')

    @classmethod
    def ensure_workspace(cls):
        os.makedirs(cls.WORKSPACE_DIR, exist_ok=True)

    @classmethod
    def read_file(cls, filename: str) -> str:
        filepath = os.path.join(cls.WORKSPACE_DIR, filename)
        if not os.path.exists(filepath):
            return f"-- File '{filename}' không tồn tại."
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"-- Lỗi đọc file: {e}"

    @classmethod
    def write_file(cls, filename: str, content: str) -> str:
        cls.ensure_workspace()
        filepath = os.path.join(cls.WORKSPACE_DIR, filename)
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return f"Đã lưu thành công vào {filename}"
        except Exception as e:
            return f"Lỗi ghi file: {e}"