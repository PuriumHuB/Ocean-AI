import time
import threading
import httpx
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ServerDebugger:
    def __init__(self, target_url: str, check_interval_seconds: int = 30):
        """
        check_interval_seconds: Now exactly 30 seconds for maximum alertness.
        """
        self.target_url = target_url
        self.interval = check_interval_seconds
        self.is_running = False
        self.thread = None
        self.client = httpx.Client(
            timeout=10.0, 
            headers={"User-Agent": "GentleGardenKeeper/3.0"}
        )

    def _ping_loop(self):
        logging.info(f"[Keeper] Walking through the quiet paths of: {self.target_url}")
        
        # Giving the system a peaceful 10 seconds to settle down initially
        time.sleep(10)
        
        while self.is_running:
            try:
                response = self.client.get(self.target_url)
                if response.status_code == 200:
                    logging.info(f"[Keeper Status] A warm hello sent successfully! Everything remains awake and bright.")
                else:
                    logging.info(f"[Keeper Status] Checked on the garden ({response.status_code}) - Life continues peacefully.")
            except Exception as e:
                logging.warning(f"[Keeper Warning] The path is slightly misty at the moment: {str(e)}")
            
            # Relaxing for exactly 30 seconds before the next gentle walk
            time.sleep(self.interval)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._ping_loop, daemon=True)
            self.thread.start()

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        self.client.close()
        logging.info("[Keeper] The garden caretaker is now resting.")