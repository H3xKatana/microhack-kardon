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
            
            if selected_model == "orchestrator":
                print("Using orchestration logic")
                # Process with orchestration logic
                response = self.handle_orchestration(text_input, workspace)
            else:
                print("Using fallback LLM response")
                # Fallback to general response using existing LLM functionality
                api_key, model, provider = get_llm_config()
                if not api_key or not model or not provider:
                    print("LLM provider not configured")
                    return Response(
                        {"error": "LLM provider configuration is required"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                text, error = get_llm_response("ASK_ANYTHING", text_input, api_key, model, provider)
                if not text and error:
                    print(f"Error from LLM: {error}")
                    return Response(
                        {"error": "An internal error has occurred."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                response = text
            
            print(f"Final response: {response}")
            return Response({
                "response": response,
                "response_html": response.replace("\n", "<br/>"),
            }, status=status.HTTP_200_OK)
        
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
    
    def handle_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Main orchestration logic that determines which model operation to perform
        """
        print(f"handle_orchestration called with text: {text_input}")
        text_lower = text_input.lower()
        
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
                return "No projects found in this workspace to create an issue."
            
            # Find a default state
            state = project.project_state.first() or State.objects.filter(project=project).first()
            
            # Create issue title from the request
            title = text_input.split('.')[0][:100] if '.' in text_input else text_input[:100]
            if len(title) < 5:
                title = text_input[:100]
            
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
            return f"Failed to create issue: {str(e)}"
    
    def create_project_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create a project based on natural language input
        """
        try:
            print(f"Creating project with text: {text_input}")
            # Extract project name from request
            project_name = text_input.replace("create project", "").replace("new project", "").replace("start project", "").strip()
            if not project_name:
                project_name = "Untitled Project"
            
            print(f"Extracted project name: {project_name}")
            
            # Create identifier
            identifier = project_name[:10].upper().replace(" ", "")[:12]
            print(f"Generated identifier: {identifier}")
            
            # Check if project already exists
            if Project.objects.filter(workspace=workspace, name=project_name).exists():
                print(f"Project already exists: {project_name}")
                return f"Project '{project_name}' already exists in this workspace."
            
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
            return f"Failed to create project: {str(e)}"
    
    def create_cycle_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Create a cycle based on natural language input
        """
        try:
            # Find a project (first one in workspace as default)
            project = workspace.workspace_project.first()
            if not project:
                return "No projects found in this workspace to create a cycle."
            
            # Extract cycle name from request
            cycle_name = text_input.replace("create cycle", "").replace("new cycle", "").replace("start cycle", "").replace("create sprint", "").strip()
            if not cycle_name:
                cycle_name = "New Cycle"
            
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
            return f"Failed to create cycle: {str(e)}"
    
    def fallback_orchestration(self, text_input: str, workspace: Workspace) -> str:
        """
        Use LLM to determine intent when keywords don't match known actions
        """
        try:
            print("fallback_orchestration called")
            # Get LLM config
            api_key, model, provider = get_llm_config()
            print(f"LLM Config - API Key exists: {bool(api_key)}, Model: {model}, Provider: {provider}")
            
            if not api_key or not model or not provider:
                print("LLM configuration is missing or invalid")
                # Fallback to general response if LLM not configured
                return f"I received your request: '{text_input}'. I can help create issues, projects, and cycles based on your request."

            print("LLM configuration is valid, proceeding with LLM call")
            # Get workspace context for better understanding
            context = self.get_workspace_context(workspace)

            # Create a prompt that guides the LLM to return structured output
            prompt = f"""
            Analyze this user request and return an appropriate response:
            User request: "{text_input}"

            Workspace context: {context}

            If the request is asking to create or modify issues, projects, or cycles,
            perform the appropriate action. Otherwise, provide a helpful response.

            Respond in a clear, helpful way.
            """
            
            text, error = get_llm_response("ASK_ANYTHING", prompt, api_key, model, provider)
            print(f"LLM response - Success: {bool(text)}, Error: {error}")
            
            if not text and error:
                print(f"Error from LLM: {error}")
                return f"I received your request: '{text_input}'. I can help create issues, projects, and cycles based on your request."

            print(f"Returning LLM response: {text}")
            return text

        except Exception as e:
            print(f"Exception in fallback_orchestration: {str(e)}")
            log_exception(e)
            return f"I received your request: '{text_input}'. I can help create issues, projects, and cycles based on your request."
    
    def get_workspace_context(self, workspace: Workspace) -> Dict[str, Any]:
        """
        Get relevant context about the workspace for LLM
        """
        print(f"Getting workspace context for: {workspace.name}")
        projects = workspace.workspace_project.all()
        project_names = [p.name for p in projects]
        project_identifiers = [p.identifier for p in projects]
        
        context = {
            "workspace_name": workspace.name,
            "projects": project_names,
            "project_identifiers": project_identifiers,
            "total_projects": len(projects),
        }
        
        print(f"Workspace context: {context}")
        return context