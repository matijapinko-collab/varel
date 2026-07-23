// AUTO-GENERATED from prisma/electro-migrations/0001_electro_init.sql
// Bundled so the one-shot production migration endpoint can apply the FIXED
// electro_* schema at runtime (the prod DATABASE_URL is only reachable from
// inside the deployment). This is a constant — no SQL comes from any request.
export const ELECTRO_MIGRATION_SQL = `-- Varel Electric — production DDL (Phases A–G)
-- Generated from prisma/schema.prisma via \`prisma migrate diff --from-empty --to-schema\`.
-- Apply against the production database (which already has all non-electro tables).
-- Idempotent-ish: run once on a fresh deployment. All objects are electro_* / Electro*.
-- See docs/electro.md → Deployment.

-- CreateEnum
CREATE TYPE "ElectroSubscriptionStatus" AS ENUM ('PENDING_APPROVAL', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ElectroUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ElectroInvestorType" AS ENUM ('LEGAL_ENTITY', 'NATURAL_PERSON', 'PUBLIC_BODY', 'FUND', 'GROUP');

-- CreateEnum
CREATE TYPE "ElectroProjectStatus" AS ENUM ('DRAFT', 'OFFER', 'APPROVED', 'PREPARATION', 'ACTIVE', 'ON_HOLD', 'WAITING_FOR_INVESTOR', 'TECHNICAL_REVIEW', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ElectroProjectPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ElectroPhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'WAITING_FOR_REVIEW', 'CHANGES_REQUIRED', 'APPROVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ElectroLocationType" AS ENUM ('SUBPROJECT', 'BUILDING', 'ENTRANCE', 'ZONE', 'FLOOR', 'ROOM', 'TECHNICAL_UNIT');

-- CreateEnum
CREATE TYPE "ElectroDocCategory" AS ENUM ('CONTRACT', 'OFFER', 'INVOICE', 'TECHNICAL_DRAWING', 'SCHEME', 'SPECIFICATION', 'SITE_REPORT', 'CERTIFICATE', 'MEASUREMENT', 'HANDOVER', 'OTHER');

-- CreateEnum
CREATE TYPE "ElectroDocStatus" AS ENUM ('DRAFT', 'UPLOADED', 'UNDER_REVIEW', 'CHANGES_REQUIRED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ElectroVisibility" AS ENUM ('INTERNAL', 'PROJECT_TEAM', 'INVESTOR', 'PUBLIC_LINK');

-- CreateEnum
CREATE TYPE "ElectroTaskStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_MATERIAL', 'BLOCKED', 'WAITING_FOR_REVIEW', 'CHANGES_REQUIRED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ElectroTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ElectroDailyLogStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ElectroIssueType" AS ENUM ('TECHNICAL', 'SAFETY', 'MATERIAL_SHORTAGE', 'DRAWING_ERROR', 'EXECUTION_DEVIATION', 'DELAY', 'BLOCKER', 'INVESTOR_REQUEST', 'COMPLAINT', 'QUALITY_DEFECT', 'COMMERCIAL_RISK');

-- CreateEnum
CREATE TYPE "ElectroIssueStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_INFORMATION', 'WAITING_FOR_INVESTOR', 'WAITING_FOR_MATERIAL', 'RESOLVED', 'VERIFIED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ElectroWarehouseType" AS ENUM ('CENTRAL', 'REGIONAL', 'MOBILE', 'SITE', 'TEMPORARY', 'RETURNS', 'DEFECTIVE');

-- CreateEnum
CREATE TYPE "ElectroStockMovementType" AS ENUM ('OPENING_BALANCE', 'RECEIPT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ISSUE_TO_PROJECT', 'CONSUMPTION_CONFIRMED', 'RETURN_FROM_PROJECT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'WRITE_OFF', 'ERP_IMPORT');

-- CreateEnum
CREATE TYPE "ElectroConsumptionStatus" AS ENUM ('DRAFT', 'PENDING_CONFIRMATION', 'PARTIALLY_CONFIRMED', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ElectroCostCategory" AS ENUM ('MATERIAL', 'LABOR', 'SUBCONTRACTOR', 'EQUIPMENT_RENTAL', 'TRANSPORT', 'ADMINISTRATION', 'EXTRA_WORK', 'OTHER');

-- CreateTable
CREATE TABLE "electro_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "oib" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Hrvatska',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "internalNotes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_subscription_plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthlyEur" DECIMAL(10,2),
    "isEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "electro_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_plan_limits" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "intValue" INTEGER,
    "boolValue" BOOLEAN,

    CONSTRAINT "electro_plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_company_subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "ElectroSubscriptionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_company_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "passwordHash" TEXT,
    "status" "ElectroUserStatus" NOT NULL DEFAULT 'INVITED',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "electro_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "electro_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "electro_role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "electro_user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_invites" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "invitedBySuperadminId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_superadmins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_superadmins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "superadminId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_branches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_departments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_user_branches" (
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "electro_user_branches_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateTable
CREATE TABLE "electro_user_departments" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "electro_user_departments_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "electro_investors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ElectroInvestorType" NOT NULL DEFAULT 'LEGAL_ENTITY',
    "name" TEXT NOT NULL,
    "oib" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Hrvatska',
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_investor_contacts" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_investor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_projects" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ElectroProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "ElectroProjectPriority" NOT NULL DEFAULT 'NORMAL',
    "branchId" TEXT,
    "location" TEXT,
    "address" TEXT,
    "startDate" TIMESTAMP(3),
    "contractDeadline" TIMESTAMP(3),
    "estimatedDeadline" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "contractValue" DECIMAL(14,2),
    "plannedBudget" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "delayReason" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "electro_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_project_investors" (
    "projectId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_project_investors_pkey" PRIMARY KEY ("projectId","investorId")
);

-- CreateTable
CREATE TABLE "electro_project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectRole" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_project_locations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "ElectroLocationType" NOT NULL DEFAULT 'BUILDING',
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_project_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_project_phases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ElectroPhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "contractDeadline" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "responsibleUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_project_status_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatus" "ElectroProjectStatus",
    "toStatus" "ElectroProjectStatus" NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_project_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "phaseId" TEXT,
    "category" "ElectroDocCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ElectroDocStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ElectroVisibility" NOT NULL DEFAULT 'INTERNAL',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "changeNote" TEXT,
    "status" "ElectroDocStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_document_approvals" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "decision" "ElectroDocStatus" NOT NULL,
    "comment" TEXT,
    "decidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_document_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_photos" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "locationId" TEXT,
    "phaseId" TEXT,
    "category" TEXT,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "comment" TEXT,
    "visibility" "ElectroVisibility" NOT NULL DEFAULT 'INTERNAL',
    "takenByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_tasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ElectroTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ElectroTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assigneeUserId" TEXT,
    "createdByUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_task_checklist_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "electro_task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_daily_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "status" "ElectroDailyLogStatus" NOT NULL DEFAULT 'DRAFT',
    "workerCount" INTEGER,
    "weather" TEXT,
    "activities" TEXT,
    "notes" TEXT,
    "nextDayPlan" TEXT,
    "authorUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_daily_log_revisions" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_daily_log_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_issues" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "locationId" TEXT,
    "type" "ElectroIssueType" NOT NULL DEFAULT 'TECHNICAL',
    "status" "ElectroIssueStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ElectroTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "proposedSolution" TEXT,
    "actualSolution" TEXT,
    "assigneeUserId" TEXT,
    "reportedByUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_issue_comments" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_warehouses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ElectroWarehouseType" NOT NULL DEFAULT 'CENTRAL',
    "address" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "externalSku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kom',
    "barcode" TEXT,
    "purchasePrice" DECIMAL(12,4),
    "minStock" DECIMAL(14,3),
    "targetStock" DECIMAL(14,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_stock_movements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "ElectroStockMovementType" NOT NULL,
    "qtyDelta" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(12,4),
    "projectId" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_material_consumptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "phaseId" TEXT,
    "locationId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "confirmedQuantity" DECIMAL(14,3),
    "status" "ElectroConsumptionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "comment" TEXT,
    "reportedByUserId" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "movementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_project_budgets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialBudget" DECIMAL(14,2),
    "laborBudget" DECIMAL(14,2),
    "subcontractorBudget" DECIMAL(14,2),
    "otherBudget" DECIMAL(14,2),
    "reserve" DECIMAL(14,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electro_project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_project_costs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "ElectroCostCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_project_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electro_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "html" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electro_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "electro_subscription_plans_key_key" ON "electro_subscription_plans"("key");

-- CreateIndex
CREATE UNIQUE INDEX "electro_plan_limits_planId_key_key" ON "electro_plan_limits"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "electro_company_subscriptions_companyId_key" ON "electro_company_subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "electro_company_subscriptions_status_idx" ON "electro_company_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "electro_users_email_key" ON "electro_users"("email");

-- CreateIndex
CREATE INDEX "electro_users_companyId_idx" ON "electro_users"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_roles_key_key" ON "electro_roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "electro_permissions_key_key" ON "electro_permissions"("key");

-- CreateIndex
CREATE INDEX "electro_user_roles_companyId_idx" ON "electro_user_roles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_user_roles_userId_roleId_key" ON "electro_user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_invites_tokenHash_key" ON "electro_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "electro_invites_userId_idx" ON "electro_invites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_superadmins_username_key" ON "electro_superadmins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "electro_superadmins_email_key" ON "electro_superadmins"("email");

-- CreateIndex
CREATE INDEX "electro_audit_logs_companyId_createdAt_idx" ON "electro_audit_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "electro_branches_companyId_idx" ON "electro_branches"("companyId");

-- CreateIndex
CREATE INDEX "electro_departments_companyId_idx" ON "electro_departments"("companyId");

-- CreateIndex
CREATE INDEX "electro_investors_companyId_idx" ON "electro_investors"("companyId");

-- CreateIndex
CREATE INDEX "electro_investor_contacts_investorId_idx" ON "electro_investor_contacts"("investorId");

-- CreateIndex
CREATE INDEX "electro_projects_companyId_status_idx" ON "electro_projects"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "electro_projects_companyId_code_key" ON "electro_projects"("companyId", "code");

-- CreateIndex
CREATE INDEX "electro_project_members_userId_idx" ON "electro_project_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_project_members_projectId_userId_key" ON "electro_project_members"("projectId", "userId");

-- CreateIndex
CREATE INDEX "electro_project_locations_projectId_idx" ON "electro_project_locations"("projectId");

-- CreateIndex
CREATE INDEX "electro_project_phases_projectId_idx" ON "electro_project_phases"("projectId");

-- CreateIndex
CREATE INDEX "electro_project_status_history_projectId_idx" ON "electro_project_status_history"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_documents_currentVersionId_key" ON "electro_documents"("currentVersionId");

-- CreateIndex
CREATE INDEX "electro_documents_companyId_projectId_idx" ON "electro_documents"("companyId", "projectId");

-- CreateIndex
CREATE INDEX "electro_document_versions_documentId_idx" ON "electro_document_versions"("documentId");

-- CreateIndex
CREATE INDEX "electro_document_approvals_documentId_idx" ON "electro_document_approvals"("documentId");

-- CreateIndex
CREATE INDEX "electro_photos_companyId_projectId_idx" ON "electro_photos"("companyId", "projectId");

-- CreateIndex
CREATE INDEX "electro_tasks_companyId_projectId_idx" ON "electro_tasks"("companyId", "projectId");

-- CreateIndex
CREATE INDEX "electro_tasks_assigneeUserId_idx" ON "electro_tasks"("assigneeUserId");

-- CreateIndex
CREATE INDEX "electro_task_checklist_items_taskId_idx" ON "electro_task_checklist_items"("taskId");

-- CreateIndex
CREATE INDEX "electro_daily_logs_companyId_projectId_logDate_idx" ON "electro_daily_logs"("companyId", "projectId", "logDate");

-- CreateIndex
CREATE INDEX "electro_daily_log_revisions_dailyLogId_idx" ON "electro_daily_log_revisions"("dailyLogId");

-- CreateIndex
CREATE INDEX "electro_issues_companyId_projectId_status_idx" ON "electro_issues"("companyId", "projectId", "status");

-- CreateIndex
CREATE INDEX "electro_issue_comments_issueId_idx" ON "electro_issue_comments"("issueId");

-- CreateIndex
CREATE INDEX "electro_warehouses_companyId_idx" ON "electro_warehouses"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_warehouses_companyId_code_key" ON "electro_warehouses"("companyId", "code");

-- CreateIndex
CREATE INDEX "electro_items_companyId_idx" ON "electro_items"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_items_companyId_sku_key" ON "electro_items"("companyId", "sku");

-- CreateIndex
CREATE INDEX "electro_stock_movements_companyId_itemId_warehouseId_idx" ON "electro_stock_movements"("companyId", "itemId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "electro_material_consumptions_movementId_key" ON "electro_material_consumptions"("movementId");

-- CreateIndex
CREATE INDEX "electro_material_consumptions_companyId_projectId_status_idx" ON "electro_material_consumptions"("companyId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "electro_project_budgets_projectId_key" ON "electro_project_budgets"("projectId");

-- CreateIndex
CREATE INDEX "electro_project_costs_companyId_projectId_idx" ON "electro_project_costs"("companyId", "projectId");

-- CreateIndex
CREATE INDEX "electro_reports_companyId_projectId_idx" ON "electro_reports"("companyId", "projectId");

-- AddForeignKey
ALTER TABLE "electro_plan_limits" ADD CONSTRAINT "electro_plan_limits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "electro_subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_company_subscriptions" ADD CONSTRAINT "electro_company_subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_company_subscriptions" ADD CONSTRAINT "electro_company_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "electro_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_users" ADD CONSTRAINT "electro_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_role_permissions" ADD CONSTRAINT "electro_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "electro_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_role_permissions" ADD CONSTRAINT "electro_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "electro_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_roles" ADD CONSTRAINT "electro_user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "electro_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_roles" ADD CONSTRAINT "electro_user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "electro_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_roles" ADD CONSTRAINT "electro_user_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_invites" ADD CONSTRAINT "electro_invites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "electro_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_invites" ADD CONSTRAINT "electro_invites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_branches" ADD CONSTRAINT "electro_branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_departments" ADD CONSTRAINT "electro_departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_branches" ADD CONSTRAINT "electro_user_branches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "electro_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_branches" ADD CONSTRAINT "electro_user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "electro_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_departments" ADD CONSTRAINT "electro_user_departments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "electro_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_user_departments" ADD CONSTRAINT "electro_user_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "electro_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_investors" ADD CONSTRAINT "electro_investors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_investor_contacts" ADD CONSTRAINT "electro_investor_contacts_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "electro_investors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_projects" ADD CONSTRAINT "electro_projects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_projects" ADD CONSTRAINT "electro_projects_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "electro_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_investors" ADD CONSTRAINT "electro_project_investors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_investors" ADD CONSTRAINT "electro_project_investors_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "electro_investors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_members" ADD CONSTRAINT "electro_project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_members" ADD CONSTRAINT "electro_project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "electro_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_locations" ADD CONSTRAINT "electro_project_locations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_locations" ADD CONSTRAINT "electro_project_locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "electro_project_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_phases" ADD CONSTRAINT "electro_project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_status_history" ADD CONSTRAINT "electro_project_status_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_documents" ADD CONSTRAINT "electro_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_documents" ADD CONSTRAINT "electro_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_documents" ADD CONSTRAINT "electro_documents_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "electro_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_document_versions" ADD CONSTRAINT "electro_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "electro_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_document_approvals" ADD CONSTRAINT "electro_document_approvals_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "electro_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_photos" ADD CONSTRAINT "electro_photos_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_photos" ADD CONSTRAINT "electro_photos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_tasks" ADD CONSTRAINT "electro_tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_tasks" ADD CONSTRAINT "electro_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_task_checklist_items" ADD CONSTRAINT "electro_task_checklist_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "electro_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_daily_logs" ADD CONSTRAINT "electro_daily_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_daily_logs" ADD CONSTRAINT "electro_daily_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_daily_log_revisions" ADD CONSTRAINT "electro_daily_log_revisions_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "electro_daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_issues" ADD CONSTRAINT "electro_issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_issues" ADD CONSTRAINT "electro_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_issue_comments" ADD CONSTRAINT "electro_issue_comments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "electro_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_warehouses" ADD CONSTRAINT "electro_warehouses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_items" ADD CONSTRAINT "electro_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_stock_movements" ADD CONSTRAINT "electro_stock_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_stock_movements" ADD CONSTRAINT "electro_stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "electro_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_stock_movements" ADD CONSTRAINT "electro_stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "electro_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_material_consumptions" ADD CONSTRAINT "electro_material_consumptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_material_consumptions" ADD CONSTRAINT "electro_material_consumptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_material_consumptions" ADD CONSTRAINT "electro_material_consumptions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "electro_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_material_consumptions" ADD CONSTRAINT "electro_material_consumptions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "electro_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_budgets" ADD CONSTRAINT "electro_project_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_costs" ADD CONSTRAINT "electro_project_costs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_project_costs" ADD CONSTRAINT "electro_project_costs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_reports" ADD CONSTRAINT "electro_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "electro_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electro_reports" ADD CONSTRAINT "electro_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "electro_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`;
