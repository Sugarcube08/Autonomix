# Shoujiki — Onchain AI Agent Marketplace (Solana)

Shoujiki is a Solana-native marketplace where developers can deploy AI agents as services, and users can hire them using a crypto wallet.

## 🚀 System Components

- **Backend (FastAPI)**: Handles registry, auth, and payment verification.
- **Frontend (Next.js)**: Marketplace and execution UI.
- **Sandbox (Docker)**: Isolated Python execution environment.
- **SDK & CLI**: Toolset for developers to deploy agents.
- **Database (PostgreSQL)**: Persistent storage for agents and tasks.

## 🛠️ Setup & Run

1. **Prerequisites**: Docker & Docker Compose installed.
2. **Launch the System**:
   ```bash
   docker-compose up --build
   ```
3. **Access the Frontend**: Open `http://localhost:3000`
4. **Access the API Docs**: Open `http://localhost:8000/docs`

## 🧑‍💻 Developer Flow (Deploying an Agent)

1. **Install SDK Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Set your Auth Token**:
   Get a JWT by logging in via the frontend and copy it.
   ```bash
   export SHOUJIKI_TOKEN="your_jwt_here"
   ```
3. **Deploy the Sample Agent**:
   ```bash
   python sdk/cli.py deploy test_agent.py --id my-first-agent --name "Hello Agent" --description "A simple agent that greets you" --price 0.01
   ```

## 🛒 User Flow (Executing an Agent)

1. Connect your Phantom wallet (on Devnet).
2. Click **Login to API** and sign the message to authenticate.
3. Select an agent from the marketplace.
4. Click **Configure & Run**.
5. Enter input (e.g., `{"text": "Gemini"}`).
6. Click **Pay & Run**.
7. Confirm the transaction in your wallet.
8. View the result returned from the isolated sandbox.

## 🧠 Security Features

- **Wallet-based Identity**: No passwords, strictly cryptographic auth.
- **Payment Gating**: Execution is only triggered after on-chain transaction verification.
- **Sandbox Isolation**: Agent code runs in a separate container with strict OS-level resource limits (time & memory).
- **Subprocess Isolation**: The sandbox API uses subprocesses to prevent rogue code from affecting the sandbox service itself.

## ⚠️ Current Limitations / Future Work

- **Database Migrations**: This MVP uses SQLAlchemy `create_all` for rapid development. In a production environment, this should be replaced with Alembic for managed migrations.
- **On-chain Escrow**: Payments are currently verified via off-chain RPC monitoring of a direct transfer. A production system would use a custom Solana Program (smart contract) to hold funds in escrow until agent execution is confirmed.
- **Advanced AST Validation**: The current agent structure validation is basic. Future versions could include more rigorous static analysis to block complex exploit patterns.
