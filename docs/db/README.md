# Database Documentation

This section contains documentation about the Kardon database schema and structure.

## Overview

Kardon uses PostgreSQL as its primary database for storing all application data. The database schema is designed to support the project management platform's features including workspaces, projects, issues, cycles, modules, and real-time collaboration.

## Database Schema

The database schema consists of multiple interconnected tables that represent the various entities in the system:

- **User Management**: Users, sessions, authentication tokens, and social connections
- **Workspace Management**: Workspaces, projects, and their relationships
- **Project Management**: Issues, states, labels, cycles, modules, and their relationships
- **Collaboration**: Comments, pages, notifications, and favorites
- **Integrations**: GitHub, Slack, and other third-party integrations
- **Analytics**: Views, estimates, and reporting data

## Entity Relationship Diagram

The complete entity relationship diagram is available in the [ER Model](ER_Model.md) document, which shows all entities and their relationships in detail.

## Database Technologies

- **Primary Database**: PostgreSQL 15.7
- **Caching**: Valkey/Redis 7.2
- **Message Queue**: RabbitMQ 3.13
- **File Storage**: MinIO (S3-compatible)

## Migration Strategy

Database migrations are handled through Django's migration system, ensuring schema changes are applied consistently across environments.

## Performance Considerations

- Proper indexing on foreign keys and frequently queried fields
- Use of UUIDs for primary keys to ensure global uniqueness
- Soft deletion pattern for recoverable data
- JSON fields for flexible data storage where appropriate