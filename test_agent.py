class MyAgent:
    def run(self, input_data):
        # input_data is a dict
        text = input_data.get("text", "World")
        return {
            "message": f"Hello {text} from Shoujiki!",
            "status": "success"
        }

agent = MyAgent()
