# AI Integration Guide

Kardon integrates with popular Large Language Model (LLM) providers to provide AI-powered features that enhance productivity and collaboration.

---

## Table of Contents

1. [Overview](#overview)
2. [Supported Providers](#supported-providers)
3. [Configuration](#configuration)
4. [AI Features](#ai-features)
5. [API Reference](#api-reference)

---

## Overview

Kardon's AI integration allows users to interact with AI models for various tasks within the project management workflow. The platform supports multiple LLM providers, giving you flexibility to choose based on your preferences and requirements.

### AI Assistant: Galileo

The AI assistant in Kardon is called **Galileo**. It can help with:

- Writing and editing content in pages and documents
- Answering questions about project context
- Generating summaries of issues, cycles, and projects
- Providing assistance through the editor with natural language commands

---

## Supported Providers

Kardon supports the following LLM providers:

### OpenAI

**Supported Models:**

- `gpt-4o` - Latest multimodal model
- `gpt-4o-mini` - Cost-effective version of GPT-4o
- `gpt-4` - GPT-4 Turbo
- `gpt-3.5-turbo` - Fast and cost-effective
- `o1-mini` - Reasoning model
- `o1-preview` - Advanced reasoning

**Configuration:**

```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4o-mini
```

---

### Anthropic (Claude)

**Supported Models:**

- `claude-3-5-sonnet-20240620` - Latest Sonnet model
- `claude-3-opus-20240229` - Most capable Claude model
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and efficient
- `claude-2.1` - Legacy model with 200K context
- `claude-2` - Previous generation

**Configuration:**

```bash
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-your-api-key
LLM_MODEL=claude-3-sonnet-20240229
```

---

### Google (Gemini)

**Supported Models:**

- `gemini-pro` - General purpose model
- `gemini-1.5-pro-latest` - Latest Pro model
- `gemini-pro-vision` - Multimodal support

**Configuration:**

```bash
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-pro
```

---

## Configuration

### Environment Variables

Add the following to your `apps/api/.env` file:

```bash
# LLM Configuration (for AI features)
LLM_API_KEY=your_llm_api_key_here
LLM_PROVIDER=gemini
LLM_MODEL=gemini-pro
```

### Provider Selection

| Provider      | Best For                              | Considerations                |
| ------------- | ------------------------------------- | ----------------------------- |
| **OpenAI**    | General purpose, wide model selection | Higher cost for latest models |
| **Anthropic** | Long context, nuanced reasoning       | Excellent for complex tasks   |
| **Gemini**    | Cost-effective, good performance      | Competitive pricing           |

### Instance Configuration

You can also configure the LLM through the admin panel or instance configuration API:

```python
# Set configuration values
POST /api/v1/instances/configuration/
{
  "key": "LLM_API_KEY",
  "value": "your-api-key",
  "category": "ai"
}
```

---

## AI Features

### 1. AI Editor Assistant

Galileo can be invoked from any rich text editor in Kardon:

- **Ask Anything** - Get answers to questions about your content
- **Text Generation** - Generate content based on prompts
- **Summarization** - Summarize long documents or discussions
- **Formatting Help** - Get suggestions for better formatting

### 2. Workspace Orchestration

The AI can perform actions on your workspace:

- Create issues from natural language descriptions
- Generate project structures
- Set up cycles and milestones
- Analyze workspace data

**Example:**

```
"Create a high priority issue titled 'Fix login bug'
assigned to John with a deadline next Friday"
```

### 3. Page Content Generation

In Kardon Pages, Galileo helps you:

- Write documentation
- Create meeting notes
- Draft project specifications
- Generate knowledge base articles

---

## API Reference

### GPT Integration Endpoints

#### Project-Level AI Request

```http
POST /api/v1/workspaces/{slug}/projects/{project_id}/gpt/
```

**Request Body:**

```json
{
  "task": "ASK_ANYTHING",
  "prompt": "Your question or prompt here"
}
```

**Response:**

```json
{
  "response": "AI generated response text",
  "response_html": "<p>HTML formatted response</p>",
  "project_detail": { ... },
  "workspace_detail": { ... }
}
```

#### Workspace-Level AI Request

```http
POST /api/v1/workspaces/{slug}/gpt/
```

**Request Body:**

```json
{
  "task": "ASK_ANYTHING",
  "prompt": "Your question or prompt here"
}
```

### Workspace Orchestration Endpoint

```http
POST /api/v1/workspaces/{slug}/orchestrate/
```

**Request Body:**

```json
{
  "text_input": "Create a project called Marketing Q1 with 5 issues",
  "selected_model": "orchestrator"
}
```

**Supported Actions:**

- Create issues
- Create projects
- Create cycles
- General queries

---

## Best Practices

### 1. API Key Security

- Store API keys in environment variables or secure configuration
- Never commit API keys to version control
- Rotate keys regularly
- Use instance configuration for production deployments

### 2. Model Selection

- Use `gpt-4o-mini` or `claude-3-haiku` for simple tasks (cost-effective)
- Use `gpt-4o` or `claude-3-sonnet` for complex reasoning
- Consider context window requirements for your use case

### 3. Rate Limiting

Be aware of rate limits for your chosen provider:

- **OpenAI**: Varies by tier and model
- **Anthropic**: Check your plan limits
- **Gemini**: Free tier and paid tiers available

### 4. Error Handling

The API handles common errors:

- `400 Bad Request` - Missing configuration or invalid parameters
- `401 Unauthorized` - Invalid API key
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Provider error

---

## Troubleshooting

### AI Features Not Working

1. **Check Configuration**

   ```bash
   # Verify environment variables are set
   echo $LLM_API_KEY
   echo $LLM_PROVIDER
   echo $LLM_MODEL
   ```

2. **Validate API Key**
   - Ensure the API key is active
   - Check for sufficient credits/quota
   - Verify the key has the correct permissions

3. **Check Model Availability**
   - Ensure the selected model is available for your API key
   - Verify the model name is correct (case-sensitive)

4. **Review Logs**
   ```bash
   # Check API logs for errors
   docker logs kardon-api
   ```

### Common Issues

| Issue                                    | Solution                                      |
| ---------------------------------------- | --------------------------------------------- |
| "LLM provider configuration is required" | Set LLM_API_KEY, LLM_PROVIDER, and LLM_MODEL  |
| "Invalid API key"                        | Regenerate and update your API key            |
| "Model not supported"                    | Check supported models list for your provider |
| "Rate limit exceeded"                    | Wait before retrying or upgrade your plan     |

---

## Additional Resources

- [Architecture Overview](../architecture/README.md)
- [Security Documentation](../security/README.md)
- [Docker Deployment](../deployment/docker-compose/README.md)
- [OpenAI Documentation](https://platform.openai.com/docs)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Google Gemini Documentation](https://ai.google.dev/docs)

---

## Version History

| Version | Date     | Changes                              |
| ------- | -------- | ------------------------------------ |
| 1.0     | Feb 2026 | Initial AI integration documentation |
