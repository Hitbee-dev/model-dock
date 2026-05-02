const requiredProductionSecrets = [
  "POSTGRES_PASSWORD",
  "REDIS_PASSWORD",
  "WEAVIATE_ROOT_API_KEY",
  "WEAVIATE_API_KEY",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "SESSION_SECRET",
  "CREDENTIAL_ENCRYPTION_KEY",
  "OWNER_BOOTSTRAP_TOKEN",
  "LITELLM_MASTER_KEY",
  "ADMIN_API_TOKEN"
];

const failures = requiredProductionSecrets.filter((key) => {
  const value = process.env[key];
  return !value || value.includes("replace-with-");
});

if (failures.length > 0) {
  console.error(`Production secrets are missing or still placeholders: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("ModelDock production secret preflight passed.");
