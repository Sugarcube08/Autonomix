import argparse
import os
import sys
from shoujiki_sdk.client import ShoujikiClient

def main():
    parser = argparse.ArgumentParser(description="Shoujiki CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Deploy command
    deploy_parser = subparsers.add_parser("deploy", help="Deploy an agent")
    deploy_parser.add_argument("file", help="Path to the agent Python file")
    deploy_parser.add_argument("--id", required=True, help="Unique agent ID")
    deploy_parser.add_argument("--name", required=True, help="Agent name")
    deploy_parser.add_argument("--description", help="Agent description")
    deploy_parser.add_argument("--price", required=True, type=float, help="Price in SOL")
    deploy_parser.add_argument("--url", default="http://localhost:8000", help="API base URL")

    args = parser.parse_args()

    if args.command == "deploy":
        token = os.getenv("SHOUJIKI_TOKEN")
        if not token:
            print("Error: SHOUJIKI_TOKEN environment variable not set")
            sys.exit(1)

        if not os.path.exists(args.file):
            print(f"Error: File {args.file} not found")
            sys.exit(1)

        with open(args.file, "r") as f:
            code = f.read()

        if "class Agent" not in code:
            print("Error: Invalid agent code. Must contain a class named 'Agent'")
            sys.exit(1)

        client = ShoujikiClient(base_url=args.url, token=token)
        try:
            result = client.deploy_agent(
                agent_id=args.id,
                name=args.name,
                description=args.description,
                price=args.price,
                code=code
            )
            print(f"Successfully deployed agent: {result['name']} (ID: {result['id']})")
        except Exception as e:
            print(f"Deployment failed: {e}")
            sys.exit(1)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
