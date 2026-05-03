{{- define "modeldock.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "modeldock.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "modeldock.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
app.kubernetes.io/name: {{ include "modeldock.name" . | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
{{- end -}}

{{- define "modeldock.selectorLabels" -}}
app.kubernetes.io/name: {{ include "modeldock.name" . | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}

{{- define "modeldock.secretName" -}}
{{- default (printf "%s-secrets" (include "modeldock.fullname" .)) .Values.secrets.existingSecret -}}
{{- end -}}

{{- define "modeldock.postgresName" -}}
{{- printf "%s-postgres" (include "modeldock.fullname" .) -}}
{{- end -}}

{{- define "modeldock.redisName" -}}
{{- printf "%s-redis" (include "modeldock.fullname" .) -}}
{{- end -}}

{{- define "modeldock.weaviateName" -}}
{{- printf "%s-weaviate" (include "modeldock.fullname" .) -}}
{{- end -}}

{{- define "modeldock.objectstoreName" -}}
{{- printf "%s-objectstore" (include "modeldock.fullname" .) -}}
{{- end -}}

{{- define "modeldock.databaseUrl" -}}
{{- if .Values.secrets.databaseUrl -}}
{{- .Values.secrets.databaseUrl -}}
{{- else if and .Values.allInOne.enabled .Values.allInOne.postgres.enabled -}}
{{- printf "postgresql://%s:%s@%s:%v/%s" .Values.allInOne.postgres.username .Values.secrets.postgresPassword (include "modeldock.postgresName" .) .Values.allInOne.postgres.port .Values.allInOne.postgres.database -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.litellmDatabaseUrl" -}}
{{- if .Values.secrets.litellmDatabaseUrl -}}
{{- .Values.secrets.litellmDatabaseUrl -}}
{{- else if and .Values.allInOne.enabled .Values.allInOne.postgres.enabled -}}
{{- printf "postgresql://%s:%s@%s:%v/%s" .Values.allInOne.postgres.username .Values.secrets.postgresPassword (include "modeldock.postgresName" .) .Values.allInOne.postgres.port .Values.allInOne.postgres.litellmDatabase -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.redisUrl" -}}
{{- if .Values.secrets.redisUrl -}}
{{- .Values.secrets.redisUrl -}}
{{- else if and .Values.allInOne.enabled .Values.allInOne.redis.enabled -}}
{{- printf "redis://:%s@%s:%v/0" .Values.secrets.redisPassword (include "modeldock.redisName" .) .Values.allInOne.redis.port -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.weaviateUrl" -}}
{{- if .Values.config.weaviateUrl -}}
{{- .Values.config.weaviateUrl -}}
{{- else if and .Values.allInOne.enabled .Values.allInOne.weaviate.enabled -}}
{{- printf "http://%s:%v" (include "modeldock.weaviateName" .) .Values.allInOne.weaviate.port -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.s3Endpoint" -}}
{{- if .Values.config.s3Endpoint -}}
{{- .Values.config.s3Endpoint -}}
{{- else if and .Values.allInOne.enabled .Values.allInOne.objectstore.enabled -}}
{{- printf "http://%s:%v" (include "modeldock.objectstoreName" .) .Values.allInOne.objectstore.port -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.storageClassBlock" -}}
{{- if .Values.global.storageClassName }}
  storageClassName: {{ .Values.global.storageClassName | quote }}
{{- end }}
{{- end -}}

{{- define "modeldock.requireProductionSecret" -}}
{{- $root := index . 0 -}}
{{- $name := index . 1 -}}
{{- $value := index . 2 -}}
{{- if and $root.Values.global.production (not $root.Values.secrets.existingSecret) (or (empty $value) (contains "replace-with-" $value)) -}}
{{- fail (printf "%s must be set to a non-placeholder value when global.production=true" $name) -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.requireProductionUrl" -}}
{{- $root := index . 0 -}}
{{- $name := index . 1 -}}
{{- $value := toString (index . 2) -}}
{{- if and $root.Values.global.production (or (empty $value) (contains "replace-with-" $value) (contains "example.com" $value) (contains "localhost" $value) (contains "127.0.0.1" $value) (contains "http://" $value)) -}}
{{- fail (printf "%s must be an explicit HTTPS production value when global.production=true" $name) -}}
{{- end -}}
{{- end -}}
