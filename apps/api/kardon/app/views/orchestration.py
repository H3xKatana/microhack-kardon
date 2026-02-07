# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import os
import json
from typing import Dict, Any, List

from rest_framework import status
from rest_framework.response import Response

from kardon.app.permissions import ROLE, allow_permission
from kardon.app.serializers import ProjectLiteSerializer
from kardon.db.models import Project, Workspace, Issue, State, Cycle
from kardon.utils.exception_logger import log_exception

from .base import BaseAPIView
from .external.base import get_llm_config, get_llm_response


# Global cache for conversation history (in production, use Redis or similar)
conversation_history_cache = {}

class WorkspaceOrchestrationEndpoint(BaseAPIView):
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        try:
            print(f"Orchestration endpoint called with slug: {slug}")
            print(f"Request data: {request.data}")
            print(f"Request user: {getattr(request, 'user', 'No user')}")
            
            # Get workspace
            workspace = Workspace.objects.get(slug=slug)
            print(f"Found workspace: {workspace.name}")
            
            # Get the user request
            text_input = request.data.get("text_input", "")
            selected_model = request.data.get("selected_model", "orchestrator")
            task = request.data.get("task", "")
            
            print(f"text_input: {text_input}")
            print(f"selected_model: {selected_model}")
            print(f"task: {task}")
            
            if not text_input:
                print("No text input provided")
                return Response(
                    {"error": "Text input is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a unique conversation ID based on user and workspace
            conversation_id = f"{workspace.id}_{request.user.id if hasattr(request, 'user') and request.user else 'unknown'}"
            
            # Check if this is a specialized model or orchestrator
            if selected_model == "orchestrator":
                print("Using orchestration logic")
                # Process with orchestration logic
                response = self.handle_orchestration(text_input, workspace, conversation_id)
            elif selected_model in ["project-manager", "task-optimizer", "workflow-expert", "resource-planner", "timeline-analyst"]:
                print(f"Using specialized model: {selected_model}")
                # Use specialized model with enhanced fallback orchestration
                response = self.fallback_orchestration(text_input, workspace, selected_model)
            else:
                print(f"Using fallback orchestration with model: {selected_model}")
                # Use fallback orchestration with the specified model (could be 'general' or other)
                response = self.fallback_orchestration(text_input, workspace, selected_model)
            
            print(f"Final response: {response}")
            
            # Format the response with metadata
            formatted_response = self.format_response(response)
            
            # Store the conversation in cache for context
            self.store_conversation(conversation_id, text_input, response)
            
            return Response(formatted_response, status=status.HTTP_200_OK)
        
        except Workspace.DoesNotExist:
            print(f"Workspace {slug} does not exist")
            return Response(
                {"error": "Workspace not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Exception in orchestration: {str(e)}")
            log_exception(e)
            return Response(
                {"error": "An internal error has occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def handle_orchestration(self, text_input: str, workspace: Workspace, conversation_id: str = None) -> str:
        """
        Main orchestration logic that determines which model operation to perform
        """
        print(f"handle_orchestration called with text: {text_input}")
        
        # Get workspace context for LLM with conversation history
        conversation_history = self.get_conversation_history(conversation_id) if conversation_id else None
        workspace_context = self.get_workspace_context(workspace, conversation_history)
        
        # Use AI to classify intent
        intent_result = self.classify_intent(text_input, workspace_context)
        
        if intent_result.get("error"):
            print(f"Intent classification error: {intent_result['error']}")
            # Fall back to keyword matching if LLM fails
            return self.keyword_based_orchestration(text_input, workspace)
        
        intent = intent_result.get("intent", "UNKNOWN")
        confidence = intent_result.get("confidence", 0.0)
        
        print(f"Classified intent: {intent} with confidence: {confidence}")
        
        # Only proceed with AI interpretation if confidence is reasonably high
        if confidence < 0.5 and intent != "UNKNOWN":
            print("Low confidence, falling back to keyword matching")
            return self.keyword_based_orchestration(text_input, workspace)
        
        # Extract entities based on the classified intent
        entities = self.extract_entities(text_input, intent, workspace_context)
        
        if entities.get("error"):
            print(f"Entity extraction error: {entities['error']}")
            return self.keyword_based_orchestration(text_input, workspace)
        
        print(f"Extracted entities: {entities}")
        
        # Plan the action based on intent and entities
        action_plan = self.plan_action(intent, entities, workspace)
        
        if not action_plan["valid"]:
            print(f"Action plan invalid: {action_plan['validation_errors']}")
            return self.keyword_based_orchestration(text_input, workspace)
        
        # Execute the planned action
        action_method = action_plan["action_method"]
        params = action_plan["params"]
        
        try:
            result = action_method(**params)
            return result
        except Exception as e:
            print(f"Error executing action: {str(e)}")
            log_exception(e)
            return f"❌ Error executing action: {str(e)}"

    def get_conversation_history(self, conversation_id: str) -> list:
        """
        Retrieve conversation history for a given conversation ID
        """
        return conversation_history_cache.get(conversation_id, [])

    def store_conversation(self, conversation_id: str, user_input: str, ai_response: str):
        """
        Store a conversation turn in the cache
        """
        if conversation_id not in conversation_history_cache:
            conversation_history_cache[conversation_id] = []
        
        # Limit history to last 10 exchanges to prevent memory issues
        if len(conversation_history_cache[conversation_id]) >= 10:
            conversation_history_cache[conversation_id] = conversation_history_cache[conversation_id][-9:]
        
        import datetime
        conversation_history_cache[conversation_id].append({
            "user_input": user_input,
            "ai_response": ai_response,
            "timestamp": datetime.datetime.now().isoformat()
        })

    def keyword_based_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Fallback to keyword-based orchestration if AI approach fails
        """
        print(f"Falling back to keyword-based orchestration for: {text_input}")
        text_lower = text_input.lower()
        print(f"Text lower: '{text_lower}'")
        
        # Debug: Check if the specific phrases we're looking for are present
        if "my tasks" in text_lower:
            print("DEBUG: Found 'my tasks' in text")
        if "current tasks" in text_lower:
            print("DEBUG: Found 'current tasks' in text")
        if "what are my tasks" in text_lower:
            print("DEBUG: Found 'what are my tasks' in text")

        # Determine which action to take based on keywords
        print(f"Checking for issue creation keywords...")
        if any(word in text_lower for word in ["create issue", "new issue", "add task", "create bug", "report problem", "make issue"]) or \
           (("create" in text_lower) and any(word in text_lower for word in ["issue", "bug", "task"])):
            print("Detected issue creation request")
            return self.create_issue_orchestration(text_input, workspace)

        print(f"Checking for project creation keywords...")
        if any(word in text_lower for word in ["create project", "new project", "start project", "make project"]) or \
           ("create" in text_lower and "project" in text_lower):
            print("Detected project creation request")
            return self.create_project_orchestration(text_input, workspace)

        print(f"Checking for cycle creation keywords...")
        if any(word in text_lower for word in ["create cycle", "new cycle", "start cycle", "sprint", "create sprint"]) or \
           (("create" in text_lower) and any(word in text_lower for word in ["cycle", "sprint"])):
            print("Detected cycle creation request")
            return self.create_cycle_orchestration(text_input, workspace)

        print(f"Checking for listing keywords...")
        if any(word in text_lower for word in ["list projects", "show projects", "all projects", "projects list", "my projects", "projects assigned to me", "my assigned projects"]):
            print("Detected project listing request")
            return self.list_projects_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["list issues", "show issues", "all issues", "issues list", "show tasks", "list tasks", "current tasks", "my tasks", "tasks assigned to me", "my assigned tasks", "what are my tasks", "what are my current tasks"]):
            print("Detected issue listing request")
            return self.list_issues_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["list cycles", "show cycles", "all cycles", "cycles list", "show sprints", "list sprints"]):
            print("Detected cycle listing request")
            return self.list_cycles_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["list labels", "show labels", "all labels", "labels list"]):
            print("Detected label listing request")
            return self.list_labels_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["list states", "show states", "all states", "states list", "show statuses", "list statuses"]):
            print("Detected state listing request")
            return self.list_states_orchestration(text_input, workspace)

        print(f"Checking for update keywords...")
        if any(word in text_lower for word in ["update issue", "change issue", "modify issue", "edit issue"]):
            print("Detected issue update request")
            return self.update_issue_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["assign issue", "assign task", "set assignee", "assign to", "give to"]):
            print("Detected issue assignment request")
            return self.assign_issue_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["set priority", "change priority", "update priority"]):
            print("Detected priority update request")
            return self.set_priority_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["set due date", "update due date", "change due date", "set deadline", "due date", "deadline"]):
            print("Detected due date update request")
            return self.set_due_date_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["create label", "new label", "add label"]):
            print("Detected label creation request")
            return self.create_label_orchestration(text_input, workspace)

        if any(word in text_lower for word in ["create state", "new state", "add state", "create status", "new status", "add status"]):
            print("Detected state creation request")
            return self.create_state_orchestration(text_input, workspace)

        print("No specific keywords matched, using fallback orchestration")
        # For other requests, use LLM to determine intent
        return self.fallback_orchestration(text_input, workspace)
    
    def create_issue_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create an issue based on natural language input
        """
        try:
            # Find a project (first one in workspace as default, or try to extract from text)
            project = workspace.workspace_project.first()
            if not project:
                return "❌ No projects found in this workspace to create an issue."
            
            # Find a default state
            state = project.project_state.first() or State.objects.filter(project=project).first()
            if not state:
                # Create a default state if none exists
                state = State.objects.create(
                    name="Todo",
                    project=project,
                    workspace=workspace,
                    color="#60646C",
                    group="unstarted",
                    created_by=self.request.user
                )
            
            # Create issue title from the request
            title = text_input.split('.')[0][:100] if '.' in text_input else text_input[:100]
            if len(title) < 5:
                title = text_input[:100]
            
            # Validate title
            if not title.strip():
                return "❌ Could not extract a valid title from your request."
            
            # Create the issue
            issue = Issue.objects.create(
                name=title,
                description_html=f"<p>{text_input}</p>",
                project=project,
                workspace=workspace,
                state=state,
                created_by=self.request.user
            )
            
            return f"✅ Successfully created issue #{issue.sequence_id}: '{issue.name}' in project '{project.name}'"
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to create issue: {str(e)}"
    
    def create_project_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create a project based on natural language input
        """
        try:
            print(f"Creating project with text: {text_input}")
            
            # Extract project name from request using more sophisticated parsing
            project_name = self.extract_project_name(text_input)
            if not project_name:
                project_name = "Untitled Project"

            print(f"Extracted project name: {project_name}")

            # Validate project name
            if len(project_name) < 3:
                return "❌ Project name must be at least 3 characters long."

            # Create identifier from the actual project name, not the full command
            identifier = project_name[:10].upper().replace(" ", "").replace("-", "").replace("_", "")[:12]
            print(f"Generated identifier: {identifier}")

            # Validate identifier
            if not identifier:
                return "❌ Could not generate a valid identifier for the project."

            # Check if project already exists
            if Project.objects.filter(workspace=workspace, name=project_name).exists():
                print(f"Project already exists: {project_name}")
                return f"❌ Project '{project_name}' already exists in this workspace."

            # Check if identifier already exists
            if Project.objects.filter(workspace=workspace, identifier=identifier).exists():
                return f"❌ A project with identifier '{identifier}' already exists in this workspace."

            print(f"About to create project with workspace: {workspace}, name: {project_name}")

            # Create the project
            project = Project.objects.create(
                name=project_name,
                description=text_input,
                workspace=workspace,
                identifier=identifier,
                created_by=self.request.user
            )

            print(f"Project created successfully: {project.name}")
            return f"✅ Successfully created project '{project.name}' with identifier '{project.identifier}'"

        except Exception as e:
            print(f"Error creating project: {str(e)}")
            log_exception(e)
            return f"❌ Failed to create project: {str(e)}"
    
    def extract_project_name(self, text_input: str) -> str:
        """
        Extract project name from various command formats
        """
        import re
        
        # Patterns to extract project name - more comprehensive
        patterns = [
            r'named\s+(.+?)(?:\.|$)',  # "create project named X"
            r'called\s+(.+?)(?:\.|$)',  # "create project called X"
            r'titled\s+(.+?)(?:\.|$)',  # "create project titled X"
            r'"([^"]+)"',              # "create project named 'X'"
            r"'([^']+)'",              # 'create project named "X"'
            r'create project named ([^\.]+)',  # "create project named X"
            r'create project called ([^\.]+)', # "create project called X"
            r'create project (.+?)(?:\.|$)',   # "create project X"
            r'create a project named ([^\.]+)', # "create a project named X"
            r'create a project called ([^\.]+)', # "create a project called X"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text_input, re.IGNORECASE)
            if match:
                extracted_name = match.group(1).strip()
                if extracted_name:
                    # Clean up the name by removing trailing punctuation
                    extracted_name = extracted_name.rstrip('.!?,:;')
                    return extracted_name
        
        # If no specific pattern matched, remove command words and return what's left
        cleaned_text = (text_input
                       .replace("create project", "")
                       .replace("new project", "")
                       .replace("start project", "")
                       .replace("make project", "")
                       .replace("create a project", "")
                       .strip())
        
        # If there's still text left after removing command words, use it
        if cleaned_text:
            return cleaned_text.rstrip('.!?,:;')
        
        return ""
    
    def create_cycle_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create a cycle based on natural language input
        """
        try:
            # Find a project (first one in workspace as default)
            project = workspace.workspace_project.first()
            if not project:
                return "❌ No projects found in this workspace to create a cycle."
            
            # Extract cycle name from request
            cycle_name = text_input.replace("create cycle", "").replace("new cycle", "").replace("start cycle", "").replace("create sprint", "").strip()
            if not cycle_name:
                cycle_name = "New Cycle"
            
            # Validate cycle name
            if len(cycle_name) < 3:
                return "❌ Cycle name must be at least 3 characters long."
            
            # Check if cycle already exists
            if Cycle.objects.filter(project=project, name=cycle_name).exists():
                return f"❌ Cycle '{cycle_name}' already exists in project '{project.name}'."
            
            # Create the cycle
            cycle = Cycle.objects.create(
                name=cycle_name,
                description=text_input,
                project=project,
                workspace=workspace,
                owned_by=self.request.user
            )
            
            return f"✅ Successfully created cycle '{cycle.name}' in project '{project.name}'"
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to create cycle: {str(e)}"
    
    def fallback_orchestration(self, text_input: str, workspace: Workspace, selected_model: str = 'orchestrator') -> str:
        """
        Use LLM to determine intent when keywords don't match known actions
        """
        try:
            print(f"fallback_orchestration called with model: {selected_model}")

            # Hardcode to use Gemini configuration from environment
            import os
            api_key = os.environ.get("LLM_API_KEY")
            model = os.environ.get("LLM_MODEL", "gemini-2.0-flash")  # Default to gemini model
            provider = os.environ.get("LLM_PROVIDER", "gemini")  # Default to gemini provider

            print(f"Hardcoded LLM Config - API Key exists: {bool(api_key)}, Model: {model}, Provider: {provider}")

            # Log environment configuration for debugging
            print(f"DEBUG - LLM_API_KEY exists: {'LLM_API_KEY' in os.environ}")
            print(f"DEBUG - LLM_PROVIDER: {os.environ.get('LLM_PROVIDER', 'Not set')}")
            print(f"DEBUG - LLM_MODEL: {os.environ.get('LLM_MODEL', 'Not set')}")

            if not api_key or not model or not provider:
                print("LLM configuration is missing or invalid")
                # Fallback to general response if LLM not configured
                return f"LLM provider not configured. Available commands: create/list/update/assign issues, projects, cycles, labels, states. Try: 'list my tasks', 'create issue #description', 'assign issue #123 to user'."

            print("LLM configuration is valid, proceeding with LLM call")
            # Get workspace context for better understanding
            context = self.get_workspace_context(workspace)

            # Create specialized prompts based on the selected model
            specialized_prompts = {
                'project-manager': f"""
                You are a Project Manager AI specialist. Focus on project planning, scheduling, resource allocation, and timeline management.
                
                User request: "{text_input}"
                
                Workspace context: {context}
                
                Provide recommendations on project planning, scheduling, milestone setting, and resource allocation.
                If asked to create a project, provide detailed planning advice.
                If asked about timelines or schedules, focus on timeline analysis and optimization.
                
                Respond with actionable project management insights.
                """,
                
                'task-optimizer': f"""
                You are a Task Optimization AI specialist. Focus on task efficiency, prioritization, workload distribution, and productivity enhancement.
                
                User request: "{text_input}"
                
                Workspace context: {context}
                
                Analyze tasks for efficiency improvements, suggest optimal prioritization strategies, recommend workload balancing, and identify productivity bottlenecks.
                If asked to create or update tasks, focus on optimizing their structure and priority.
                Provide specific recommendations for improving task workflow.
                
                Respond with concrete optimization suggestions.
                """,
                
                'workflow-expert': f"""
                You are a Workflow Expert AI specialist. Focus on process improvement, automation opportunities, workflow design, and operational efficiency.
                
                User request: "{text_input}"
                
                Workspace context: {context}
                
                Analyze processes for automation opportunities, suggest workflow improvements, identify bottlenecks, and recommend process optimizations.
                If asked about creating cycles or sprints, focus on workflow organization.
                Recommend best practices for process standardization and automation.
                
                Respond with workflow and process improvement recommendations.
                """,
                
                'resource-planner': f"""
                You are a Resource Planning AI specialist. Focus on team allocation, capacity management, skill matching, and resource optimization.
                
                User request: "{text_input}"
                
                Workspace context: {context}
                
                Provide recommendations on team assignments, capacity planning, skill-based task allocation, and resource utilization.
                If asked to assign tasks, consider team member skills and workload.
                Focus on optimizing resource distribution and preventing overallocation.
                
                Respond with resource allocation and team management advice.
                """,
                
                'timeline-analyst': f"""
                You are a Timeline Analysis AI specialist. Focus on deadlines, milestones, scheduling, duration estimation, and critical path analysis.
                
                User request: "{text_input}"
                
                Workspace context: {context}
                
                Analyze timelines, suggest optimal scheduling, identify critical deadlines, estimate durations, and flag potential delays.
                If asked about due dates or scheduling, provide detailed timeline analysis.
                Recommend adjustments to meet deadlines and optimize project flow.
                
                Respond with timeline and scheduling recommendations.
                """,
                
                'orchestrator': f"""
                You are an AI assistant for a project management system. Analyze the user's request and provide an appropriate response.
                
                User request: "{text_input}"
                
                Workspace context: {context}
                
                Available capabilities:
                - Create: issues, projects, cycles, labels, states
                - List: issues (tasks), projects, cycles, labels, states
                - Update: issues (priority, due date, state, title)
                - Assign: issues to users
                - Set: priority, due date
                
                If the request matches any of these patterns, suggest the correct command format.
                Otherwise, provide a helpful response.
                
                Respond in a clear, helpful way with specific examples if needed.
                """
            }
            
            # Select the appropriate prompt based on the model
            prompt = specialized_prompts.get(selected_model, specialized_prompts['orchestrator'])

            # Use hardcoded provider instead of the one from config
            text, error = get_llm_response("ASK_ANYTHING", prompt, api_key, model, provider)
            print(f"LLM response - Success: {bool(text)}, Error: {error}")

            if not text and error:
                print(f"Error from LLM: {error}")
                # Check if it's a quota error and provide specific guidance
                if "quota" in str(error).lower() or "exceeded" in str(error).lower() or "rate limit" in str(error).lower():
                    return f"⚠️ LLM quota exceeded. Don't worry! The following commands work without LLM: create/list/update/assign issues, projects, cycles, labels, and states. Try: 'list my tasks', 'create issue #description', 'assign issue #123 to user'."
                else:
                    return f"❌ LLM error occurred. Available commands: create/list/update/assign issues, projects, cycles, labels, states. Try: 'list my tasks', 'create issue #description', 'assign issue #123 to user'."

            print(f"Returning LLM response: {text}")
            return text

        except Exception as e:
            print(f"Exception in fallback_orchestration: {str(e)}")
            log_exception(e)
            return f"Error processing your request. Available commands: create/list/update/assign issues, projects, cycles, labels, states. Try: 'list my tasks', 'create issue #description', 'assign issue #123 to user'."
    
    def list_projects_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        List projects in the workspace
        """
        try:
            text_lower = text_input.lower()
            
            # Check if user wants their projects (where they are a member)
            is_my_projects = any(word in text_lower for word in ["my projects", "projects assigned to me", "my assigned projects"])
            
            if is_my_projects:
                # For now, just return all projects since we're not filtering by membership
                # In a real implementation, you'd filter by project membership
                projects = workspace.workspace_project.all()
            else:
                projects = workspace.workspace_project.all()
                
            if not projects.exists():
                return "❌ No projects found in this workspace."
            
            project_list = []
            for project in projects:
                project_list.append(f"- {project.name} ({project.identifier})")
            
            list_title = "my projects" if is_my_projects else f"projects in workspace '{workspace.name}'"
            return f"📋 {list_title.title()}:\n" + "\n".join(project_list)
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to list projects: {str(e)}"

    def list_issues_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        List issues in the workspace or specific project
        """
        try:
            # Check if user specified a project
            project = None
            text_lower = text_input.lower()
            
            # Check if user wants their assigned tasks
            is_assigned_tasks = any(word in text_lower for word in ["my tasks", "current tasks", "tasks assigned to me", "my assigned tasks", "what are my tasks"])
            
            # Look for project reference in the text
            for proj in workspace.workspace_project.all():
                if proj.name.lower() in text_lower or proj.identifier.lower() in text_lower:
                    project = proj
                    break
            
            if is_assigned_tasks:
                # Filter issues assigned to the current user
                if project:
                    issues = Issue.objects.filter(project=project, issue_assignee__assignee=self.request.user)
                    project_name = f"tasks assigned to you in project '{project.name}'"
                else:
                    issues = Issue.objects.filter(workspace=workspace, issue_assignee__assignee=self.request.user)
                    project_name = "tasks assigned to you in workspace"
            else:
                # Regular listing behavior
                if project:
                    issues = Issue.objects.filter(project=project)
                    project_name = project.name
                else:
                    issues = Issue.objects.filter(workspace=workspace)
                    project_name = "all projects in workspace"
            
            if not issues.exists():
                return f"❌ No issues found in {project_name}."
            
            issue_list = []
            for issue in issues[:10]:  # Limit to first 10 issues
                issue_list.append(f"- #{issue.sequence_id}: {issue.name} (State: {issue.state.name if issue.state else 'N/A'})")
            
            if issues.count() > 10:
                issue_list.append(f"... and {issues.count() - 10} more issues")
            
            return f"📋 Issues in {project_name}:\n" + "\n".join(issue_list)
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to list issues: {str(e)}"

    def list_cycles_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        List cycles in the workspace
        """
        try:
            cycles = Cycle.objects.filter(workspace=workspace)
            if not cycles.exists():
                return "❌ No cycles found in this workspace."
            
            cycle_list = []
            for cycle in cycles:
                cycle_list.append(f"- {cycle.name} (Project: {cycle.project.name})")
            
            return f"📅 Cycles in workspace '{workspace.name}':\n" + "\n".join(cycle_list)
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to list cycles: {str(e)}"

    def list_labels_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        List labels in the workspace
        """
        try:
            labels = workspace.workspace_label.all()
            if not labels.exists():
                return "❌ No labels found in this workspace."
            
            label_list = []
            for label in labels:
                project_info = f" (Project: {label.project.name})" if label.project else ""
                label_list.append(f"- {label.name}{project_info}")
            
            return f"🏷️ Labels in workspace '{workspace.name}':\n" + "\n".join(label_list)
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to list labels: {str(e)}"

    def list_states_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        List states in the workspace
        """
        try:
            # Get all states from all projects in the workspace
            states = State.objects.filter(project__workspace=workspace).distinct()
            if not states.exists():
                return "❌ No states found in this workspace."
            
            state_list = []
            for state in states:
                state_list.append(f"- {state.name} (Project: {state.project.name})")
            
            return f"⚙️ States in workspace '{workspace.name}':\n" + "\n".join(state_list)
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to list states: {str(e)}"

    def update_issue_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Update an existing issue based on natural language input
        """
        try:
            # Extract issue identifier (e.g., issue #123)
            import re
            issue_number_match = re.search(r'#(\d+)', text_input)
            if not issue_number_match:
                return "❌ Could not identify issue number. Please specify issue with '#<number>' format."
            
            issue_number = int(issue_number_match.group(1))
            
            # Find the issue in the workspace
            issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number).first()
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Check for various update operations based on keywords
            updated_fields = []
            
            # Check for priority updates
            priority = self.parse_priority_from_text(text_input)
            if priority:
                issue.priority = priority
                updated_fields.append(f"priority to '{priority}'")
            
            # Check for due date updates
            due_date = self.parse_date_from_text(text_input)
            if due_date:
                from datetime import datetime
                issue.target_date = datetime.strptime(due_date, '%Y-%m-%d').date()
                updated_fields.append(f"due date to '{due_date}'")
            
            # Check for start date updates
            start_date = self.parse_date_from_text(text_input)
            if start_date and 'due date' not in ' '.join(updated_fields):  # Avoid duplicate processing
                from datetime import datetime
                # Only update start date if specifically mentioned
                if any(word in text_input.lower() for word in ['start date', 'start on', 'beginning']):
                    issue.start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                    updated_fields.append(f"start date to '{start_date}'")
            
            # Check for state updates
            state_keywords = {
                'backlog': 'backlog',
                'todo': 'unstarted', 
                'in progress': 'started',
                'doing': 'started',
                'done': 'completed',
                'complete': 'completed',
                'finished': 'completed',
                'cancelled': 'cancelled'
            }
            
            text_lower = text_input.lower()
            for keyword, state_group in state_keywords.items():
                if keyword in text_lower:
                    # Find a state in the project that matches this group
                    state = State.objects.filter(project=issue.project, group=state_group).first()
                    if state:
                        issue.state = state
                        updated_fields.append(f"state to '{state.name}'")
                        break
            
            # Check for title/name updates
            if any(word in text_lower for word in ['rename', 'title', 'name', 'change title', 'change name']):
                # Extract new title (simple heuristic - everything after "to" or "as")
                import re
                title_match = re.search(r'(?:to|as)\s+(.+?)(?:\.|$)', text_input, re.IGNORECASE)
                if title_match:
                    new_title = title_match.group(1).strip()
                    issue.name = new_title
                    updated_fields.append(f"title to '{new_title}'")
            
            if not updated_fields:
                return f"❌ Could not identify what to update in issue #{issue_number}. Please specify what you want to change (priority, due date, state, etc.)."
            
            # Save the issue with updates
            issue.updated_by = self.request.user
            issue.save()
            
            return f"✅ Successfully updated issue #{issue.sequence_id} '{issue.name}' - {', '.join(updated_fields)}."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to update issue: {str(e)}"

    def assign_issue_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Assign an issue to a user based on natural language input
        """
        try:
            from kardon.db.models import User, ProjectMember
            
            # Extract issue identifier (e.g., issue #123)
            import re
            issue_number_match = re.search(r'#(\d+)', text_input)
            if not issue_number_match:
                return "❌ Could not identify issue number. Please specify issue with '#<number>' format."
            
            issue_number = int(issue_number_match.group(1))
            
            # Find the issue in the workspace
            issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number).first()
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Extract user name/email from the text
            # Look for patterns like "assign to John" or "assign John to this"
            assignee_name = None
            assignee_patterns = [
                r'assign to (\w+)',
                r'assign (\w+) to',
                r'give to (\w+)',
                r'give (\w+)'
            ]
            
            for pattern in assignee_patterns:
                match = re.search(pattern, text_input, re.IGNORECASE)
                if match:
                    assignee_name = match.group(1)
                    break
            
            if not assignee_name:
                return f"❌ Could not identify assignee. Please specify assignee with 'assign to <name>' format. Request: '{text_input}'"
            
            # Find the user in the workspace
            assignee = User.objects.filter(email__icontains=assignee_name).first()
            if not assignee:
                # Try to find by display name
                assignee = User.objects.filter(display_name__icontains=assignee_name).first()
            
            if not assignee:
                return f"❌ User '{assignee_name}' not found in the system."
            
            # Check if the user is a member of the project
            if not ProjectMember.objects.filter(project=issue.project, member=assignee).exists():
                return f"❌ User '{assignee_name}' is not a member of project '{issue.project.name}'."
            
            # Assign the issue to the user
            from kardon.db.models import IssueAssignee
            issue_assignee, created = IssueAssignee.objects.get_or_create(
                issue=issue,
                assignee=assignee,
                project=issue.project,
                workspace=issue.workspace,
                defaults={
                    'created_by': self.request.user,
                    'updated_by': self.request.user
                }
            )
            
            if created:
                return f"✅ Successfully assigned issue #{issue.sequence_id} '{issue.name}' to {assignee.display_name or assignee.email}."
            else:
                return f"⚠️ Issue #{issue.sequence_id} was already assigned to {assignee.display_name or assignee.email}."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to assign issue: {str(e)}"

    def set_priority_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Set priority of an issue based on natural language input
        """
        try:
            # Extract issue identifier (e.g., issue #123)
            import re
            issue_number_match = re.search(r'#(\d+)', text_input)
            if not issue_number_match:
                return "❌ Could not identify issue number. Please specify issue with '#<number>' format."
            
            issue_number = int(issue_number_match.group(1))
            
            # Find the issue in the workspace
            issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number).first()
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Extract priority from the text
            priority = self.parse_priority_from_text(text_input)
            if not priority:
                return f"❌ Could not identify priority. Available priorities: urgent, high, medium, low, none. Request: '{text_input}'"
            
            # Update the issue priority
            issue.priority = priority
            issue.updated_by = self.request.user
            issue.save()
            
            return f"✅ Successfully set priority of issue #{issue.sequence_id} '{issue.name}' to '{priority}'."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to set priority: {str(e)}"

    def set_due_date_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Set due date of an issue based on natural language input
        """
        try:
            # Extract issue identifier (e.g., issue #123)
            import re
            issue_number_match = re.search(r'#(\d+)', text_input)
            if not issue_number_match:
                return "❌ Could not identify issue number. Please specify issue with '#<number>' format."
            
            issue_number = int(issue_number_match.group(1))
            
            # Find the issue in the workspace
            issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number).first()
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Extract date from the text
            due_date = self.parse_date_from_text(text_input)
            if not due_date:
                return f"❌ Could not identify due date. Please specify a date (e.g., YYYY-MM-DD, 'tomorrow', 'next week'). Request: '{text_input}'"
            
            # Update the issue due date
            from datetime import datetime
            issue.target_date = datetime.strptime(due_date, '%Y-%m-%d').date()
            issue.updated_by = self.request.user
            issue.save()
            
            return f"✅ Successfully set due date of issue #{issue.sequence_id} '{issue.name}' to '{due_date}'."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to set due date: {str(e)}"

    def create_label_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create a label based on natural language input
        """
        try:
            from kardon.db.models import Label
            
            # Extract label name from request
            label_name = text_input.replace("create label", "").replace("new label", "").replace("add label", "").strip()
            if not label_name:
                label_name = "New Label"
            
            # Validate label name
            if len(label_name) < 2:
                return "❌ Label name must be at least 2 characters long."
            
            # Create the label - associate with first project as default
            project = workspace.workspace_project.first()
            if not project:
                return "❌ No projects found in this workspace to create a label."
            
            # Check if label already exists
            if Label.objects.filter(project=project, name=label_name).exists():
                return f"❌ Label '{label_name}' already exists in project '{project.name}'."
            
            # Create the label
            label = Label.objects.create(
                name=label_name,
                project=project,
                workspace=workspace,
                created_by=self.request.user
            )
            
            return f"✅ Successfully created label '{label.name}' in project '{project.name}'"
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to create label: {str(e)}"

    def create_state_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create a state based on natural language input
        """
        try:
            from kardon.db.models import State
            
            # Extract state name from request
            state_name = text_input.replace("create state", "").replace("new state", "").replace("add state", "").replace("create status", "").replace("new status", "").replace("add status", "").strip()
            if not state_name:
                state_name = "New State"
            
            # Validate state name
            if len(state_name) < 3:
                return "❌ State name must be at least 3 characters long."
            
            # Create the state - associate with first project as default
            project = workspace.workspace_project.first()
            if not project:
                return "❌ No projects found in this workspace to create a state."
            
            # Check if state already exists
            if State.objects.filter(project=project, name=state_name).exists():
                return f"❌ State '{state_name}' already exists in project '{project.name}'."
            
            # Create the state with default values
            state = State.objects.create(
                name=state_name,
                project=project,
                workspace=workspace,
                color="#60646C",  # Default gray color
                group="backlog",  # Default group
                created_by=self.request.user
            )
            
            return f"✅ Successfully created state '{state.name}' in project '{project.name}'"
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to create state: {str(e)}"

    def parse_date_from_text(self, text: str) -> str:
        """
        Parse date from natural language text
        """
        import re
        from datetime import datetime
        
        # Common date patterns
        date_patterns = [
            r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',  # MM/DD/YYYY or MM-DD-YYYY
            r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',    # YYYY/MM/DD or YYYY-MM-DD
            r'\b(today|tomorrow|next week|next month)\b',  # Natural language dates
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1).lower()
                
                # Handle natural language dates
                if date_str == 'today':
                    return datetime.now().strftime('%Y-%m-%d')
                elif date_str == 'tomorrow':
                    from datetime import timedelta
                    return (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                elif date_str == 'next week':
                    from datetime import timedelta
                    return (datetime.now() + timedelta(weeks=1)).strftime('%Y-%m-%d')
                elif date_str == 'next month':
                    from datetime import timedelta
                    return (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
                else:
                    # Try to parse standard date formats
                    try:
                        # Replace separators to standardize format
                        date_str = date_str.replace('/', '-').replace('.', '-')
                        parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
                        return parsed_date.strftime('%Y-%m-%d')
                    except ValueError:
                        try:
                            # Try M/D/YYYY format
                            parsed_date = datetime.strptime(date_str, '%m-%d-%Y')
                            return parsed_date.strftime('%Y-%m-%d')
                        except ValueError:
                            try:
                                # Try MM/DD/YYYY format
                                parsed_date = datetime.strptime(date_str, '%m/%d/%Y')
                                return parsed_date.strftime('%Y-%m-%d')
                            except ValueError:
                                continue
        
        return None

    def parse_priority_from_text(self, text: str) -> str:
        """
        Parse priority from natural language text
        """
        text_lower = text.lower()
        
        # Priority mappings
        priority_map = {
            'urgent': 'urgent',
            'critical': 'urgent',
            'high': 'high',
            'medium': 'medium',
            'normal': 'medium',
            'low': 'low',
            'lowest': 'low',
            'none': 'none'
        }
        
        for word, priority in priority_map.items():
            if word in text_lower:
                return priority
        
        return None

    def parse_assignee_from_text(self, text: str, workspace: Workspace):
        """
        Parse assignee from natural language text
        """
        # This would typically involve looking up users by name/email
        # For now, returning None as a placeholder
        # In a real implementation, you'd search for users in the workspace
        return None

    def parse_labels_from_text(self, text: str) -> List[str]:
        """
        Parse labels from natural language text
        """
        import re
        
        # Look for labels mentioned with # or in "with label" phrases
        labels = []
        
        # Pattern for hashtags like #bug, #feature, etc.
        hashtag_pattern = r'#([a-zA-Z0-9_-]+)'
        hashtag_matches = re.findall(hashtag_pattern, text)
        labels.extend(hashtag_matches)
        
        # Pattern for "with label X" or "add label X"
        label_pattern = r'(?:with|add|apply)\s+label(?:s)?\s+([a-zA-Z0-9_-]+)'
        label_matches = re.findall(label_pattern, text, re.IGNORECASE)
        labels.extend(label_matches)
        
        return labels

    def format_response(self, response_text: str, operation_type: str = "general", success: bool = True, data: dict = None) -> dict:
        """
        Format the response with metadata about the operation performed
        """
        import re
        import datetime
        
        # Determine if the operation was successful based on the response text
        success = success or ("✅" in response_text or "Successfully" in response_text)
        failure = not success or ("❌" in response_text or "Failed" in response_text or "Error" in response_text)
        
        # Extract operation type from response if not provided
        if not operation_type:
            if "created" in response_text.lower():
                operation_type = "create"
            elif "updated" in response_text.lower() or "modified" in response_text.lower():
                operation_type = "update"
            elif "deleted" in response_text.lower() or "removed" in response_text.lower():
                operation_type = "delete"
            elif "list" in response_text.lower() or "show" in response_text.lower():
                operation_type = "list"
            else:
                operation_type = "general"
        
        # Format the response
        formatted_response = {
            "success": success,
            "failure": failure,
            "operation_type": operation_type,
            "response": response_text,
            "response_html": response_text.replace("\n", "<br/>"),
            "timestamp": datetime.datetime.now().isoformat(),
        }
        
        # Add any additional data
        if data:
            formatted_response.update(data)
        
        return formatted_response

    def classify_intent(self, text_input: str, workspace_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use LLM to classify user intent into specific action categories
        """
        try:
            import os
            api_key = os.environ.get("LLM_API_KEY")
            model = os.environ.get("LLM_MODEL", "gemini-2.0-flash")
            provider = os.environ.get("LLM_PROVIDER", "gemini")
            
            if not api_key:
                return {"intent": "UNKNOWN", "confidence": 0.0, "error": "LLM API key not configured"}
            
            # Create a prompt that asks the LLM to classify the intent
            prompt = f"""
            Analyze the following user request and classify the intent.
            Return your response in JSON format with the following structure:
            {{
                "intent": "<ACTION_TYPE>",
                "confidence": <NUMBER_BETWEEN_0_AND_1>,
                "details": {{...}}
            }}
            
            Available ACTION_TYPES:
            - CREATE_PROJECT: User wants to create a new project
            - CREATE_ISSUE: User wants to create a new issue/task
            - CREATE_CYCLE: User wants to create a new cycle/sprint
            - CREATE_LABEL: User wants to create a new label
            - CREATE_STATE: User wants to create a new state/status
            - LIST_PROJECTS: User wants to see projects
            - LIST_ISSUES: User wants to see issues/tasks
            - LIST_CYCLES: User wants to see cycles/sprints
            - LIST_LABELS: User wants to see labels
            - LIST_STATES: User wants to see states/statuses
            - UPDATE_ISSUE: User wants to update an existing issue
            - ASSIGN_ISSUE: User wants to assign an issue to someone
            - SET_PRIORITY: User wants to set priority of an issue
            - SET_DUE_DATE: User wants to set due date of an issue
            - MULTI_STEP_OPERATION: User wants to perform multiple operations in sequence
            - UNKNOWN: Cannot determine intent clearly
            
            For MULTI_STEP_OPERATION, the details should include a "steps" array with individual operations.
            
            User request: "{text_input}"
            
            Workspace context: {workspace_context}
            
            Respond ONLY with the JSON object, no other text.
            """
            
            text, error = get_llm_response("ASK_ANYTHING", prompt, api_key, model, provider)
            
            if error:
                print(f"Error in intent classification: {error}")
                return {"intent": "UNKNOWN", "confidence": 0.0, "error": error}
            
            # Parse the JSON response
            import json
            try:
                result = json.loads(text.strip())
                return result
            except json.JSONDecodeError:
                print(f"Could not parse LLM response as JSON: {text}")
                return {"intent": "UNKNOWN", "confidence": 0.0, "error": "Could not parse LLM response"}
        
        except Exception as e:
            log_exception(e)
            return {"intent": "UNKNOWN", "confidence": 0.0, "error": str(e)}

    def extract_entities(self, text_input: str, intent: str, workspace_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use LLM to extract relevant entities based on the classified intent
        """
        try:
            import os
            api_key = os.environ.get("LLM_API_KEY")
            model = os.environ.get("LLM_MODEL", "gemini-2.0-flash")
            provider = os.environ.get("LLM_PROVIDER", "gemini")
            
            if not api_key:
                return {"error": "LLM API key not configured"}
            
            # Create a prompt that asks the LLM to extract entities based on the intent
            prompt = f"""
            Extract relevant entities from the following user request based on the intent.
            Return your response in JSON format.
            
            Intent: {intent}
            User request: "{text_input}"
            Workspace context: {workspace_context}
            
            Based on the intent, extract the following entities:
            
            For CREATE_PROJECT: {{ "project_name": "...", "description": "..." }}
            For CREATE_ISSUE: {{ "issue_title": "...", "project_name": "...", "description": "..." }}
            For CREATE_CYCLE: {{ "cycle_name": "...", "project_name": "..." }}
            For LIST_ISSUES: {{ "project_name": "...", "assigned_to": "..." }}  # assigned_to could be "me" for current user
            For ASSIGN_ISSUE: {{ "issue_number": "...", "assignee": "..." }}
            For SET_PRIORITY: {{ "issue_number": "...", "priority": "..." }}  # priority in [urgent, high, medium, low, none]
            For SET_DUE_DATE: {{ "issue_number": "...", "due_date": "..." }}  # due_date in YYYY-MM-DD format
            For MULTI_STEP_OPERATION: {{ "steps": [{{ "intent": "...", "entities": {{...}} }}, ...] }}  # Array of operations to perform
            
            Respond ONLY with the JSON object containing the extracted entities, no other text.
            """
            
            text, error = get_llm_response("ASK_ANYTHING", prompt, api_key, model, provider)
            
            if error:
                print(f"Error in entity extraction: {error}")
                return {"error": error}
            
            # Parse the JSON response
            import json
            try:
                result = json.loads(text.strip())
                return result
            except json.JSONDecodeError:
                print(f"Could not parse LLM entity extraction response as JSON: {text}")
                return {"error": "Could not parse LLM response"}
        
        except Exception as e:
            log_exception(e)
            return {"error": str(e)}

    def plan_action(self, intent: str, entities: Dict[str, Any], workspace: Workspace) -> Dict[str, Any]:
        """
        Generate a structured action plan based on intent and entities
        """
        try:
            action_plan = {
                "intent": intent,
                "entities": entities,
                "action_method": None,
                "params": {},
                "valid": True,
                "validation_errors": [],
                "multi_step": False,
                "steps": []
            }
            
            # Check if this is a multi-step operation
            if intent == "MULTI_STEP_OPERATION":
                # Handle multi-step operations
                steps = entities.get("steps", [])
                action_plan["multi_step"] = True
                action_plan["steps"] = []
                
                for step in steps:
                    step_intent = step.get("intent")
                    step_entities = step.get("entities", {})
                    step_action = self.plan_action(step_intent, step_entities, workspace)
                    action_plan["steps"].append(step_action)
                
                action_plan["action_method"] = self.execute_multi_step_operation
                action_plan["params"] = {
                    "steps": action_plan["steps"],
                    "workspace": workspace
                }
            else:
                # Validate entities and map to appropriate action method
                if intent == "CREATE_PROJECT":
                    if not entities.get("project_name"):
                        action_plan["valid"] = False
                        action_plan["validation_errors"].append("Missing project_name")
                    else:
                        action_plan["action_method"] = self.execute_create_project
                        action_plan["params"] = {
                            "project_name": entities["project_name"],
                            "description": entities.get("description", ""),
                            "workspace": workspace
                        }
                        
                elif intent == "CREATE_ISSUE":
                    if not entities.get("issue_title"):
                        action_plan["valid"] = False
                        action_plan["validation_errors"].append("Missing issue_title")
                    else:
                        action_plan["action_method"] = self.execute_create_issue
                        action_plan["params"] = {
                            "title": entities["issue_title"],
                            "project_name": entities.get("project_name"),
                            "description": entities.get("description", ""),
                            "workspace": workspace
                        }
                        
                elif intent == "LIST_ISSUES":
                    action_plan["action_method"] = self.execute_list_issues
                    action_plan["params"] = {
                        "project_name": entities.get("project_name"),
                        "assigned_to": entities.get("assigned_to"),
                        "workspace": workspace
                    }
                    
                elif intent == "ASSIGN_ISSUE":
                    if not entities.get("issue_number") or not entities.get("assignee"):
                        action_plan["valid"] = False
                        action_plan["validation_errors"].extend([
                            "Missing issue_number" if not entities.get("issue_number") else "",
                            "Missing assignee" if not entities.get("assignee") else ""
                        ])
                        action_plan["validation_errors"] = [e for e in action_plan["validation_errors"] if e]  # Remove empty strings
                    else:
                        action_plan["action_method"] = self.execute_assign_issue
                        action_plan["params"] = {
                            "issue_number": entities["issue_number"],
                            "assignee": entities["assignee"],
                            "workspace": workspace
                        }
                        
                elif intent == "SET_PRIORITY":
                    if not entities.get("issue_number") or not entities.get("priority"):
                        action_plan["valid"] = False
                        action_plan["validation_errors"].extend([
                            "Missing issue_number" if not entities.get("issue_number") else "",
                            "Missing priority" if not entities.get("priority") else ""
                        ])
                        action_plan["validation_errors"] = [e for e in action_plan["validation_errors"] if e]  # Remove empty strings
                    else:
                        action_plan["action_method"] = self.execute_set_priority
                        action_plan["params"] = {
                            "issue_number": entities["issue_number"],
                            "priority": entities["priority"],
                            "workspace": workspace
                        }
                        
                elif intent == "SET_DUE_DATE":
                    if not entities.get("issue_number") or not entities.get("due_date"):
                        action_plan["valid"] = False
                        action_plan["validation_errors"].extend([
                            "Missing issue_number" if not entities.get("issue_number") else "",
                            "Missing due_date" if not entities.get("due_date") else ""
                        ])
                        action_plan["validation_errors"] = [e for e in action_plan["validation_errors"] if e]  # Remove empty strings
                    else:
                        action_plan["action_method"] = self.execute_set_due_date
                        action_plan["params"] = {
                            "issue_number": entities["issue_number"],
                            "due_date": entities["due_date"],
                            "workspace": workspace
                        }
                
                else:
                    # For other intents, we'll implement them as needed
                    action_plan["action_method"] = self.execute_fallback_action
                    action_plan["params"] = {
                        "intent": intent,
                        "entities": entities,
                        "workspace": workspace
                    }
            
            return action_plan
        
        except Exception as e:
            log_exception(e)
            return {
                "intent": intent,
                "entities": entities,
                "action_method": None,
                "params": {},
                "valid": False,
                "validation_errors": [str(e)],
                "multi_step": False,
                "steps": []
            }

    def execute_multi_step_operation(self, steps: list, workspace: Workspace) -> str:
        """
        Execute multiple operations in sequence
        """
        results = []
        
        for i, step in enumerate(steps):
            if not step["valid"]:
                results.append(f"Step {i+1} failed: {step['validation_errors']}")
                continue
                
            action_method = step["action_method"]
            params = step["params"]
            
            try:
                result = action_method(**params)
                results.append(f"Step {i+1}: {result}")
            except Exception as e:
                log_exception(e)
                results.append(f"Step {i+1} failed: {str(e)}")
        
        # Combine all results
        return "Multi-step operation results:\n" + "\n".join(results)

    def execute_create_project(self, project_name: str, description: str, workspace: Workspace) -> str:
        """
        Execute project creation based on extracted entities
        """
        try:
            # Validate project name
            if len(project_name.strip()) < 3:
                return "❌ Project name must be at least 3 characters long."
            
            # Create identifier from the project name
            identifier = project_name[:10].upper().replace(" ", "").replace("-", "").replace("_", "")[:12]
            
            # Check if project already exists
            if Project.objects.filter(workspace=workspace, name=project_name).exists():
                return f"❌ Project '{project_name}' already exists in this workspace."
            
            # Check if identifier already exists
            if Project.objects.filter(workspace=workspace, identifier=identifier).exists():
                return f"❌ A project with identifier '{identifier}' already exists in this workspace."
            
            # Create the project
            project = Project.objects.create(
                name=project_name,
                description=description or project_name,
                workspace=workspace,
                identifier=identifier,
                created_by=self.request.user
            )
            
            return f"✅ Successfully created project '{project.name}' with identifier '{project.identifier}'"
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to create project: {str(e)}"

    def execute_create_issue(self, title: str, project_name: str, description: str, workspace: Workspace) -> str:
        """
        Execute issue creation based on extracted entities
        """
        try:
            # Find the project
            project = None
            if project_name:
                project = Project.objects.filter(workspace=workspace, name=project_name).first()
                if not project:
                    # Try to find by identifier
                    project = Project.objects.filter(workspace=workspace, identifier=project_name.upper()).first()
            
            # If no project specified or found, use the first project in workspace
            if not project:
                project = workspace.workspace_project.first()
                if not project:
                    return "❌ No projects found in this workspace to create an issue."
            
            # Find a default state
            state = project.project_state.first() or State.objects.filter(project=project).first()
            if not state:
                # Create a default state if none exists
                state = State.objects.create(
                    name="Todo",
                    project=project,
                    workspace=workspace,
                    color="#60646C",
                    group="unstarted",
                    created_by=self.request.user
                )
            
            # Create the issue
            issue = Issue.objects.create(
                name=title,
                description_html=f"<p>{description or title}</p>",
                project=project,
                workspace=workspace,
                state=state,
                created_by=self.request.user
            )
            
            return f"✅ Successfully created issue #{issue.sequence_id}: '{issue.name}' in project '{project.name}'"
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to create issue: {str(e)}"

    def execute_list_issues(self, project_name: str, assigned_to: str, workspace: Workspace) -> str:
        """
        Execute issue listing based on extracted entities
        """
        try:
            # Determine which issues to list
            issues = Issue.objects.filter(workspace=workspace)
            
            if project_name:
                project = Project.objects.filter(workspace=workspace, name=project_name).first()
                if project:
                    issues = issues.filter(project=project)
                else:
                    # Try by identifier
                    project = Project.objects.filter(workspace=workspace, identifier=project_name.upper()).first()
                    if project:
                        issues = issues.filter(project=project)
            
            if assigned_to and assigned_to.lower() == "me":
                issues = issues.filter(issue_assignee__assignee=self.request.user)
            
            if not issues.exists():
                project_desc = f"in project '{project_name}'" if project_name else "in workspace"
                assigned_desc = " assigned to you" if assigned_to and assigned_to.lower() == "me" else ""
                return f"❌ No issues found {project_desc}{assigned_desc}."
            
            issue_list = []
            for issue in issues[:10]:  # Limit to first 10 issues
                issue_list.append(f"- #{issue.sequence_id}: {issue.name} (State: {issue.state.name if issue.state else 'N/A'})")
            
            if issues.count() > 10:
                issue_list.append(f"... and {issues.count() - 10} more issues")
            
            project_desc = f"in project '{project_name}'" if project_name else "in workspace"
            assigned_desc = " assigned to you" if assigned_to and assigned_to.lower() == "me" else ""
            
            return f"📋 Issues {project_desc}{assigned_desc}:\n" + "\n".join(issue_list)
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to list issues: {str(e)}"

    def execute_assign_issue(self, issue_number: str, assignee: str, workspace: Workspace) -> str:
        """
        Execute issue assignment based on extracted entities
        """
        try:
            from kardon.db.models import User, ProjectMember
            
            # Find the issue
            try:
                issue_number_int = int(issue_number)
                issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number_int).first()
            except ValueError:
                return f"❌ Invalid issue number: {issue_number}"
            
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Find the assignee
            assignee_obj = User.objects.filter(email__icontains=assignee).first()
            if not assignee_obj:
                assignee_obj = User.objects.filter(display_name__icontains=assignee).first()
            
            if not assignee_obj:
                return f"❌ User '{assignee}' not found in the system."
            
            # Check if the user is a member of the project
            if not ProjectMember.objects.filter(project=issue.project, member=assignee_obj).exists():
                return f"❌ User '{assignee}' is not a member of project '{issue.project.name}'."
            
            # Assign the issue
            from kardon.db.models import IssueAssignee
            issue_assignee, created = IssueAssignee.objects.get_or_create(
                issue=issue,
                assignee=assignee_obj,
                project=issue.project,
                workspace=issue.workspace,
                defaults={
                    'created_by': self.request.user,
                    'updated_by': self.request.user
                }
            )
            
            if created:
                return f"✅ Successfully assigned issue #{issue.sequence_id} '{issue.name}' to {assignee_obj.display_name or assignee_obj.email}."
            else:
                return f"⚠️ Issue #{issue.sequence_id} was already assigned to {assignee_obj.display_name or assignee_obj.email}."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to assign issue: {str(e)}"

    def execute_set_priority(self, issue_number: str, priority: str, workspace: Workspace) -> str:
        """
        Execute priority setting based on extracted entities
        """
        try:
            # Validate priority
            valid_priorities = ['urgent', 'high', 'medium', 'low', 'none']
            if priority.lower() not in valid_priorities:
                return f"❌ Invalid priority '{priority}'. Valid options: {', '.join(valid_priorities)}"
            
            # Find the issue
            try:
                issue_number_int = int(issue_number)
                issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number_int).first()
            except ValueError:
                return f"❌ Invalid issue number: {issue_number}"
            
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Update the priority
            issue.priority = priority.lower()
            issue.updated_by = self.request.user
            issue.save()
            
            return f"✅ Successfully set priority of issue #{issue.sequence_id} '{issue.name}' to '{priority.lower()}'."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to set priority: {str(e)}"

    def execute_set_due_date(self, issue_number: str, due_date: str, workspace: Workspace) -> str:
        """
        Execute due date setting based on extracted entities
        """
        try:
            from datetime import datetime
            
            # Validate date format
            try:
                parsed_date = datetime.strptime(due_date, '%Y-%m-%d').date()
            except ValueError:
                return f"❌ Invalid date format: {due_date}. Please use YYYY-MM-DD format."
            
            # Find the issue
            try:
                issue_number_int = int(issue_number)
                issue = Issue.objects.filter(workspace=workspace, sequence_id=issue_number_int).first()
            except ValueError:
                return f"❌ Invalid issue number: {issue_number}"
            
            if not issue:
                return f"❌ Issue #{issue_number} not found in this workspace."
            
            # Update the due date
            issue.target_date = parsed_date
            issue.updated_by = self.request.user
            issue.save()
            
            return f"✅ Successfully set due date of issue #{issue.sequence_id} '{issue.name}' to '{due_date}'."
        
        except Exception as e:
            log_exception(e)
            return f"❌ Failed to set due date: {str(e)}"

    def execute_fallback_action(self, intent: str, entities: dict, workspace: Workspace) -> str:
        """
        Fallback execution for unhandled intents
        """
        return f"ℹ️ Intent '{intent}' with entities {entities} is not yet implemented. Available commands: create/list/update/assign issues, projects, cycles, labels, states."

    def get_workspace_context(self, workspace: Workspace, conversation_history: list = None) -> Dict[str, Any]:
        """
        Get relevant context about the workspace for LLM
        """
        print(f"Getting workspace context for: {workspace.name}")
        projects = workspace.workspace_project.all()
        project_names = [p.name for p in projects]
        project_identifiers = [p.identifier for p in projects]
        
        # Get counts for other entities
        total_issues = Issue.objects.filter(workspace=workspace).count()
        total_cycles = Cycle.objects.filter(workspace=workspace).count()
        total_labels = workspace.workspace_label.count()
        total_states = State.objects.filter(project__workspace=workspace).count()
        
        # Get project details with more information
        project_details = []
        for project in projects:
            project_info = {
                "name": project.name,
                "identifier": project.identifier,
                "description": project.description[:100] + "..." if project.description and len(project.description) > 100 else project.description,
                "issue_count": Issue.objects.filter(project=project).count(),
                "cycle_count": Cycle.objects.filter(project=project).count(),
                "label_count": project.project_label.count() if hasattr(project, 'project_label') else 0,
            }
            project_details.append(project_info)
        
        # Get recent activity
        recent_issues = Issue.objects.filter(workspace=workspace).order_by('-created_at')[:5]
        recent_issue_list = []
        for issue in recent_issues:
            recent_issue_list.append({
                "id": issue.sequence_id,
                "name": issue.name[:50] + "..." if len(issue.name) > 50 else issue.name,
                "project": issue.project.name,
                "state": issue.state.name if issue.state else "N/A",
                "created_at": issue.created_at.strftime("%Y-%m-%d") if issue.created_at else "N/A"
            })
        
        context = {
            "workspace_name": workspace.name,
            "projects": project_names,
            "project_identifiers": project_identifiers,
            "total_projects": len(projects),
            "total_issues": total_issues,
            "total_cycles": total_cycles,
            "total_labels": total_labels,
            "total_states": total_states,
            "project_details": project_details,
            "recent_issues": recent_issue_list,
        }
        
        # Add conversation history if provided
        if conversation_history:
            context["conversation_history"] = conversation_history[-5:]  # Last 5 exchanges
        
        print(f"Workspace context: {context}")
        return context