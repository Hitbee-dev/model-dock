export type WeaviateConfig = {
  url: string;
  apiKey: string;
  className: string;
  maxRetrievalLimit: number;
};

export type RagTenantScope = {
  tenantId: string;
  authenticatedUserId: string;
  workspaceId?: string;
};

export type RetrievalRequest = {
  query: string;
  requestedLimit: number;
};

export type RetrievalPlan = {
  className: string;
  where: {
    path: ["tenantId"];
    operator: "Equal";
    valueText: string;
  };
  nearText: {
    concepts: string[];
  };
  limit: number;
};

export function createTenantScope(input: {
  authenticatedUserId: string;
  documentOwnerId: string;
  workspaceId?: string;
}): RagTenantScope {
  if (!input.authenticatedUserId || input.authenticatedUserId !== input.documentOwnerId) {
    throw new Error("RAG tenant scope must be derived from the authenticated owner.");
  }

  return {
    tenantId: input.workspaceId ?? input.authenticatedUserId,
    authenticatedUserId: input.authenticatedUserId,
    workspaceId: input.workspaceId
  };
}

export function createRetrievalPlan(
  config: WeaviateConfig,
  scope: RagTenantScope,
  request: RetrievalRequest
): RetrievalPlan {
  if (!scope.tenantId) {
    throw new Error("RAG tenant scope is required.");
  }

  const limit = Math.min(Math.max(1, request.requestedLimit), config.maxRetrievalLimit);

  return {
    className: config.className,
    where: {
      path: ["tenantId"],
      operator: "Equal",
      valueText: scope.tenantId
    },
    nearText: {
      concepts: [request.query]
    },
    limit
  };
}
