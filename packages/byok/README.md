# @modeldock/byok

Provider connection flows, user-owned API key validation, encrypted credential storage, deletion, and rotation.

Credential rotation keeps the existing credential reference stable while replacing the encrypted secret payload and encryption key id.
Deleted credentials cannot be rotated.
