import unittest
from argguard_sdk import ArgGuardClient, langchain_tool_callback

class TestPythonSDK(unittest.TestCase):
    def test_wrap_tool_call(self):
        client = ArgGuardClient()
        wrapped = client.wrap_tool_call(
            request_id=42,
            tool_name="create_event",
            arguments={"title": "Demo"},
            sources=[{"text": "Schedule Demo on Monday"}]
        )
        self.assertEqual(wrapped["id"], 42)
        self.assertEqual(wrapped["method"], "tools/call")
        self.assertEqual(wrapped["params"]["name"], "create_event")
        sources = wrapped["params"]["_meta"]["argguard"]["sources"]
        self.assertEqual(len(sources), 1)
        self.assertEqual(sources[0]["trust"], "untrusted")
        self.assertEqual(sources[0]["text"], "Schedule Demo on Monday")

    def test_langchain_callback(self):
        call = langchain_tool_callback("update_ticket", {"status": "closed"}, ["Ticket resolution notes."])
        self.assertEqual(call["params"]["name"], "update_ticket")
        self.assertIn("Ticket resolution notes.", call["params"]["_meta"]["argguard"]["sources"][0]["text"])

if __name__ == "__main__":
    unittest.main()
