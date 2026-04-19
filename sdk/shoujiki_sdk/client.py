import requests
import os
import json

class ShoujikiClient:
    def __init__(self, base_url="http://localhost:8000", token=None):
        self.base_url = base_url
        self.token = token

    def deploy_agent(self, agent_id, name, description, price, code):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        payload = {
            "id": agent_id,
            "name": name,
            "description": description,
            "price": float(price),
            "code": code
        }
        
        response = requests.post(f"{self.base_url}/agents/deploy", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
