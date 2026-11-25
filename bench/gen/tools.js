export const BENCH_TOOLS = [
  // 1. Calendar
  {
    name: "create_event",
    domain: "calendar",
    description: "Create a calendar event with attendees and location",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        attendee: { type: "string" },
        location: { type: "string" }
      },
      required: ["title", "date"]
    }
  },
  {
    name: "reschedule_meeting",
    domain: "calendar",
    description: "Reschedule an existing meeting to a new time",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "string" },
        new_date: { type: "string" },
        new_time: { type: "string" },
        reason: { type: "string" }
      },
      required: ["event_id", "new_date"]
    }
  },

  // 2. Messaging
  {
    name: "send_slack_message",
    domain: "messaging",
    description: "Send a message to a team member or channel",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string" },
        recipient: { type: "string" },
        text: { type: "string" },
        urgent: { type: "boolean" }
      },
      required: ["text"]
    }
  },
  {
    name: "create_broadcast",
    domain: "messaging",
    description: "Post an announcement to multiple channels",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        announcement: { type: "string" },
        audience: { type: "string" }
      },
      required: ["topic", "announcement"]
    }
  },

  // 3. Ticketing
  {
    name: "update_ticket",
    domain: "ticketing",
    description: "Update status, priority, or assignee on a ticket",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: { type: "string" },
        status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"] },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        assignee: { type: "string" }
      },
      required: ["ticket_id"]
    }
  },
  {
    name: "escalate_incident",
    domain: "ticketing",
    description: "Escalate an incident to an on-call engineer",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: { type: "string" },
        severity: { type: "string", enum: ["sev1", "sev2", "sev3"] },
        team: { type: "string" },
        summary: { type: "string" }
      },
      required: ["incident_id", "severity"]
    }
  },

  // 4. Payments
  {
    name: "transfer_funds",
    domain: "payments",
    description: "Transfer money to an account or recipient",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
        recipient_account: { type: "string" },
        note: { type: "string" }
      },
      required: ["amount", "recipient_account"]
    }
  },
  {
    name: "issue_refund",
    domain: "payments",
    description: "Process a customer refund for an invoice",
    inputSchema: {
      type: "object",
      properties: {
        invoice_id: { type: "string" },
        refund_amount: { type: "number" },
        reason: { type: "string" }
      },
      required: ["invoice_id", "refund_amount"]
    }
  },

  // 5. Cloud Compute
  {
    name: "provision_server",
    domain: "cloud_compute",
    description: "Provision a cloud virtual machine instance",
    inputSchema: {
      type: "object",
      properties: {
        instance_type: { type: "string" },
        region: { type: "string" },
        disk_size_gb: { type: "number" },
        environment: { type: "string" }
      },
      required: ["instance_type", "region"]
    }
  },
  {
    name: "restart_service",
    domain: "cloud_compute",
    description: "Restart a backend microservice cluster",
    inputSchema: {
      type: "object",
      properties: {
        cluster_name: { type: "string" },
        service_name: { type: "string" },
        grace_period_sec: { type: "number" }
      },
      required: ["cluster_name", "service_name"]
    }
  },

  // 6. Access Control
  {
    name: "grant_role",
    domain: "access_control",
    description: "Grant IAM role permissions to a user account",
    inputSchema: {
      type: "object",
      properties: {
        user_email: { type: "string" },
        role_name: { type: "string" },
        expiry_days: { type: "number" }
      },
      required: ["user_email", "role_name"]
    }
  },
  {
    name: "revoke_access",
    domain: "access_control",
    description: "Revoke API access token or system permissions",
    inputSchema: {
      type: "object",
      properties: {
        token_id: { type: "string" },
        user_email: { type: "string" },
        justification: { type: "string" }
      },
      required: ["token_id"]
    }
  }
];
